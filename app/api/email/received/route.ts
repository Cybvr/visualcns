import { NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"
import { cidReferences, inlineCidImages, normalizeCid } from "@/lib/server/inline-email-images"
import { changeGmailMessage, getGmailAttachment, getGmailMessage, hasStoredGmailConnection, listGmailInbox } from "@/lib/server/google-gmail"

type ReceivedEmail = {
  id?: string
  thread_id?: string | null
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

function resendAttachments(attachments: ReceivedEmail["attachments"] = []) {
  return attachments
    .filter((file) => typeof file.id === "string" && !(file.content_disposition === "inline" && file.content_id))
    .map((file) => ({
      id: String(file.id),
      filename: String(file.filename || "attachment"),
      contentType: String(file.content_type || "application/octet-stream"),
      size: Number(file.size) || 0,
    }))
}

function attachmentResponse(body: ArrayBuffer | Uint8Array, filename: string, contentType: string) {
  const safeName = filename.replace(/[^\x20-\x7e]|["\\]/g, "_")
  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  })
}

function receivedEmailPayload(email: ReceivedEmail) {
  return {
    id: email.id || "",
    threadId: email.thread_id || null,
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
    attachments: resendAttachments(email.attachments),
  }
}

function localInboxPayload(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id: `local:${id}`,
    threadId: null,
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
  const gmailConnected = await hasStoredGmailConnection(agencyId)

  const params = new URL(request.url).searchParams
  const emailId = params.get("id")?.trim()
  const attachmentId = params.get("attachment")?.trim()
  if (emailId && attachmentId) {
    const filename = params.get("filename")?.trim() || "attachment"
    const contentType = params.get("type")?.trim() || "application/octet-stream"
    if (emailId.startsWith("gmail:")) {
      if (!gmailConnected) return NextResponse.json({ error: "Google mailbox is not connected." }, { status: 503 })
      const data = await getGmailAttachment(agencyId, emailId.slice(6), attachmentId).catch(() => null)
      return data ? attachmentResponse(data, filename, contentType) : NextResponse.json({ error: "Attachment not found." }, { status: 404 })
    }
    if (emailId.startsWith("local:") || !process.env.RESEND_API_KEY) return NextResponse.json({ error: "Attachment not found." }, { status: 404 })
    const { response, result } = await resendRequest(`/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`)
    const file = result as { download_url?: string; filename?: string; content_type?: string } | null
    if (!response?.ok || !file?.download_url) return NextResponse.json({ error: "Attachment not found." }, { status: 404 })
    const download = await fetch(file.download_url, { cache: "no-store" }).catch(() => null)
    if (!download?.ok) return NextResponse.json({ error: "Attachment could not be downloaded." }, { status: 502 })
    return attachmentResponse(await download.arrayBuffer(), file.filename || filename, file.content_type || contentType)
  }
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
        return NextResponse.json({ data, source: "gmail", hasMore: gmail.hasMore, partial: gmail.partial, warning: gmail.partial ? "Some Google messages could not be loaded. Try again to load the rest." : undefined })
      } catch (error) {
        // Show what we have; the next refresh picks up Gmail once it responds.
        console.error("Gmail inbox load failed", error)
        return NextResponse.json({ data: localMessages, source: "gmail", hasMore: false, partial: true, warning: "Google inbox could not be loaded. Try again in a moment." })
      }
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ data: localMessages, hasMore: false, warning: "Inbound email is not configured; visitor sign-ups still appear here." })
    }
    const { response, result } = await resendRequest("/emails/receiving")
    if (!response?.ok) {
      const error = result && "error" in result ? result.error?.message : result && "message" in result ? result.message : undefined
      if (!localMessages.length) return NextResponse.json({ error: error || "Received messages could not be loaded from Resend." }, { status: response?.status && response.status >= 400 ? response.status : 502 })
      return NextResponse.json({ data: localMessages, hasMore: false, partial: true, warning: error || "Received messages could not be loaded from Resend." })
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
  const cids = cidReferences(email.html)
  if (email.html && cids.size) {
    const inline = (email.attachments || []).filter((file) => typeof file.id === "string" && typeof file.content_id === "string" && cids.has(normalizeCid(file.content_id)))
    const images = new Map<string, { contentType: string; data: Buffer }>()
    await Promise.all(inline.map(async (file) => {
      const { response: fileResponse, result: fileResult } = await resendRequest(`/emails/receiving/${encodeURIComponent(email.id as string)}/attachments/${encodeURIComponent(String(file.id))}`)
      const downloadUrl = (fileResult as { download_url?: string } | null)?.download_url
      if (!fileResponse?.ok || !downloadUrl) return
      const download = await fetch(downloadUrl, { cache: "no-store" }).catch(() => null)
      if (download?.ok) images.set(normalizeCid(String(file.content_id)), { contentType: String(file.content_type || "image/png"), data: Buffer.from(await download.arrayBuffer()) })
    }))
    const payload = receivedEmailPayload(email)
    return NextResponse.json({ ...payload, html: inlineCidImages(email.html, images), attachments: resendAttachments((email.attachments || []).filter((file) => !(typeof file.content_id === "string" && cids.has(normalizeCid(file.content_id))))) })
  }
  return NextResponse.json(receivedEmailPayload(email))
}

export async function PATCH(request: Request) {
  const authorization = request.headers.get("authorization")
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""
  if (!idToken) return NextResponse.json({ error: "Your session has expired. Sign in again and retry." }, { status: 401 })
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(idToken).catch(() => null)
  if (!decoded) return NextResponse.json({ error: "Your session has expired. Sign in again and retry." }, { status: 401 })
  const account = (await db.collection("users").doc(decoded.uid).get()).data()
  const agencyId = typeof account?.agencyId === "string" ? account.agencyId.trim() : ""
  if (!agencyId || (account?.role !== "admin" && account?.role !== "superadmin")) {
    return NextResponse.json({ error: "You don't have access to this inbox." }, { status: 403 })
  }
  const payload = await request.json().catch(() => ({})) as { id?: string; action?: string }
  if (!payload.id?.startsWith("gmail:") || !/^gmail:[a-zA-Z0-9]+$/.test(payload.id) || !["read", "unread", "archive", "trash", "restore"].includes(payload.action || "")) {
    return NextResponse.json({ error: "Invalid Gmail message action." }, { status: 400 })
  }
  try {
    await changeGmailMessage(agencyId, payload.id.slice(6), payload.action as "read" | "unread" | "archive" | "trash" | "restore")
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google message could not be updated." }, { status: 502 })
  }
}
