import { requireAgencyId } from "@/lib/require-agency-id"
import { NextRequest, NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"
import { getAgencySecret, setAgencySecret } from "@/lib/server/agency-secrets"

export const runtime = "nodejs"
const ALLOWED = ["OPENAI_API_KEY", "RESEND_API_KEY", "EMAIL_FROM", "EMAIL_REPLY_TO"] as const

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Missing authorization")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token)
  const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
  if (user.role !== "admin" && user.role !== "superadmin") throw new Error("Admin access required")
  return { agencyId: requireAgencyId(user), superadmin: user.role === "superadmin" }
}

export async function GET(request: NextRequest) {
  try {
    const { agencyId } = await authorize(request)
    const values = await Promise.all(ALLOWED.map(async (name) => [name, Boolean(await getAgencySecret(agencyId, name, name === "OPENAI_API_KEY" ? process.env.OPENAI_API_KEY : name === "RESEND_API_KEY" ? process.env.RESEND_API_KEY : name === "EMAIL_FROM" ? process.env.EMAIL_FROM : process.env.EMAIL_REPLY_TO))] as const))
    return NextResponse.json({ secrets: Object.fromEntries(values) })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 403 }) }
}

export async function PUT(request: NextRequest) {
  try {
    const { agencyId } = await authorize(request)
    const body = await request.json() as Record<string, unknown>
    for (const name of ALLOWED) if (typeof body[name] === "string") await setAgencySecret(agencyId, name, body[name] as string)
    return NextResponse.json({ ok: true })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save secrets" }, { status: 403 }) }
}
