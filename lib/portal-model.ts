import type { Invoice } from "./billing"
import type { ProjectStatus } from "./projects"
import type { TaskStatus } from "./tasks"

export interface PortalProject {
  id: string
  agencyId?: string
  companyId: string
  title: string
  status: ProjectStatus
  progress: number
  dueDate: string
  thumbnailUrl: string
  summary: string
  isPublic?: boolean
  legacySlug?: string
}

export interface PortalTask {
  id: string
  agencyId?: string
  companyId: string
  projectId: string
  name: string
  status: TaskStatus
  dueDate: string
  instructions: string
  assigneeUid: string
  isPublic?: boolean
  /** Mirrored from the dashboard task so activity can be ordered consistently. */
  createdAt?: unknown
  updatedAt?: unknown
}

export const portalTabs = ["overview", "tasks", "documents", "billing"] as const
export type PortalTab = (typeof portalTabs)[number]
export type DocumentKind = "invoice" | "estimate" | "contract" | "document"
export const isDocumentKind = (value: string): value is DocumentKind => ["invoice", "estimate", "contract", "document"].includes(value)
/** Invoices, estimates and contracts sit under billing; written documents under their own tab. */
export const documentKindTab = (kind: DocumentKind): PortalTab => (kind === "document" ? "documents" : "billing")

export function portalPath(company: string) { return `/portal/${encodeURIComponent(company)}` }
export function portalDocumentPath(company: string, kind: DocumentKind, id: string) {
  return `${portalPath(company)}/documents/${kind}/${encodeURIComponent(id)}`
}

/** Only local app destinations, never protocols, backslashes or auth loops. */
export function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null
  let decoded: string
  try { decoded = decodeURIComponent(value) } catch { return null }
  if (/[\\\u0000-\u0020]/.test(decoded) || decoded.startsWith("//")) return null
  const url = new URL(value, "https://visualhq.invalid")
  const decodedUrl = new URL(decoded, "https://visualhq.invalid")
  if (url.origin !== "https://visualhq.invalid" || /^\/(login|signup)(\/|$)/.test(decodedUrl.pathname)) return null
  return `${url.pathname}${url.search}${url.hash}`
}

export function legacyCompanyDestination(company: string, search: string): string {
  const params = new URLSearchParams(search)
  const [kind, id] = (params.get("doc") || "").split(":")
  if (id && isDocumentKind(kind)) return portalDocumentPath(company, kind, id)
  const oldTab = params.get("tab")
  const tab = oldTab === "documents" || oldTab === "files" ? "documents" : oldTab
  const pageMap: Record<string, string> = {
    projects: "projects",
    contacts: "contacts",
    tasks: "tasks",
    documents: "documents",
    billing: "documents",
    media: "media",
    ngai: "ngai",
    account: "account",
  }
  const page = tab ? pageMap[tab] : undefined
  return page ? `${portalPath(company)}/${page}` : portalPath(company)
}

/** Retain existing ids and legacy project slugs until the scoped loader resolves them. */
export function legacyDashboardDestination(company: string, pathname: string, search = ""): string {
  const segments = pathname.split("/").filter(Boolean)
  const section = segments[1]
  const id = segments[2]
  const kind = section?.replace(/s$/, "")
  if (kind && isDocumentKind(kind) && id && id !== "new") return portalDocumentPath(company, kind, id)
  if (section === "projects" && id && id !== "new") {
    try { return `${portalPath(company)}/projects/${encodeURIComponent(decodeURIComponent(id))}` } catch { return portalPath(company) }
  }
  const routes: Record<string, string> = { tasks: "tasks", drive: "documents", documents: "documents", invoices: "documents", estimates: "documents", contracts: "documents", projects: "projects" }
  if (routes[section]) return `${portalPath(company)}/${routes[section]}`
  return legacyCompanyDestination(company, search)
}

export function safeExternalUrl(value?: string): string | null {
  if (!value) return null
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null } catch { return null }
}

export function invoiceBalance(invoice: Invoice): number {
  return invoice.status === "paid" || invoice.status === "void" ? 0 : Math.max(0, invoice.amount - (invoice.amountPaid || 0))
}

export function billingTotals(invoices: Invoice[]) {
  const totals = new Map<string, { currency: string; outstanding: number; overdue: number; paid: number }>()
  for (const invoice of invoices) {
    if (invoice.status === "draft" || invoice.status === "void") continue
    const currency = invoice.currency || "NGN"
    const row = totals.get(currency) || { currency, outstanding: 0, overdue: 0, paid: 0 }
    row.outstanding += invoiceBalance(invoice)
    row.overdue += invoice.status === "overdue" ? invoiceBalance(invoice) : 0
    row.paid += invoice.status === "paid" ? invoice.amount : (invoice.amountPaid || 0)
    totals.set(currency, row)
  }
  return [...totals.values()]
}
