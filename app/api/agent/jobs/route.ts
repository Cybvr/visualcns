import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { createAgentJob } from "@/lib/agent/jobs"
import { requireAgencyId } from "@/lib/require-agency-id"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(token)
    const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
    if (user.role !== "admin" && user.role !== "superadmin") return NextResponse.json({ error: "Admin access required." }, { status: 403 })
    const body = await request.json().catch(() => ({})) as { messages?: unknown[]; surface?: "agency_dashboard" | "client_portal"; companyContext?: { id?: string; name?: string }; maxAttempts?: number }
    if (!Array.isArray(body.messages) || body.messages.length === 0) return NextResponse.json({ error: "At least one message is required." }, { status: 400 })
    const jobId = await createAgentJob({
      agencyId: requireAgencyId(user),
      userId: decoded.uid,
      messages: body.messages.slice(-100),
      surface: body.surface === "client_portal" ? "client_portal" : "agency_dashboard",
      ...(body.companyContext?.id ? { companyContext: { id: body.companyContext.id.slice(0, 200), name: String(body.companyContext.name || "").slice(0, 200) } } : {}),
      maxAttempts: body.maxAttempts,
    })
    return NextResponse.json({ id: jobId, status: "queued" }, { status: 202 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Job could not be created." }, { status: 403 })
  }
}
