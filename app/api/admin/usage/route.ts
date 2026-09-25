import { requireAgencyId } from "@/lib/require-agency-id"
import { NextRequest, NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) throw new Error("Missing authorization")
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(token)
    const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
    if (user.role !== "admin" && user.role !== "superadmin") throw new Error("Admin access required")
    const agencyId = requireAgencyId(user)
    const usage = (await db.collection("agencyUsage").doc(agencyId).get()).data() || {}
    return NextResponse.json({ agencyId, usage })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Usage lookup failed" }, { status: 403 }) }
}
