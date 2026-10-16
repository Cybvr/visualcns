import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"

export type AgentMemoryScope = "agency" | "company" | "project" | "user"
export type AgentMemoryStatus = "proposed" | "approved" | "archived"

export async function proposeAgentMemory(input: {
  agencyId: string
  scope: AgentMemoryScope
  scopeId?: string
  kind: "fact" | "preference" | "workflow"
  content: string
  source?: string
  sourceRecordId?: string
  createdBy: string
}) {
  const { db } = adminServices()
  const ref = db.collection("agentMemories").doc()
  await ref.set({
    ...input,
    content: input.content.trim().slice(0, 4000),
    status: "proposed" satisfies AgentMemoryStatus,
    version: 1,
    confidence: 0.7,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  return ref.id
}

export async function getApprovedAgentMemories(agencyId: string, scope: AgentMemoryScope, scopeId = "") {
  const { db } = adminServices()
  const snapshot = await db.collection("agentMemories").where("agencyId", "==", agencyId).limit(300).get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
    .filter((memory) => memory.status === "approved")
    .filter((memory) => memory.scope === "agency" || (memory.scope === scope && (!scopeId || memory.scopeId === scopeId)))
}

export async function listAgentMemories(agencyId: string, status = "") {
  const { db } = adminServices()
  const snapshot = await db.collection("agentMemories").where("agencyId", "==", agencyId).limit(300).get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
    .filter((memory) => !status || memory.status === status)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
}

export async function updateAgentMemory(id: string, agencyId: string, patch: { status?: AgentMemoryStatus; content?: string; confidence?: number }) {
  const { db } = adminServices()
  const ref = db.collection("agentMemories").doc(id)
  const snapshot = await ref.get()
  if (!snapshot.exists || snapshot.data()?.agencyId !== agencyId) throw new Error("Memory not found.")
  await ref.set({
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.content ? { content: patch.content.trim().slice(0, 4000), version: Number(snapshot.data()?.version || 1) + 1 } : {}),
    ...(typeof patch.confidence === "number" ? { confidence: Math.min(Math.max(patch.confidence, 0), 1) } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}
