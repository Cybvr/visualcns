import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { normalizeSubscriptionEmail, subscriptionDocumentId, unsubscribeUrl } from "@/lib/email-unsubscribe"
import { markdownToHtml } from "@/lib/markdown"
import { getAgencySecret, recordAgencyUsage } from "@/lib/server/agency-secrets"
import { requireAgencyId } from "@/lib/require-agency-id"
import { parseEmailList } from "@/lib/email-composer"
import { MAX_EMAIL_ATTACHMENTS, MAX_EMAIL_ATTACHMENT_BYTES, type EmailAttachment, type EmailAttachmentInfo } from "@/lib/email-attachments"
import { SITE_ORIGIN, X_URL, LINKEDIN_URL, absoluteWebUrl, brandedEmail, escapeHtml, extractEmailAddress, normalizeEmailAddress, safeBrandValue } from "@/lib/server/email-branding"
import { getGmailMessage, gmailSenders, hasGmailConnection, sendGmailMessage } from "@/lib/server/google-gmail"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_CC = 20
const VISUALCNS_SENDER_LOCALS = ["jide", "hello", "info", "visitors"]

/** Turns web addresses in already-escaped plain text into links, so a pasted URL is clickable. */
function linkify(escaped: string) {
  return escaped.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (url) => `<a href="${url}">${url}</a>`)
}

/** The same for HTML from the editor: only text outside tags and existing links is touched. */
function linkifyHtml(html: string) {
  let insideLink = 0
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith("<")) {
      if (/^<a[\s>]/i.test(part)) insideLink += 1
      else if (/^<\/a>/i.test(part)) insideLink = Math.max(0, insideLink - 1)
      return part
    }
    return insideLink ? part : linkify(part)
  }).join("")
}

function senderOptions(from: string) {
  const configured = (process.env.EMAIL_FROM_ADDRESSES || "")
    .split(",")
    .map((value) => normalizeEmailAddress(value))
    .filter(Boolean)
  const baseEmail = extractEmailAddress(from)
  const domain = baseEmail.split("@")[1]?.toLowerCase()
  const defaults = domain === "mail.visualcns.com"
    ? VISUALCNS_SENDER_LOCALS.map((local) => `VisualCNS <${local}@${domain}>`)
    : []
  return [...new Map([from, ...configured, ...defaults].map((value) => [extractEmailAddress(value).toLowerCase(), value])).values()]
}

type FirebaseLookupResponse = {
  users?: Array<{ localId?: string }>
}

type ResendResponse = {
  id?: string
  threadId?: string
  message?: string
  error?: { message?: string }
  to?: string[]
  from?: string
  reply_to?: string[] | string
  subject?: string
  created_at?: string
  scheduled_at?: string | null
  last_event?: string | null
  html?: string | null
  text?: string | null
}

type EmailMessageKind = "transactional" | "marketing"
type EmailContext = {
  companyId?: string
  projectId?: string
  documentType?: string
  documentId?: string
  intent?: "reminder"
}

type EmailHistoryInput = {
  companyId?: unknown
  to?: unknown
  createdAt?: unknown
  recipients?: unknown
  companyName?: unknown
  projectName?: unknown
  documentTitle?: unknown
  threadId?: unknown
  inReplyTo?: unknown
  references?: unknown
}

type EmailThreading = {
  threadId?: string
  inReplyTo?: string
  references?: string[]
}

