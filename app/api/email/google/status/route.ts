import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { getAgencySecret } from "@/lib/server/agency-secrets"
import { gmailSenders, hasGmailConnection } from "@/lib/server/google-gmail"
import { hasGoogleCalendarConnection } from "@/lib/server/google-calendar"

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization")
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""
  if (!idToken) return NextResponse.json({ error: "Your session has expired. Sign in again and retry." }, { status: 401 })
  try {
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(idToken)
    const account = (await db.collection("users").doc(decoded.uid).get()).data() || {}
    const agencyId = typeof account.agencyId === "string" ? account.agencyId.trim() : ""
    if (!agencyId) return NextResponse.json({ error: "Your account has no agency assigned." }, { status: 403 })
    const configured = await hasGmailConnection(agencyId)
    const calendarConfigured = configured && await hasGoogleCalendarConnection(agencyId)
    if (!configured) return NextResponse.json({ configured: false, calendarConfigured: false, email: null, senders: [] })
    const email = await getAgencySecret(agencyId, "GMAIL_CONNECTED_EMAIL", "")
    let senders: Awaited<ReturnType<typeof gmailSenders>> = []
    try { senders = await gmailSenders(agencyId) } catch { /* The connected mailbox can still send using its primary address. */ }
    return NextResponse.json({ configured: true, calendarConfigured, email: email || null, senders })
  } catch {
    return NextResponse.json({ configured: false, calendarConfigured: false, email: null, senders: [], warning: "Google connection status could not be loaded." })
  }
}
