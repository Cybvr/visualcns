import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { normalizeSubscriptionEmail, subscriptionDocumentId, unsubscribeUrl } from "@/lib/email-unsubscribe"
import { markdownToHtml } from "@/lib/markdown"
import { getAgencySecret, recordAgencyUsage } from "@/lib/server/agency-secrets"
import { requireAgencyId } from "@/lib/require-agency-id"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.visualcns.com"
const X_URL = "https://x.com/visualcns"
const LINKEDIN_URL = "https://www.linkedin.com/company/visualng"

function normalizeEmailAddress(value: string) {
  const normalized = value
    .replace(/(?:&nbsp;|&#(?:x0*a0|160|x0*20|32);)/gi, " ")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  // Strip a wrapping pair of quotes, e.g. EMAIL_FROM set as
  // "VisualCNS <hello@mail.visualcns.com>" \u2014 Resend rejects the quoted whole.
  if (normalized.length >= 2 && /^(["']).*\1$/.test(normalized)) {
    return normalized.slice(1, -1).trim()
  }
  return normalized
}

function extractEmailAddress(value: string) {
  const normalized = normalizeEmailAddress(value)
  const match = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0] || normalized
}

type FirebaseLookupResponse = {
  users?: Array<{ localId?: string }>
}

type ResendResponse = {
  id?: string
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
}

type WelcomeClaim = {
  uid: string
  db: ReturnType<typeof adminServices>["db"]
}

type EmailBrand = {
  name: string
  email: string
  phone: string
  address: string
  website: string
  logoUrl: string
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string)
}

function safeBrandValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 500) : fallback
}

function absoluteWebUrl(value: string, fallback: string) {
  const candidate = value.startsWith("/") ? `${SITE_ORIGIN}${value}` : value
  try {
    const url = new URL(candidate || fallback)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : fallback
  } catch {
    return fallback
  }
}

