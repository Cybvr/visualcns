import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { getAgentJob } from "@/lib/agent/jobs"
import { requireAgencyId } from "@/lib/require-agency-id"

export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(token)
    const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
    const job = await getAgentJob((await params).id)
    if (!job || job.agencyId !== requireAgencyId(user) || (user.role !== "admin" && user.role !== "superadmin" && job.userId !== decoded.uid)) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    return NextResponse.json({ ...job, messages: undefined })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Job lookup failed." }, { status: 403 })
  }
}
