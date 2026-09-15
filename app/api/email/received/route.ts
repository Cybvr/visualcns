import { NextResponse } from "next/server"

type FirebaseLookupResponse = {
  users?: Array<{ localId?: string }>
}

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

async function hasValidFirebaseSession(idToken: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) return false

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      },
    )

    if (!response.ok) return false
    const data = (await response.json()) as FirebaseLookupResponse
    return Boolean(data.users?.[0]?.localId)
  } catch {
    return false
  }
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

async function resendRequest(path: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { response: null, result: null as ResendListResponse | ReceivedEmail | null }

  const response = await fetch(`https://api.resend.com${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "VisualCNS Dashboard/1.0",
    },
    cache: "no-store",
  })
  const result = await response.json().catch(() => ({})) as ResendListResponse | ReceivedEmail
  return { response, result }
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization")
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""

  if (!idToken || !(await hasValidFirebaseSession(idToken))) {
    return NextResponse.json({ error: "Your session has expired. Sign in again and retry." }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Inbound email is not configured." }, { status: 503 })
  }

  const emailId = new URL(request.url).searchParams.get("id")?.trim()
  const path = emailId
    ? `/emails/receiving/${encodeURIComponent(emailId)}`
    : "/emails/receiving"
  const { response, result } = await resendRequest(path)

  if (!response?.ok) {
    const error = result && "error" in result ? result.error?.message : result && "message" in result ? result.message : undefined
    return NextResponse.json(
      { error: error || "Received messages could not be loaded from Resend." },
      { status: response?.status && response.status >= 400 ? response.status : 502 },
    )
  }

  if (emailId) {
    const email = result as ReceivedEmail
    if (!email.id) return NextResponse.json({ error: "The received email could not be loaded." }, { status: 502 })
    return NextResponse.json(receivedEmailPayload(email))
  }

  const list = result as ResendListResponse
  return NextResponse.json({
    data: (list.data || []).filter((email) => email.id).map(receivedEmailPayload),
    hasMore: Boolean(list.has_more),
  })
}
