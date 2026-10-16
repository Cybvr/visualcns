import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { listAgentMemories, proposeAgentMemory, updateAgentMemory, type AgentMemoryStatus } from "@/lib/agent/memory"
import { requireAgencyId } from "@/lib/require-agency-id"

export const runtime = "nodejs"

async function adminContext(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Sign in required.")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token)
  const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
  if (user.role !== "admin" && user.role !== "superadmin") throw new Error("Admin access required.")
  return { uid: decoded.uid, agencyId: requireAgencyId(user) }
}

export async function GET(request: Request) {
  try {
    const context = await adminContext(request)
    const status = new URL(request.url).searchParams.get("status") || ""
    return NextResponse.json({ memories: await listAgentMemories(context.agencyId, status) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Memory lookup failed." }, { status: 403 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await adminContext(request)
    const body = await request.json().catch(() => ({})) as { scope?: "agency" | "company" | "project" | "user"; scopeId?: string; kind?: "fact" | "preference" | "workflow"; content?: string; source?: string; sourceRecordId?: string }
    if (!body.content?.trim()) return NextResponse.json({ error: "Memory content is required." }, { status: 400 })
    const id = await proposeAgentMemory({ agencyId: context.agencyId, createdBy: context.uid, scope: body.scope || "agency", scopeId: body.scopeId, kind: body.kind || "fact", content: body.content, source: body.source || "Admin", sourceRecordId: body.sourceRecordId })
    return NextResponse.json({ id, status: "proposed" }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Memory could not be created." }, { status: 403 })
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await adminContext(request)
    const body = await request.json().catch(() => ({})) as { id?: string; status?: AgentMemoryStatus; content?: string; confidence?: number }
    if (!body.id || (body.status && !["proposed", "approved", "archived"].includes(body.status))) return NextResponse.json({ error: "A valid memory id and status are required." }, { status: 400 })
    await updateAgentMemory(body.id, context.agencyId, { status: body.status, content: body.content, confidence: body.confidence })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Memory could not be updated." }, { status: 403 })
  }
}