type WelcomeClaim = {
  uid: string
  db: ReturnType<typeof adminServices>["db"]
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

async function getAdminCaller(idToken: string) {
  try {
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(idToken)
    const snapshot = await db.collection("users").doc(decoded.uid).get()
    return snapshot.exists ? { uid: decoded.uid, data: snapshot.data() || {}, db } : null
  } catch {
    return null
  }
}

async function getMarketingRecipients(recipients: string[], agencyId: string) {
  const { db } = adminServices()
  const clientSnapshot = await db.collection("users").where("agencyId", "==", agencyId).where("role", "==", "client").get()
  const subscribedByDefault = new Set(
    clientSnapshot.docs
      .map((item) => normalizeSubscriptionEmail(String(item.data().email || "")))
      .filter(Boolean),
  )
  const normalizedRecipients = Array.from(new Set(recipients.map(normalizeSubscriptionEmail)))
  const unknownRecipients = normalizedRecipients.filter((email) => !subscribedByDefault.has(email))
  const suppressionSnapshots = await Promise.all(
    normalizedRecipients.map((email) => db.collection("emailUnsubscriptions").doc(subscriptionDocumentId(email)).get()),
  )
  const suppressedRecipients = normalizedRecipients.filter((_, index) => suppressionSnapshots[index].exists)
  const allowedRecipients = normalizedRecipients.filter((email) => subscribedByDefault.has(email) && !suppressedRecipients.includes(email))

  return { db, allowedRecipients, suppressedRecipients, unknownRecipients }
}

async function markContextAsSent(db: ReturnType<typeof adminServices>["db"], context: EmailContext, agencyId: string) {
  if (!context.documentId || !context.documentType) return
  const collectionByType: Record<string, string> = {
    invoice: "invoices",
    estimate: "estimates",
    contract: "contracts",
    document: "companyDocuments",
    companyDocument: "companyDocuments",
    project: "projects",
    task: "tasks",
  }
  const collectionName = collectionByType[context.documentType]
  if (!collectionName) return
  const ref = db.collection(collectionName).doc(context.documentId)
  const snapshot = await ref.get()
  const current = snapshot.data()
  if (!snapshot.exists || current?.agencyId !== agencyId) return
  const now = new Date().toISOString()
  let patch: Record<string, unknown>
  if (context.intent === "reminder" && context.documentType === "invoice") {
    // A reminder is a nudge about an invoice already sent: count it, keep the status.
    patch = { lastReminderAt: now, lastEmailSentAt: now, reminderCount: FieldValue.increment(1) }
  } else if (["invoice", "estimate", "contract", "document", "companyDocument"].includes(context.documentType)) {
    // Only a draft moves to "sent"; never undo paid, overdue, signed or accepted.
    patch = !current?.status || current.status === "draft" ? { status: "sent", lastEmailSentAt: now } : { lastEmailSentAt: now }
  } else {
    patch = context.documentType === "task" ? { lastNotifiedAt: now } : { lastCommunicationAt: now }
  }
  await ref.set(patch, { merge: true })
}

async function saveEmailHistory(
  caller: { uid: string; data: Record<string, unknown>; db: ReturnType<typeof adminServices>["db"] },
  agencyId: string,
  id: string,
  input: EmailHistoryInput,
  details: { to: string[]; cc: string[]; subject: string; from: string; replyTo: string; html: string; text: string; scheduledAt: string; messageKind: EmailMessageKind; context: EmailContext; attachments: EmailAttachmentInfo[]; threading?: EmailThreading },
) {
  const recipients = Array.isArray(input.recipients)
    ? input.recipients.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object").map((recipient) => ({
        email: typeof recipient.email === "string" ? recipient.email : "",
        ...(typeof recipient.name === "string" ? { name: recipient.name } : {}),
        ...(typeof recipient.companyId === "string" ? { companyId: recipient.companyId } : {}),
      })).filter((recipient) => recipient.email)
    : []
  const record = Object.fromEntries(Object.entries({
    id,
    providerId: id,
    agencyId,
    companyId: typeof input.companyId === "string" && input.companyId ? input.companyId : String(caller.data.companyId || caller.uid),
    createdBy: caller.uid,
    to: typeof input.to === "string" && input.to ? input.to : details.to.join(", "),
    cc: details.cc.length ? details.cc : undefined,
    subject: details.subject,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString(),
    from: details.from,
    replyTo: details.replyTo || undefined,
    bodyHtml: details.html,
    bodyText: details.text,
    recipients: recipients.length ? recipients : undefined,
    projectId: details.context.projectId,
    projectName: typeof input.projectName === "string" ? input.projectName : undefined,
    documentType: details.context.documentType,
    documentId: details.context.documentId,
    documentTitle: typeof input.documentTitle === "string" ? input.documentTitle : undefined,
    companyName: typeof input.companyName === "string" ? input.companyName : undefined,
    messageKind: details.messageKind,
    status: details.scheduledAt ? "scheduled" : "sent",
    scheduledAt: details.scheduledAt || undefined,
    attachments: details.attachments.length ? details.attachments : undefined,
    threadId: details.threading?.threadId,
    inReplyTo: details.threading?.inReplyTo,
    references: details.threading?.references?.length ? details.threading.references : undefined,
  }).filter(([, value]) => value !== undefined))
  await caller.db.collection("emailMessages").doc(id).set(record, { merge: true })
}

