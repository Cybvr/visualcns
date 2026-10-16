import { randomUUID } from "node:crypto"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { AGENT_PROMPT_VERSION, AGENT_TOOLSET_VERSION } from "@/lib/agent/registry"

export type AgentRunStatus = "running" | "succeeded" | "failed" | "cancelled"
export type AgentOutcome = "answered" | "drafted" | "changed_record" | "created_record" | "asked_for_details" | "planned" | "failed" | "cancelled"

export type AgentRunInput = {
  agencyId: string
  userId: string
  conversationId?: string
  surface: "agency_dashboard" | "client_portal"
  model: string
  jobId?: string
}

export type AgentRun = AgentRunInput & {
  id: string
  status: AgentRunStatus
  promptVersion: string
  toolsetVersion: string
  startedAt: FirebaseFirestore.Timestamp | ReturnType<typeof FieldValue.serverTimestamp>
}

export type AgentEventType =
  | "run_started"
  | "run_completed"
  | "run_failed"
  | "model_call"
  | "tool_started"
  | "tool_succeeded"
  | "tool_failed"
  | "message_sent"
  | "agent_opened"
  | "record_opened"
  | "human_handoff"

function clean(value: unknown, max = 400): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.replace(/[\r\n]+/g, " ").trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

export async function startAgentRun(input: AgentRunInput): Promise<string> {
  const { db } = adminServices()
  const id = randomUUID()
  await db.collection("agentRuns").doc(id).set({
    ...input,
    id,
    status: "running",
    promptVersion: AGENT_PROMPT_VERSION,
    toolsetVersion: AGENT_TOOLSET_VERSION,
    startedAt: FieldValue.serverTimestamp(),
  })
  await appendAgentEvent(id, "run_started", { surface: input.surface, jobId: input.jobId })
  return id
}

export async function appendAgentEvent(runId: string, type: AgentEventType, data: Record<string, unknown> = {}) {
  const { db } = adminServices()
  const safeData = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === "string" ? clean(value) : value]))
  await db.collection("agentRuns").doc(runId).collection("events").add({ type, ...safeData, createdAt: FieldValue.serverTimestamp() })
}

export async function recordAgentModelCall(runId: string, data: { durationMs: number; responseId?: string; inputTokens?: number; outputTokens?: number; totalTokens?: number }) {
  const { db } = adminServices()
  const inputTokens = Number.isFinite(data.inputTokens) ? Number(data.inputTokens) : 0
  const outputTokens = Number.isFinite(data.outputTokens) ? Number(data.outputTokens) : 0
  const totalTokens = Number.isFinite(data.totalTokens) ? Number(data.totalTokens) : inputTokens + outputTokens
  const inputRate = Number(process.env.OPENAI_INPUT_COST_PER_1M_USD || 0)
  const outputRate = Number(process.env.OPENAI_OUTPUT_COST_PER_1M_USD || 0)
  const estimatedCostUsd = inputRate || outputRate ? (inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate : null
  await appendAgentEvent(runId, "model_call", { durationMs: data.durationMs, responseId: data.responseId, inputTokens, outputTokens, totalTokens, estimatedCostUsd })
  await db.collection("agentRuns").doc(runId).set({
    modelCalls: FieldValue.increment(1),
    inputTokens: FieldValue.increment(inputTokens),
    outputTokens: FieldValue.increment(outputTokens),
    totalTokens: FieldValue.increment(totalTokens),
    estimatedCostUsd: estimatedCostUsd === null ? null : FieldValue.increment(estimatedCostUsd),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}

export async function recordAgentToolEvent(runId: string, data: { toolName: string; durationMs: number; ok: boolean; error?: string; skill?: string }) {
  await appendAgentEvent(runId, data.ok ? "tool_succeeded" : "tool_failed", data)
  const { db } = adminServices()
  await db.collection("agentRuns").doc(runId).set({
    toolCalls: FieldValue.increment(1),
    toolFailures: data.ok ? FieldValue.increment(0) : FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}

export function inferAgentOutcome(text: string, hasForm: boolean, hasPlan: boolean): AgentOutcome {
  if (hasForm) return "asked_for_details"
  if (hasPlan) return "planned"
  const lower = text.toLowerCase()
  if (lower.includes("draft") || lower.includes("composer")) return "drafted"
  if (lower.includes("created") || lower.includes("added")) return "created_record"
  if (lower.includes("updated") || lower.includes("saved") || lower.includes("completed")) return "changed_record"
  return "answered"
}

export function finishAgentRun(runId: string, data: { status: AgentRunStatus; outcome: AgentOutcome; error?: string }) {
  const { db } = adminServices()
  void appendAgentEvent(runId, data.status === "succeeded" ? "run_completed" : "run_failed", data)
  return db.collection("agentRuns").doc(runId).set({ ...data, completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}

export async function recordAdoptionEvent(input: { agencyId: string; userId: string; type: AgentEventType; surface?: string; runId?: string; metadata?: Record<string, unknown> }) {
  const { db } = adminServices()
  await db.collection("agentAdoptionEvents").add({
    agencyId: input.agencyId,
    userId: input.userId,
    type: input.type,
    surface: input.surface || null,
    runId: input.runId || null,
    metadata: input.metadata || {},
    createdAt: FieldValue.serverTimestamp(),
  })
}
