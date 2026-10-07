import { getAgencySecret } from "@/lib/server/agency-secrets"
import type { EmailAttachment } from "@/lib/email-attachments"
import { cidReferences, inlineCidImages, normalizeCid } from "@/lib/server/inline-email-images"

export const GOOGLE_GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
export const GOOGLE_GMAIL_MODIFY_SCOPE = "https://www.googleapis.com/auth/gmail.modify"
export const GOOGLE_GMAIL_SETTINGS_SCOPE = "https://www.googleapis.com/auth/gmail.settings.basic"
export const GOOGLE_CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events.owned"
export const GOOGLE_GMAIL_SCOPES = [GOOGLE_GMAIL_SEND_SCOPE, GOOGLE_GMAIL_MODIFY_SCOPE, GOOGLE_GMAIL_SETTINGS_SCOPE, GOOGLE_CALENDAR_EVENTS_SCOPE]

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1/users/me"

type GmailToken = {
  access_token: string
  expires_in?: number
  refresh_token?: string
  token_type?: string
}

type GmailHeader = { name?: string; value?: string }
type GmailPart = {
  mimeType?: string
  body?: { data?: string; attachmentId?: string; size?: number }
  headers?: GmailHeader[]
  parts?: GmailPart[]
  filename?: string
}

export type GmailMessage = {
  id?: string
  threadId?: string
  labelIds?: string[]
  internalDate?: string
  payload?: GmailPart
}

export type GmailListResponse = {
  messages?: Array<{ id?: string; threadId?: string }>
  nextPageToken?: string
  resultSizeEstimate?: number
}

export type GmailSender = { email: string; name?: string; display: string }

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

export function googleOAuthConfig() {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.visualcns.com").replace(/\/$/, "")
  return {
    clientId: requiredEnv("GOOGLE_GMAIL_CLIENT_ID"),
    clientSecret: requiredEnv("GOOGLE_GMAIL_CLIENT_SECRET"),
    redirectUri: process.env.GOOGLE_GMAIL_REDIRECT_URI?.trim() || `${origin}/api/email/google/callback`,
  }
}

function base64UrlEncode(value: string | Uint8Array) {
  const encoded = typeof value === "string" ? Buffer.from(value, "utf8").toString("base64") : Buffer.from(value).toString("base64")
  return encoded.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "")
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  return Buffer.from(normalized + "=".repeat((4 - normalized.length % 4) % 4), "base64").toString("utf8")
}

function isRetryableGmailError(status: number, result: { error?: { errors?: Array<{ reason?: string }> } }) {
  if (status === 429 || status >= 500) return true
  return status === 403 && Boolean(result.error?.errors?.some((item) => /rateLimit/i.test(item.reason || "")))
}

