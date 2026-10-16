import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { recordAdoptionEvent, type AgentEventType } from "@/lib/agent/telemetry"
import { requireAgencyId } from "@/lib/require-agency-id"

export const runtime = "nodejs"

const CLIENT_EVENT_TYPES = new Set<AgentEventType>(["agent_opened", "message_sent", "record_opened", "human_handoff"])

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(token)
    const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
    const body = await request.json().catch(() => ({})) as { type?: string; surface?: string; runId?: string; metadata?: Record<string, unknown> }
    const type = body.type as AgentEventType
    if (!CLIENT_EVENT_TYPES.has(type)) return NextResponse.json({ error: "Unsupported event." }, { status: 400 })
    await recordAdoptionEvent({
      agencyId: requireAgencyId(user),
      userId: decoded.uid,
      type,
      surface: typeof body.surface === "string" ? body.surface.slice(0, 40) : undefined,
      runId: typeof body.runId === "string" ? body.runId.slice(0, 100) : undefined,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Event could not be recorded." }, { status: 403 })
  }
}