async function claimWelcomeEmail(caller: { uid: string; data: Record<string, unknown>; db: ReturnType<typeof adminServices>["db"] }, email: string): Promise<WelcomeClaim | null> {
  if (caller.data.role !== "client" || String(caller.data.email || "").trim().toLowerCase() !== email.toLowerCase()) return null
  const ref = caller.db.collection("users").doc(caller.uid)
  let claimed = false
  await caller.db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists) return
    const data = snapshot.data() || {}
    if (data.welcomeEmailSentAt) return
    const claimedAt = Date.parse(String(data.welcomeEmailClaimedAt || ""))
    if (claimedAt && Date.now() - claimedAt < 15 * 60 * 1000) return
    transaction.set(ref, { welcomeEmailClaimedAt: new Date().toISOString() }, { merge: true })
    claimed = true
  })
  return claimed ? { uid: caller.uid, db: caller.db } : null
}

async function completeWelcomeEmail(claim: WelcomeClaim) {
  await claim.db.collection("users").doc(claim.uid).set({
    welcomeEmailPending: false,
    welcomeEmailSentAt: new Date().toISOString(),
    welcomeEmailClaimedAt: FieldValue.delete(),
  }, { merge: true })
}

async function releaseWelcomeEmail(claim: WelcomeClaim) {
  await claim.db.collection("users").doc(claim.uid).set({ welcomeEmailClaimedAt: FieldValue.delete() }, { merge: true })
}