async function gmailFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  // Gmail allows about 50 message reads per second per mailbox, so back off and retry when it pushes back.
  const attempts = !init?.method || init.method.toUpperCase() === "GET" ? 4 : 1
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response: Response
    try {
      response = await fetch(`${GMAIL_API_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(init?.headers || {}),
        },
        cache: "no-store",
      })
    } catch (error) {
      if (attempt === attempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt + Math.random() * 250))
      continue
    }
    const result = await response.json().catch(() => ({})) as T & { error?: { message?: string; errors?: Array<{ reason?: string }> } }
    if (response.ok) return result
    if (attempt < attempts - 1 && isRetryableGmailError(response.status, result)) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt + Math.random() * 250))
      continue
    }
    throw new Error(result.error?.message || `Gmail API request failed (${response.status}).`)
  }
  throw new Error("Gmail API request failed.")
}

async function mapInBatches<T, R>(items: T[], size: number, run: (item: T) => Promise<R>) {
  const results: R[] = []
  for (let index = 0; index < items.length; index += size) {
    results.push(...await Promise.all(items.slice(index, index + size).map(run)))
  }
  return results
}

export async function googleAccessTokenForAgency(agencyId: string) {
  const refreshToken = await getAgencySecret(agencyId, "GMAIL_REFRESH_TOKEN", "")
  if (!refreshToken) return null
  const { clientId, clientSecret } = googleOAuthConfig()
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  })
  const result = await response.json().catch(() => ({})) as GmailToken & { error?: string; error_description?: string }
  if (!response.ok || !result.access_token) throw new Error(result.error_description || result.error || "Google authorization could not be refreshed.")
  return result.access_token
}

export async function hasGmailConnection(agencyId: string) {
  try {
    return Boolean(await googleAccessTokenForAgency(agencyId))
  } catch {
    return false
  }
}

export async function hasStoredGmailConnection(agencyId: string) {
  return Boolean(await getAgencySecret(agencyId, "GMAIL_REFRESH_TOKEN", ""))
}

export async function gmailProfile(agencyId: string) {
  const token = await googleAccessTokenForAgency(agencyId)
  if (!token) return null
  return gmailFetch<{ emailAddress?: string; messagesTotal?: number; threadsTotal?: number }>(token, "/profile")
}

function senderDisplay(email: string, name?: string) {
  return name?.trim() ? `${name.trim()} <${email}>` : email
}

export async function gmailSenders(agencyId: string): Promise<GmailSender[]> {
  const token = await googleAccessTokenForAgency(agencyId)
  if (!token) return []
  const result = await gmailFetch<{
    sendAs?: Array<{
      sendAsEmail?: string
      displayName?: string
      verificationStatus?: string
      isPrimary?: boolean
    }>
  }>(token, "/settings/sendAs")
  return (result.sendAs || [])
    .filter((item) => item.sendAsEmail && (!item.verificationStatus || item.verificationStatus === "accepted"))
    .map((item) => ({ email: item.sendAsEmail as string, name: item.displayName, display: senderDisplay(item.sendAsEmail as string, item.displayName) }))
    .sort((a, b) => a.email.localeCompare(b.email))
}

function mimeHeader(name: string, value: string) {
  return `${name}: ${value.replace(/[\r\n]/g, " ")}`
}

function encodedSubject(subject: string) {
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`
}

export function buildRawGmailMessage(input: { from: string; to: string[]; cc?: string[]; replyTo?: string; inReplyTo?: string; references?: string[]; subject: string; text: string; html?: string; attachments?: EmailAttachment[] }) {
  const hasAttachments = Boolean(input.attachments?.length)
  const headers = [
    mimeHeader("From", input.from),
    mimeHeader("To", input.to.join(", ")),
    ...(input.cc?.length ? [mimeHeader("Cc", input.cc.join(", "))] : []),
    ...(input.replyTo ? [mimeHeader("Reply-To", input.replyTo)] : []),
    ...(input.inReplyTo ? [mimeHeader("In-Reply-To", input.inReplyTo)] : []),
    ...(input.references?.length ? [mimeHeader("References", input.references.join(" "))] : []),
    mimeHeader("Subject", encodedSubject(input.subject)),
    "MIME-Version: 1.0",
    hasAttachments ? "Content-Type: multipart/mixed; boundary=visualhq_mixed" : "Content-Type: multipart/alternative; boundary=visualhq_boundary",
  ]
  const plain = Buffer.from(input.text, "utf8").toString("base64")
  const html = Buffer.from(input.html || `<p>${input.text.replace(/\n/g, "<br />")}</p>`, "utf8").toString("base64")
  const body = [
    ...headers,
    "",
    ...(hasAttachments ? ["--visualhq_mixed", "Content-Type: multipart/alternative; boundary=visualhq_boundary", ""] : []),
    "--visualhq_boundary",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    plain,
    "--visualhq_boundary",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    html,
    "--visualhq_boundary--",
    ...(input.attachments || []).flatMap((attachment) => {
      const filename = attachment.filename.replace(/[\r\n"\\]/g, "_")
      const contentType = attachment.contentType.replace(/[\r\n]/g, "") || "application/octet-stream"
      return ["--visualhq_mixed", `Content-Type: ${contentType}; name="${filename}"`, `Content-Disposition: attachment; filename="${filename}"`, "Content-Transfer-Encoding: base64", "", attachment.content]
    }),
    ...(hasAttachments ? ["--visualhq_mixed--"] : []),
    "",
  ].join("\r\n")
  return base64UrlEncode(body)
}

export async function sendGmailMessage(agencyId: string, input: Parameters<typeof buildRawGmailMessage>[0] & { threadId?: string }) {
  const token = await googleAccessTokenForAgency(agencyId)
  if (!token) throw new Error("Google mailbox is not connected.")
  return gmailFetch<{ id?: string; threadId?: string }>(token, "/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw: buildRawGmailMessage(input), ...(input.threadId ? { threadId: input.threadId } : {}) }),
  })
}

function headerMap(headers: GmailHeader[] = []) {
  return Object.fromEntries(headers.filter((item) => item.name).map((item) => [String(item.name).toLowerCase(), item.value || ""]))
}

function findBody(part: GmailPart | undefined, mimeType: string): string {
  if (!part) return ""
  if (part.mimeType === mimeType && part.body?.data) return base64UrlDecode(part.body.data)
  for (const child of part.parts || []) {
    const found = findBody(child, mimeType)
    if (found) return found
  }
  return ""
}

function partContentId(part: GmailPart) {
  const value = headerMap(part.headers)["content-id"]
  return value ? normalizeCid(value) : ""
}

function findInlineParts(part: GmailPart | undefined, cids: Set<string>): GmailPart[] {
  if (!part) return []
  const own = cids.has(partContentId(part)) && (part.body?.attachmentId || part.body?.data) ? [part] : []
  return [...own, ...(part.parts || []).flatMap((child) => findInlineParts(child, cids))]
}

function findAttachments(part: GmailPart | undefined, cids = new Set<string>()): Array<{ id: string; filename: string; contentType: string; size: number }> {
  if (!part) return []
  const own = part.filename && part.body?.attachmentId && !cids.has(partContentId(part))
    ? [{ id: part.body.attachmentId, filename: part.filename, contentType: part.mimeType || "application/octet-stream", size: part.body.size || 0 }]
    : []
  return [...own, ...(part.parts || []).flatMap((child) => findAttachments(child, cids))]
}

function gmailMessagePayload(message: GmailMessage) {
  const headers = headerMap(message.payload?.headers)
  const html = findBody(message.payload, "text/html") || null
  return {
    id: message.id ? `gmail:${message.id}` : "",
    threadId: message.threadId || null,
    from: headers.from || "",
    to: headers.to ? headers.to.split(",").map((item) => item.trim()).filter(Boolean) : [],
    cc: headers.cc ? headers.cc.split(",").map((item) => item.trim()).filter(Boolean) : [],
    bcc: headers.bcc ? headers.bcc.split(",").map((item) => item.trim()).filter(Boolean) : [],
    subject: headers.subject || "(No subject)",
    createdAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
    messageId: headers["message-id"] || null,
    html,
    text: findBody(message.payload, "text/plain") || null,
    headers: headers as Record<string, string>,
    attachments: findAttachments(message.payload, cidReferences(html)),
  }
}

type GmailInbox = { data: ReturnType<typeof gmailMessagePayload>[]; hasMore: boolean }
const inboxRequests = new Map<string, { promise: Promise<GmailInbox>; expiresAt: number }>()

async function fetchGmailInbox(agencyId: string): Promise<GmailInbox> {
  const token = await googleAccessTokenForAgency(agencyId)
  if (!token) return { data: [], hasMore: false }
  const list = await gmailFetch<GmailListResponse>(token, "/messages?labelIds=INBOX&maxResults=100")
  const ids = (list.messages || []).map((item) => item.id).filter((id): id is string => Boolean(id))
  const messages = await mapInBatches(ids, 10, (id) => gmailFetch<GmailMessage>(token, `/messages/${encodeURIComponent(id)}?format=full`))
  return { data: messages.map(gmailMessagePayload), hasMore: Boolean(list.nextPageToken) }
}

// The inbox page and the unread badge often ask at the same moment; share one Gmail load between them.
export function listGmailInbox(agencyId: string) {
  const cached = inboxRequests.get(agencyId)
  if (cached && cached.expiresAt > Date.now()) return cached.promise
  const promise = fetchGmailInbox(agencyId)
  inboxRequests.set(agencyId, { promise, expiresAt: Date.now() + 10_000 })
  promise.catch(() => { if (inboxRequests.get(agencyId)?.promise === promise) inboxRequests.delete(agencyId) })
  return promise
}

export async function getGmailMessage(agencyId: string, id: string) {
  const token = await googleAccessTokenForAgency(agencyId)
  if (!token) return null
  const message = await gmailFetch<GmailMessage>(token, `/messages/${encodeURIComponent(id)}?format=full`)
  const payload = gmailMessagePayload(message)
  const cids = cidReferences(payload.html)
  if (!payload.html || !cids.size) return payload
  const images = new Map<string, { contentType: string; data: Buffer }>()
  await Promise.all(findInlineParts(message.payload, cids).map(async (part) => {
    const encoded = part.body?.data || (await gmailFetch<{ data?: string }>(token, `/messages/${encodeURIComponent(id)}/attachments/${encodeURIComponent(part.body?.attachmentId || "")}`).catch(() => null))?.data
    if (encoded) images.set(partContentId(part), { contentType: part.mimeType || "image/png", data: Buffer.from(encoded, "base64url") })
  }))
  return { ...payload, html: inlineCidImages(payload.html, images) }
}

export async function getGmailAttachment(agencyId: string, messageId: string, attachmentId: string) {
  const token = await googleAccessTokenForAgency(agencyId)
  if (!token) return null
  const result = await gmailFetch<{ data?: string }>(token, `/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`)
  return result.data ? Buffer.from(result.data, "base64url") : null
}
