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

export function contextualEmailBody(context: EmailComposeContext) {
  const recipient = context.recipientName || "there"
  if (context.documentTitle) {
    return `Hi ${recipient},\n\n${context.documentTitle} is ready for you to review. Please use the button below to open it from your company page.\n\nBest regards,\nVisualCNS Team`
  }
  if (context.projectName) {
    return `Hi ${recipient},\n\nHere is an update on ${context.projectName}. Please use the button below to open the project workspace from your company page.\n\nBest regards,\nVisualCNS Team`
  }
  return `Hi ${recipient},\n\nPlease use the button below to open your company page.\n\nBest regards,\nVisualCNS Team`
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