export async function GET(request: Request) {
  const from = normalizeEmailAddress(process.env.EMAIL_FROM || "")
  const replyTo = normalizeEmailAddress(process.env.EMAIL_REPLY_TO || "") || from
  const emailId = new URL(request.url).searchParams.get("id")?.trim()

  if (emailId) {
    const authorization = request.headers.get("authorization")
    const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""

    if (!idToken || !(await hasValidFirebaseSession(idToken))) {
      return NextResponse.json({ error: "Your session has expired. Sign in again and retry." }, { status: 401 })
    }

    if (emailId.startsWith("gmail:")) {
      const caller = await getAdminCaller(idToken)
      if (!caller) return NextResponse.json({ error: "Your account has no agency assigned." }, { status: 403 })
      const agencyId = requireAgencyId(caller.data)
      try {
        const email = await getGmailMessage(agencyId, emailId.slice(6))
        if (!email) return NextResponse.json({ error: "The sent email could not be loaded." }, { status: 404 })
        return NextResponse.json({ ...email, id: emailId, replyTo: email.headers?.["reply-to"] || null, scheduledAt: null, lastEvent: "delivered" })
      } catch {
        return NextResponse.json({ error: "The sent Google message could not be loaded." }, { status: 502 })
      }
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Email history is not configured." }, { status: 503 })
    }

    const resendResponse = await fetch(`https://api.resend.com/emails/${encodeURIComponent(emailId)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "VisualCNS Dashboard/1.0",
      },
      cache: "no-store",
    })
    const result = (await resendResponse.json().catch(() => ({}))) as ResendResponse

    if (!resendResponse.ok || !result.id) {
      return NextResponse.json(
        { error: result.error?.message || result.message || "The sent email could not be loaded." },
        { status: resendResponse.status >= 400 ? resendResponse.status : 502 },
      )
    }

    return NextResponse.json({
      id: result.id,
      to: result.to || [],
      from: result.from || null,
      replyTo: Array.isArray(result.reply_to) ? result.reply_to.join(", ") : result.reply_to || replyTo || null,
      subject: result.subject || "",
      createdAt: result.created_at || null,
      scheduledAt: result.scheduled_at || null,
      lastEvent: result.last_event || null,
      html: result.html || null,
      text: result.text || null,
    })
  }

  return NextResponse.json({
    configured: Boolean(process.env.RESEND_API_KEY && from),
    from: from || null,
    replyTo: replyTo || null,
    senders: from ? senderOptions(from) : [],
  })
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization")
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""

  if (!idToken || !(await hasValidFirebaseSession(idToken))) {
    return NextResponse.json({ error: "Your session has expired. Sign in again and retry." }, { status: 401 })
  }

  let apiKey = process.env.RESEND_API_KEY || ""
  let from = normalizeEmailAddress(process.env.EMAIL_FROM || "")
  let replyTo = normalizeEmailAddress(process.env.EMAIL_REPLY_TO || "") || from

  let payload: { to?: unknown; cc?: unknown; from?: unknown; intent?: unknown; subject?: unknown; text?: unknown; html?: unknown; imageUrl?: unknown; brand?: unknown; cta?: unknown; branded?: unknown; type?: unknown; welcome?: unknown; templateId?: unknown; companyId?: unknown; projectId?: unknown; documentType?: unknown; documentId?: unknown; scheduledAt?: unknown; history?: EmailHistoryInput; attachments?: unknown; threading?: unknown }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return NextResponse.json({ error: "The email request could not be read." }, { status: 400 })
  }

  const rawAttachments = payload.attachments === undefined ? [] : payload.attachments
  if (!Array.isArray(rawAttachments) || rawAttachments.length > MAX_EMAIL_ATTACHMENTS) {
    return NextResponse.json({ error: `Attach up to ${MAX_EMAIL_ATTACHMENTS} files.` }, { status: 400 })
  }
  const attachments: EmailAttachment[] = []
  const attachmentInfo: EmailAttachmentInfo[] = []
  let attachmentBytes = 0
  for (const item of rawAttachments) {
    if (!item || typeof item !== "object") return NextResponse.json({ error: "An attachment could not be read." }, { status: 400 })
    const file = item as Record<string, unknown>
    if (typeof file.filename !== "string" || !file.filename.trim() || file.filename.length > 255 || typeof file.content !== "string" || file.content.length > Math.ceil(MAX_EMAIL_ATTACHMENT_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.content) || file.content.length % 4 !== 0) {
      return NextResponse.json({ error: "An attachment could not be read." }, { status: 400 })
    }
    const contentType = typeof file.contentType === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(file.contentType) ? file.contentType : "application/octet-stream"
    const size = Buffer.from(file.content, "base64").length
    attachmentBytes += size
    if (!size || attachmentBytes > MAX_EMAIL_ATTACHMENT_BYTES) return NextResponse.json({ error: "Attachments can total up to 5 MB." }, { status: 400 })
    attachments.push({ filename: file.filename.replace(/[\r\n]/g, "_"), contentType, content: file.content })
    attachmentInfo.push({ filename: file.filename.replace(/[\r\n]/g, "_"), size })
  }

  let recipients = (Array.isArray(payload.to) ? payload.to : [payload.to])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
  const ccInput = parseEmailList(Array.isArray(payload.cc) ? payload.cc.filter((value): value is string => typeof value === "string") : typeof payload.cc === "string" ? payload.cc : undefined)
  let subject = typeof payload.subject === "string" ? payload.subject.trim() : ""
  let text = typeof payload.text === "string" ? payload.text.trim() : ""
  let requestedHtml = typeof payload.html === "string" ? payload.html.trim() : ""
  const imagePath = typeof payload.imageUrl === "string" && payload.imageUrl.startsWith("/") ? payload.imageUrl : ""
  const messageKind: EmailMessageKind = payload.type === "marketing" ? "marketing" : "transactional"
  const isWelcome = payload.welcome === true
  const templateId = typeof payload.templateId === "string" && payload.templateId.trim()
    ? payload.templateId.trim()
    : "welcome-client-portal"
  const context: EmailContext = {
    companyId: typeof payload.companyId === "string" ? payload.companyId.trim() : undefined,
    projectId: typeof payload.projectId === "string" ? payload.projectId.trim() : undefined,
    documentType: typeof payload.documentType === "string" ? payload.documentType.trim() : undefined,
    documentId: typeof payload.documentId === "string" ? payload.documentId.trim() : undefined,
    intent: payload.intent === "reminder" ? "reminder" : undefined,
  }
  const threadingInput = payload.threading && typeof payload.threading === "object" ? payload.threading as Record<string, unknown> : {}
  const cleanHeader = (value: unknown, max = 998) => typeof value === "string" ? value.replace(/[\r\n]/g, " ").trim().slice(0, max) : ""
  const threading: EmailThreading = {
    threadId: cleanHeader(threadingInput.threadId, 256) || undefined,
    inReplyTo: cleanHeader(threadingInput.inReplyTo) || undefined,
    references: Array.isArray(threadingInput.references)
      ? Array.from(new Set(threadingInput.references.map((value) => cleanHeader(value)).filter(Boolean))).slice(-20)
      : undefined,
  }

  let scheduledAtIso = ""
  if (typeof payload.scheduledAt === "string" && payload.scheduledAt.trim()) {
    const when = new Date(payload.scheduledAt.trim())
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "The scheduled time could not be read." }, { status: 400 })
    }
    if (when.getTime() < Date.now() + 60_000) {
      return NextResponse.json({ error: "Pick a scheduled time at least a minute from now." }, { status: 400 })
    }
    if (when.getTime() > Date.now() + 30 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Emails can be scheduled up to 30 days ahead." }, { status: 400 })
    }
    scheduledAtIso = when.toISOString()
  }

  if (recipients.length === 0 || recipients.some((recipient) => !EMAIL_PATTERN.test(recipient))) {
    return NextResponse.json({ error: "Enter a valid recipient email address or choose a contact list." }, { status: 400 })
  }
  if (recipients.length > 50) {
    return NextResponse.json({ error: "A contact list can contain no more than 50 recipients per send." }, { status: 400 })
  }
  if (ccInput.invalid.length) {
    return NextResponse.json({ error: `Check the Cc addresses: ${ccInput.invalid.join(", ")}` }, { status: 400 })
  }
  const cc = ccInput.valid.filter((email) => !recipients.some((recipient) => recipient.toLowerCase() === email))
  if (cc.length > MAX_CC) {
    return NextResponse.json({ error: `You can copy up to ${MAX_CC} people.` }, { status: 400 })
  }
  if (cc.length && (messageKind === "marketing" || isWelcome)) {
    return NextResponse.json({ error: "Cc only works on regular emails, not marketing or welcome emails." }, { status: 400 })
  }
  if (isWelcome && (messageKind !== "transactional" || recipients.length !== 1)) {
    return NextResponse.json({ error: "A welcome email must be a single transactional message." }, { status: 400 })
  }

  let suppressedRecipients: string[] = []
  const caller = await getAdminCaller(idToken)
  if (!caller) return NextResponse.json({ error: "Your account has no agency assigned." }, { status: 403 })
  const agencyId = requireAgencyId(caller.data)
  if (caller && !payload.brand) {
    const agency = (await caller.db.collection("agencies").doc(agencyId).get()).data() || {}
    payload.brand = {
      name: typeof agency.name === "string" ? agency.name : undefined,
      logoUrl: typeof agency.logoUrl === "string" ? agency.logoUrl : undefined,
      email: typeof agency.senderEmail === "string" ? agency.senderEmail : undefined,
    }
  }
  apiKey = await getAgencySecret(agencyId, "RESEND_API_KEY", apiKey)
  const resendFrom = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_FROM", from))
  from = resendFrom
  const configuredReplyTo = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_REPLY_TO", process.env.EMAIL_REPLY_TO || ""))
  replyTo = configuredReplyTo || from
  const gmailConnected = await hasGmailConnection(agencyId)
  let gmailAvailableSenders: Awaited<ReturnType<typeof gmailSenders>> = []
  if (gmailConnected) {
    try { gmailAvailableSenders = await gmailSenders(agencyId) } catch { gmailAvailableSenders = [] }
  }
  const history = payload.history && typeof payload.history === "object" ? payload.history : {}
  const gmailConnectedEmail = gmailConnected ? normalizeEmailAddress(await getAgencySecret(agencyId, "GMAIL_CONNECTED_EMAIL", "")) : ""
  if (!from) from = gmailAvailableSenders[0]?.display || gmailConnectedEmail
  replyTo = configuredReplyTo || from
  const gmailSenderEmails = new Set(gmailAvailableSenders.map((item) => extractEmailAddress(item.display).toLowerCase()))
  const resendAvailableSenders = senderOptions(resendFrom || from)
  const allAvailableSenders = [...new Map([...gmailAvailableSenders.map((item) => item.display), ...resendAvailableSenders].map((value) => [extractEmailAddress(value).toLowerCase(), value])).values()]
  const requestedSender = typeof payload.from === "string" ? normalizeEmailAddress(payload.from) : ""
  let useGmail = gmailConnected && !scheduledAtIso && (!from || gmailSenderEmails.has(extractEmailAddress(from).toLowerCase()))
  if (requestedSender) {
    const selectedSender = allAvailableSenders.find((candidate) => extractEmailAddress(candidate).toLowerCase() === extractEmailAddress(requestedSender).toLowerCase())
    if (!selectedSender) return NextResponse.json({ error: "That sender address is not configured for this workspace." }, { status: 400 })
    from = selectedSender
    useGmail = gmailConnected && !scheduledAtIso && gmailSenderEmails.has(extractEmailAddress(selectedSender).toLowerCase())
    replyTo = configuredReplyTo || from
  }
  if ((!apiKey && !useGmail) || !from) {
    return NextResponse.json({ error: "Email sending is not configured for this agency." }, { status: 503 })
  }
  let welcomeClaim: WelcomeClaim | null = null
  if (isWelcome) {
    if (!caller) return NextResponse.json({ error: "Your session has expired. Sign in again and retry." }, { status: 401 })
    const companyId = String(caller.data.companyId || caller.uid)
    const templateSnapshot = await caller.db.collection("emailTemplates").doc(`${companyId}__${templateId}`).get()
    if (templateSnapshot.exists && templateSnapshot.data()?.agencyId !== agencyId) {
      return NextResponse.json({ error: "The welcome email template is not available." }, { status: 503 })
    }
    if (!templateSnapshot.exists) {
      return NextResponse.json({ error: "The welcome email template is not available." }, { status: 503 })
    }
    const template = templateSnapshot.data() || {}
    const customerName = String(caller.data.displayName || recipients[0].split("@")[0]).trim()
    subject = String(template.subject || "").replaceAll("[Customer Name]", customerName).trim()
    text = String(template.body || "").replaceAll("[Customer Name]", customerName).trim()
    const templateImageUrl = typeof template.imageUrl === "string" ? template.imageUrl.trim() : ""
    requestedHtml = markdownToHtml(text)
    if (templateImageUrl) {
      requestedHtml += `<p><img src="${escapeHtml(templateImageUrl)}" alt="${escapeHtml(String(template.imageAlt || "Message image"))}" style="display:block;width:100%;max-width:720px;height:auto;border-radius:12px;margin-top:24px;" /></p>`
    }
    welcomeClaim = await claimWelcomeEmail(caller, recipients[0])
    if (!welcomeClaim) return NextResponse.json({ error: "This welcome email has already been sent or is already being delivered." }, { status: 409 })
  }
  if (!subject || subject.length > 200) {
    return NextResponse.json({ error: "Add a subject no longer than 200 characters." }, { status: 400 })
  }
  if (EMAIL_PATTERN.test(subject) || recipients.some((recipient) => recipient.toLowerCase() === subject.toLowerCase())) {
    return NextResponse.json(
      { error: "Add a message subject—the recipient email cannot be used as the subject." },
      { status: 400 },
    )
  }
  if (!text || text.length > 20_000) {
    return NextResponse.json({ error: "Add a message no longer than 20,000 characters." }, { status: 400 })
  }
  const callerIsAdmin = caller?.data.role === "admin" || caller?.data.role === "superadmin"
  if (context.documentId && (!caller || !callerIsAdmin)) {
    return NextResponse.json({ error: "Only an agency admin can send contextual client communication." }, { status: 403 })
  }
  if (messageKind === "marketing") {
    if (!caller || !callerIsAdmin) {
      return NextResponse.json({ error: "Only an agency admin can send marketing emails." }, { status: 403 })
    }

    try {
      const marketing = await getMarketingRecipients(recipients, agencyId)
      if (marketing.unknownRecipients.length > 0) {
        return NextResponse.json(
          { error: `Marketing emails can only be sent to subscribed client or portal contacts. Not subscribed: ${marketing.unknownRecipients.join(", ")}` },
          { status: 400 },
        )
      }
      recipients = marketing.allowedRecipients
      suppressedRecipients = marketing.suppressedRecipients
      if (recipients.length === 0) {
        return NextResponse.json({ error: "All selected contacts have unsubscribed from marketing emails." }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: "Marketing subscription status could not be checked. Try again." }, { status: 503 })
    }
  }

  const richHtml = linkifyHtml(requestedHtml.replace(/(src=["'])\/([^"']*)/gi, `$1${SITE_ORIGIN}/$2`))
  const messageContent = [
    richHtml || text.split(/\n\s*\n/).map((paragraph) => `<p>${linkify(escapeHtml(paragraph)).replace(/\n/g, "<br />")}</p>`).join(""),
    imagePath && !requestedHtml
      ? `<p><img src="${escapeHtml(`${SITE_ORIGIN}${imagePath}`)}" alt="Ngai AI assistant" style="display:block;width:100%;max-width:720px;height:auto;border-radius:12px;margin-top:24px;" /></p>`
      : "",
  ].join("")
  const brandSource = payload.brand && typeof payload.brand === "object" ? payload.brand as Record<string, unknown> : {}
  const ctaSource = payload.cta && typeof payload.cta === "object" ? payload.cta as Record<string, unknown> : {}
  const ctaText = safeBrandValue(ctaSource.text, "Open your company page") || "Open your company page"
  const ctaUrl = absoluteWebUrl(safeBrandValue(ctaSource.url), `${SITE_ORIGIN}/`)
  const footerText = [
    safeBrandValue(brandSource.name, "VisualCNS") || "VisualCNS",
    safeBrandValue(brandSource.address, "Lagos, Nigeria"),
    extractEmailAddress(from),
    safeBrandValue(brandSource.phone),
    safeBrandValue(brandSource.website, "visualcns.com"),
  ].filter(Boolean).join(" · ")
  const useBrandedLayout = payload.branded !== false

  async function sendOne(to: string[], unsubscribeEmail?: string, copy: string[] = []) {
    const unsubscribeLink = unsubscribeEmail ? unsubscribeUrl(unsubscribeEmail) : ""
    const plainHtml = `${messageContent}${unsubscribeLink ? `<p><a href="${escapeHtml(unsubscribeLink)}">Unsubscribe</a></p>` : ""}`
    const html = useBrandedLayout ? brandedEmail(messageContent, subject, payload.brand, from, payload.cta, unsubscribeLink) : plainHtml
    const brandedText = useBrandedLayout
      ? `${text}\n\n${ctaText}: ${ctaUrl}\n\n---\n${footerText}\nX: ${X_URL}\nLinkedIn: ${LINKEDIN_URL}${unsubscribeLink ? `\nUnsubscribe: ${unsubscribeLink}` : ""}`
      : `${text}${unsubscribeLink ? `\n\nUnsubscribe: ${unsubscribeLink}` : ""}`
    if (useGmail) {
      const result = await sendGmailMessage(agencyId, { from, to, cc: copy, replyTo, subject, text: brandedText, html, attachments, ...threading })
      return { response: { ok: Boolean(result.id), status: result.id ? 200 : 502 }, result: { id: result.id ? `gmail:${result.id}` : undefined, threadId: result.threadId } as ResendResponse, html, brandedText }
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
        "User-Agent": "VisualCNS Dashboard/1.0",
      },
      body: JSON.stringify({
        from,
        to,
        ...(copy.length ? { cc: copy } : {}),
        subject,
        text: brandedText,
        html,
        ...(attachments.length ? { attachments: attachments.map(({ filename, content }) => ({ filename, content })) } : {}),
        reply_to: replyTo,
        ...(scheduledAtIso ? { scheduled_at: scheduledAtIso } : {}),
        ...((unsubscribeLink || threading.inReplyTo || threading.references?.length)
          ? { headers: {
            ...(unsubscribeLink ? { "List-Unsubscribe": `<${unsubscribeLink}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {}),
            ...(threading.inReplyTo ? { "In-Reply-To": threading.inReplyTo } : {}),
            ...(threading.references?.length ? { References: threading.references.join(" ") } : {}),
          } }
          : {}),
      }),
      cache: "no-store",
    })
    const result = (await response.json().catch(() => ({}))) as ResendResponse
    return { response, result, html, brandedText }
  }

  if (messageKind === "marketing") {
    const sent: Array<{ id: string; html: string; text: string }> = []
    for (const recipient of recipients) {
      const attempt = await sendOne([recipient], recipient)
      if (!attempt.response.ok || !attempt.result.id) {
        const providerMessage = attempt.result.error?.message || attempt.result.message
        return NextResponse.json(
          {
            error: providerMessage || `The marketing email could not be sent to ${recipient}. ${sent.length} email${sent.length === 1 ? "" : "s"} already sent.`,
            sentCount: sent.length,
          },
          { status: attempt.response.status >= 400 ? attempt.response.status : 502 },
        )
      }
      sent.push({ id: attempt.result.id, html: attempt.html, text: attempt.brandedText })
    }
    if (caller && context.documentId && !scheduledAtIso) {
      try { await markContextAsSent(caller.db, context, agencyId) } catch { /* Sending remains successful if object sync is temporarily unavailable. */ }
    }
    let historySaved = true
    try {
      await saveEmailHistory(caller, agencyId, sent[0].id, history, {
        to: recipients,
        cc: [],
        subject,
        from,
        replyTo,
        html: sent[0].html,
        text: sent[0].text,
        scheduledAt: scheduledAtIso,
        messageKind,
        context,
        attachments: attachmentInfo,
        threading,
      })
    } catch {
      historySaved = false
    }
    void recordAgencyUsage(agencyId, "emailsSent", sent.length).catch(() => undefined)
    return NextResponse.json({
      id: sent[0].id,
      ids: sent.map((item) => item.id),
      html: sent[0].html,
      text: sent[0].text,
      replyTo: replyTo || null,
      threadId: threading.threadId || null,
      suppressedCount: suppressedRecipients.length,
      scheduledAt: scheduledAtIso || null,
      historySaved,
    })
  }

  let attempt: Awaited<ReturnType<typeof sendOne>>
  try {
    attempt = await sendOne(recipients, undefined, cc)
  } catch {
    if (welcomeClaim) await releaseWelcomeEmail(welcomeClaim).catch(() => undefined)
    return NextResponse.json({ error: "The email provider could not be reached. Try again." }, { status: 502 })
  }
  if (!attempt.response.ok || !attempt.result.id) {
    const providerMessage = attempt.result.error?.message || attempt.result.message
    if (welcomeClaim) await releaseWelcomeEmail(welcomeClaim).catch(() => undefined)
    return NextResponse.json(
      { error: providerMessage || "The email provider could not accept this message. Try again." },
      { status: attempt.response.status >= 400 ? attempt.response.status : 502 },
    )
  }

  if (caller && context.documentId && !scheduledAtIso) {
    try { await markContextAsSent(caller.db, context, agencyId) } catch { /* Sending remains successful if object sync is temporarily unavailable. */ }
  }
  let historySaved = true
  try {
    await saveEmailHistory(caller, agencyId, attempt.result.id, history, {
      to: recipients,
      cc,
      subject,
      from,
      replyTo,
      html: attempt.html,
      text: attempt.brandedText,
      scheduledAt: scheduledAtIso,
      messageKind,
      context,
      attachments: attachmentInfo,
      threading: { ...threading, threadId: attempt.result.threadId || threading.threadId },
    })
  } catch {
    historySaved = false
  }
  if (welcomeClaim) {
    try { await completeWelcomeEmail(welcomeClaim) } catch { /* The claim expires and can be retried if persistence is temporarily unavailable. */ }
  }
  void recordAgencyUsage(agencyId, "emailsSent", recipients.length + cc.length).catch(() => undefined)
  return NextResponse.json({ id: attempt.result.id, html: attempt.html, text: attempt.brandedText, replyTo: replyTo || null, threadId: attempt.result.threadId || threading.threadId || null, scheduledAt: scheduledAtIso || null, cc, context, historySaved })
}
