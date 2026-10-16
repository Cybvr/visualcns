import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { requireAgencyId } from "@/lib/require-agency-id"

export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(token)
    const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
    if (user.role !== "admin" && user.role !== "superadmin") return NextResponse.json({ error: "Admin access required." }, { status: 403 })
    const agencyId = requireAgencyId(user)
    const id = (await params).id
    const run = await db.collection("agentRuns").doc(id).get()
    if (!run.exists || run.data()?.agencyId !== agencyId) return NextResponse.json({ error: "Run not found." }, { status: 404 })
    const events = await run.ref.collection("events").limit(200).get()
    return NextResponse.json({ id, ...run.data(), events: events.docs.map((event) => ({ id: event.id, ...event.data() })) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Run lookup failed." }, { status: 403 })
  }
}
