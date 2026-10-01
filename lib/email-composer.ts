export type EmailComposeContext = {
  companyId?: string
  companyName?: string
  recipientEmail?: string
  recipientName?: string
  projectId?: string
  projectName?: string
  documentType?: string
  documentId?: string
  documentTitle?: string
  subject?: string
  body?: string
  messageKind?: "transactional" | "marketing"
  ctaText?: string
  ctaUrl?: string
  /** Comma-separated addresses to copy. */
  cc?: string
  /** "reminder" records a payment reminder on the invoice instead of marking it sent. */
  intent?: "reminder"
}

const CONTEXT_KEYS = [
  "companyId", "companyName", "recipientEmail", "recipientName", "projectId", "projectName",
  "documentType", "documentId", "documentTitle", "subject", "body", "messageKind", "ctaText", "ctaUrl", "cc", "intent",
] as const

export function buildEmailComposeHref(context: EmailComposeContext) {
  const params = new URLSearchParams({ compose: "1" })
  for (const key of CONTEXT_KEYS) {
    const value = context[key]
    if (typeof value === "string" && value) params.set(key, value)
  }
  return `/dashboard/email?${params.toString()}`
}

export function readEmailComposeContext(params: URLSearchParams): EmailComposeContext | null {
  if (params.get("compose") !== "1") return null
  const context: EmailComposeContext = {}
  for (const key of CONTEXT_KEYS) {
    const value = params.get(key)
    if (!value) continue
    if (key === "messageKind") context.messageKind = value === "marketing" ? "marketing" : "transactional"
    else if (key === "intent") { if (value === "reminder") context.intent = "reminder" }
    else context[key] = value as never
  }
  return context
}

/** The live site, even when the email is written from localhost, so links in emails always work. */
export function siteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.visualcns.com"
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`
}

/**
 * The starting message for an email opened from a record. The link goes in the
 * text itself rather than a button, so the composer drops the button for these.
 */
export function contextualEmailBody(context: EmailComposeContext) {
  const recipient = context.recipientName?.trim().split(/\s+/)[0] || "there"
  const link = context.ctaUrl ? siteUrl(context.ctaUrl) : ""
  if (context.documentTitle) {
    return `Hi ${recipient},\n\n${context.documentTitle} is ready for you to review.${link ? `\n\nView it here: ${link}` : ""}\n\nBest regards,\nVisualCNS Team`
  }
  if (context.projectName) {
    return `Hi ${recipient},\n\nHere is an update on ${context.projectName}.${link ? `\n\nView the project here: ${link}` : ""}\n\nBest regards,\nVisualCNS Team`
  }
  return `Hi ${recipient},\n\n${link ? `Open your company page here: ${link}` : "Here is an update from VisualCNS."}\n\nBest regards,\nVisualCNS Team`
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/**
 * Plain text for the rich editor: blank lines become paragraphs, single line
 * breaks stay as breaks, and web addresses become links. Text that is already
 * HTML is returned as it is.
 */
export function plainTextToEditorHtml(text: string) {
  if (/<(p|div|br|a|ul|ol|h[1-6])[\s>/]/i.test(text)) return text
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const linked = escapeHtml(paragraph).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (url) => `<a href="${url}">${url}</a>`)
      return `<p>${linked.replace(/\n/g, "<br>")}</p>`
    })
    .join("")
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** "a@x.com, b@y.com; c@z.com" into clean, de-duplicated addresses, plus anything that isn't one. */
export function parseEmailList(value: string | string[] | undefined): { valid: string[]; invalid: string[] } {
  const parts = (Array.isArray(value) ? value : String(value || "").split(/[,;\s]+/))
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  const unique = [...new Set(parts)]
  return { valid: unique.filter((part) => EMAIL_PATTERN.test(part)), invalid: unique.filter((part) => !EMAIL_PATTERN.test(part)) }
}