function brandedEmail(content: string, subject: string, input: unknown, senderAddress: string, ctaInput: unknown, unsubscribeLink = "") {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {}
  const brand: EmailBrand = {
    name: safeBrandValue(source.name, "VisualCNS") || "VisualCNS",
    email: extractEmailAddress(senderAddress || safeBrandValue(source.email, "info@visualcns.com")),
    phone: safeBrandValue(source.phone),
    address: safeBrandValue(source.address, "Lagos, Nigeria"),
    website: safeBrandValue(source.website, "visualcns.com"),
    logoUrl: safeBrandValue(source.logoUrl, `${SITE_ORIGIN}/visualcns-email-logo.png`) || `${SITE_ORIGIN}/visualcns-email-logo.png`,
  }
  const websiteUrl = absoluteWebUrl(brand.website, SITE_ORIGIN)
  const ctaSource = ctaInput && typeof ctaInput === "object" ? ctaInput as Record<string, unknown> : {}
  const ctaText = safeBrandValue(ctaSource.text, "Open your company page") || "Open your company page"
  const ctaUrl = absoluteWebUrl(safeBrandValue(ctaSource.url), `${SITE_ORIGIN}/`)
  const contactItems = brand.address ? escapeHtml(brand.address) : ""
  const websiteLink = brand.website
    ? `<a href="${escapeHtml(websiteUrl)}" style="color:#5f6472;text-decoration:underline;">${escapeHtml(brand.website)}</a>`
    : ""
  const unsubscribeMarkup = unsubscribeLink
    ? `<div style="margin-top:12px;"><a href="${escapeHtml(unsubscribeLink)}" style="color:#5f6472;text-decoration:underline;">Unsubscribe from marketing emails</a></div>`
    : ""
  const preheader = escapeHtml(subject).slice(0, 140)

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f3f4f7;color:#20232d;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f3f4f7;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:0;border-radius:0;overflow:visible;">
            <tr>
              <td style="padding:22px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="vertical-align:middle;height:56px;line-height:0;"><img src="${escapeHtml(brand.logoUrl)}" width="320" alt="${escapeHtml(brand.name)}" style="display:block;width:320px;max-width:100%;height:auto;max-height:56px;object-fit:contain;object-position:left center;border:0;"></td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 12px;font-size:15px;line-height:1.65;color:#303440;overflow-wrap:anywhere;">${content}</td>
            </tr>
            <tr>
              <td style="padding:0 28px 30px;">
                <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#111318;border-radius:999px;color:#ffffff;padding:12px 20px;font-size:14px;font-weight:700;line-height:20px;text-decoration:none;">${escapeHtml(ctaText)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#f8f8fa;border-top:1px solid #e7e8ec;font-size:12px;line-height:1.6;color:#6d7280;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:top;text-align:left;">
                      <div style="font-weight:700;color:#303440;">${escapeHtml(brand.name)}</div>
                      ${contactItems ? `<div style="margin-top:4px;">${contactItems}</div>` : ""}
                      ${websiteLink ? `<div style="margin-top:4px;">${websiteLink}</div>` : ""}
                      ${unsubscribeMarkup}
                    </td>
                    <td style="vertical-align:top;text-align:right;white-space:nowrap;">
                      <a href="${X_URL}" aria-label="X" style="display:inline-block;margin-left:12px;color:#303440;font-weight:700;text-decoration:none;">X</a>
                      <a href="${LINKEDIN_URL}" aria-label="LinkedIn" style="display:inline-block;margin-left:12px;color:#303440;font-weight:700;text-decoration:none;">in</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
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
  const patch = ["invoice", "estimate", "contract", "document", "companyDocument"].includes(context.documentType)
    ? { status: "sent", lastEmailSentAt: new Date().toISOString() }
    : context.documentType === "task"
      ? { lastNotifiedAt: new Date().toISOString() }
      : { lastCommunicationAt: new Date().toISOString() }
  const ref = db.collection(collectionName).doc(context.documentId)
  const snapshot = await ref.get()
  if (!snapshot.exists || snapshot.data()?.agencyId !== agencyId) return
  await ref.set(patch, { merge: true })
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

  let payload: { to?: unknown; subject?: unknown; text?: unknown; html?: unknown; imageUrl?: unknown; brand?: unknown; cta?: unknown; type?: unknown; welcome?: unknown; templateId?: unknown; companyId?: unknown; projectId?: unknown; documentType?: unknown; documentId?: unknown; scheduledAt?: unknown }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return NextResponse.json({ error: "The email request could not be read." }, { status: 400 })
  }

  let recipients = (Array.isArray(payload.to) ? payload.to : [payload.to])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
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
  from = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_FROM", from))
  replyTo = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_REPLY_TO", replyTo)) || from
  if (!apiKey || !from) {
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

  const richHtml = requestedHtml.replace(/(src=["'])\/([^"']*)/gi, `$1${SITE_ORIGIN}/$2`)
  const messageContent = [
    richHtml || text.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`).join(""),
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

  async function sendOne(to: string[], unsubscribeEmail?: string) {
    const unsubscribeLink = unsubscribeEmail ? unsubscribeUrl(unsubscribeEmail) : ""
    const html = brandedEmail(messageContent, subject, payload.brand, from, payload.cta, unsubscribeLink)
    const brandedText = `${text}\n\n${ctaText}: ${ctaUrl}\n\n---\n${footerText}\nX: ${X_URL}\nLinkedIn: ${LINKEDIN_URL}${unsubscribeLink ? `\nUnsubscribe: ${unsubscribeLink}` : ""}`
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
        subject,
        text: brandedText,
        html,
        reply_to: replyTo,
        ...(scheduledAtIso ? { scheduled_at: scheduledAtIso } : {}),
        ...(unsubscribeLink
          ? { headers: { "List-Unsubscribe": `<${unsubscribeLink}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
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
    void recordAgencyUsage(agencyId, "emailsSent", sent.length).catch(() => undefined)
    return NextResponse.json({
      id: sent[0].id,
      ids: sent.map((item) => item.id),
      html: sent[0].html,
      text: sent[0].text,
      replyTo: replyTo || null,
      suppressedCount: suppressedRecipients.length,
      scheduledAt: scheduledAtIso || null,
      context,
    })
  }

  let attempt: Awaited<ReturnType<typeof sendOne>>
  try {
    attempt = await sendOne(recipients)
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
  if (welcomeClaim) {
    try { await completeWelcomeEmail(welcomeClaim) } catch { /* The claim expires and can be retried if persistence is temporarily unavailable. */ }
  }
  void recordAgencyUsage(agencyId, "emailsSent", recipients.length).catch(() => undefined)
  return NextResponse.json({ id: attempt.result.id, html: attempt.html, text: attempt.brandedText, replyTo: replyTo || null, scheduledAt: scheduledAtIso || null, context })
}
