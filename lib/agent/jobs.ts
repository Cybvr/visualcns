import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"

export type AgentJobStatus = "queued" | "running" | "waiting" | "succeeded" | "failed" | "cancelled"

export type AgentJob = {
  id: string
  agencyId: string
  userId: string
  messages: unknown[]
  surface: "agency_dashboard" | "client_portal"
  companyContext?: { id: string; name: string }
  status: AgentJobStatus
  attempts: number
  maxAttempts: number
  nextRunAt?: FirebaseFirestore.Timestamp
  leaseUntil?: FirebaseFirestore.Timestamp
  runId?: string
  checkpoint?: string
  result?: string
  lastError?: string
}

export async function createAgentJob(input: Omit<AgentJob, "id" | "status" | "attempts" | "maxAttempts"> & { maxAttempts?: number }) {
  const { db } = adminServices()
  const ref = db.collection("agentJobs").doc()
  await ref.set({
    ...input,
    status: "queued" satisfies AgentJobStatus,
    attempts: 0,
    maxAttempts: Math.min(Math.max(input.maxAttempts || 3, 1), 8),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  return ref.id
}

export async function getAgentJob(id: string) {
  const { db } = adminServices()
  const snapshot = await db.collection("agentJobs").doc(id).get()
  return snapshot.exists ? ({ id: snapshot.id, ...snapshot.data() } as AgentJob) : null
}

export async function claimAgentJob(id: string, leaseMs = 55_000) {
  const { db } = adminServices()
  const ref = db.collection("agentJobs").doc(id)
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists) return null
    const data = snapshot.data() as AgentJob
    if (data.status !== "queued" && !(data.status === "running" && data.leaseUntil && data.leaseUntil.toMillis() < Date.now())) return null
    const attempts = Number(data.attempts || 0) + 1
    if (attempts > Number(data.maxAttempts || 3)) {
      transaction.set(ref, { status: "failed", lastError: "Retry limit reached.", updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      return null
    }
    transaction.set(ref, { status: "running", attempts, leaseUntil: new Date(Date.now() + leaseMs), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    const { id: _id, ...rest } = data
    return { id: snapshot.id, ...rest, status: "running", attempts } as AgentJob
  })
}

export async function updateAgentJob(id: string, patch: Partial<AgentJob> & { status: AgentJobStatus }) {
  const { db } = adminServices()
  await db.collection("agentJobs").doc(id).set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}
