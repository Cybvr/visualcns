import { NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"
import { getGmailMessage, hasGmailConnection, listGmailInbox } from "@/lib/server/google-gmail"

type ReceivedEmail = {
  id?: string
  from?: string
  to?: string[]
  cc?: string[]
  bcc?: string[]
  subject?: string
  created_at?: string
  message_id?: string
  html?: string | null
  text?: string | null
  headers?: Record<string, string> | null
  attachments?: Array<Record<string, unknown>>
}

type ResendListResponse = {
  data?: ReceivedEmail[]
  has_more?: boolean
  message?: string
  error?: { message?: string }
}

function receivedEmailPayload(email: ReceivedEmail) {
  return {
    id: email.id || "",
    from: email.from || "",
    to: email.to || [],
    cc: email.cc || [],
    bcc: email.bcc || [],
    subject: email.subject || "(No subject)",
    createdAt: email.created_at || null,
    messageId: email.message_id || null,
    html: email.html || null,
    text: email.text || null,
    headers: email.headers || null,
    attachments: email.attachments || [],
  }
}

function localInboxPayload(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id: `local:${id}`,
    from: String(data.from || ""),
    to: Array.isArray(data.to) ? data.to : [],
    cc: [],
    bcc: [],
    subject: String(data.subject || "(No subject)"),
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    messageId: null,
    html: null,
    text: String(data.text || ""),
    headers: null,
    attachments: [],
  }
}

async function resendRequest(path: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { response: null, result: null as ResendListResponse | ReceivedEmail | null }

  try {
    const response = await fetch(`https://api.resend.com${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "VisualCNS Dashboard/1.0",
      },
      cache: "no-store",
    })
    const result = await response.json().catch(() => ({})) as ResendListResponse | ReceivedEmail
    return { response, result }
  } catch {
    return { response: null, result: null as ResendListResponse | ReceivedEmail | null }
  }
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization")
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""
  if (!idToken) return NextResponse.json({ error: "Your session has expired. Sign in again and retry." }, { status: 401 })
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(idToken).catch(() => null)
  if (!decoded) {
    return NextResponse.json({ error: "Your session has expired. Sign in again and retry." }, { status: 401 })
  }
  const account = (await db.collection("users").doc(decoded.uid).get()).data()
  const agencyId = typeof account?.agencyId === "string" ? account.agencyId.trim() : ""
  if (!agencyId || (account?.role !== "admin" && account?.role !== "superadmin")) {
    return NextResponse.json({ error: "You don't have access to this inbox." }, { status: 403 })
  }
  const inboxEvents = db.collection("agencies").doc(agencyId).collection("emailInboxEvents")
  const gmailConnected = await hasGmailConnection(agencyId)

  const emailId = new URL(request.url).searchParams.get("id")?.trim()
  if (emailId?.startsWith("local:")) {
    const localId = emailId.slice(6)
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(localId)) return NextResponse.json({ error: "Message not found." }, { status: 404 })
    const event = await inboxEvents.doc(localId).get()
    if (!event.exists || event.data()?.agencyId !== agencyId) return NextResponse.json({ error: "Message not found." }, { status: 404 })
    return NextResponse.json(localInboxPayload(event.id, event.data() || {}))
  }

  if (emailId?.startsWith("gmail:")) {
    if (!gmailConnected) return NextResponse.json({ error: "Google mailbox is not connected." }, { status: 503 })
    try {
      const email = await getGmailMessage(agencyId, emailId.slice(6))
      return email ? NextResponse.json(email) : NextResponse.json({ error: "Message not found." }, { status: 404 })
    } catch {
      return NextResponse.json({ error: "The Google message could not be loaded." }, { status: 502 })
    }
  }

  if (!emailId) {
    const events = await inboxEvents.orderBy("createdAt", "desc").limit(100).get()
    const localMessages = events.docs.map((event) => localInboxPayload(event.id, event.data()))
    if (gmailConnected) {
      try {
        const gmail = await listGmailInbox(agencyId)
        const data = [...gmail.data, ...localMessages].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        return NextResponse.json({ data, hasMore: gmail.hasMore })
      } catch {
        if (!localMessages.length) return NextResponse.json({ error: "Received messages could not be loaded from Google." }, { status: 502 })
        return NextResponse.json({ data: localMessages, hasMore: false, warning: "Google inbox could not be loaded." })
      }
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ data: localMessages, hasMore: false, warning: "Inbound email is not configured; visitor sign-ups still appear here." })
    }
    const { response, result } = await resendRequest("/emails/receiving")
    if (!response?.ok) {
      const error = result && "error" in result ? result.error?.message : result && "message" in result ? result.message : undefined
      if (!localMessages.length) return NextResponse.json({ error: error || "Received messages could not be loaded from Resend." }, { status: response?.status && response.status >= 400 ? response.status : 502 })
      return NextResponse.json({ data: localMessages, hasMore: false, warning: error || "Received messages could not be loaded from Resend." })
    }
    const list = result as ResendListResponse
    const data = [...(list.data || []).filter((email) => email.id).map(receivedEmailPayload), ...localMessages]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    return NextResponse.json({ data, hasMore: Boolean(list.has_more) })
  }

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Inbound email is not configured." }, { status: 503 })
  const { response, result } = await resendRequest(`/emails/receiving/${encodeURIComponent(emailId)}`)

  if (!response?.ok) {
    const error = result && "error" in result ? result.error?.message : result && "message" in result ? result.message : undefined
    return NextResponse.json(
      { error: error || "Received messages could not be loaded from Resend." },
      { status: response?.status && response.status >= 400 ? response.status : 502 },
    )
  }

  const email = result as ReceivedEmail
  if (!email.id) return NextResponse.json({ error: "The received email could not be loaded." }, { status: 502 })
  return NextResponse.json(receivedEmailPayload(email))
}
