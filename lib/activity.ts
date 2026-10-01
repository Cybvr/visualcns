import {
  formatMoney,
  getContractsByCompanyId,
  getEstimatesByCompanyId,
  getInvoicesByCompanyId,
  type Contract,
  type Estimate,
  type Invoice,
} from "./billing"
import type { CompanyDocument } from "./company-documents"
import type { SharedDocument } from "./documents"
import { getProjectsByCompanyId } from "./projects"
import { getTasksByCompanyId, tsToMillis, type Task } from "./tasks"

export type ActivityKind = "project" | "task" | "invoice" | "estimate" | "contract" | "document" | "file"

export interface ActivityItem {
  /** Stable list key, e.g. "invoice:abc123". */
  id: string
  kind: ActivityKind
  /** Firestore id of the underlying record, for building links. */
  refId: string
  title: string
  subtitle: string
  /** Epoch millis the record was created; drives ordering. */
  at: number
}

export interface ActivitySources {
  projects?: { id: string; title: string; createdAt?: unknown }[]
  tasks?: Task[]
  invoices?: Invoice[]
  estimates?: Estimate[]
  contracts?: Contract[]
  documents?: CompanyDocument[]
  files?: SharedDocument[]
}

/**
 * Fold whatever records the caller has to hand into one newest-first feed. Pure
 * and timestamp-driven, so it works off already-loaded data with no extra reads
 * (the client portal) or off a fresh fetch (the agency home). Records without a
 * usable createdAt are dropped rather than pinned to the epoch.
 */
export function buildActivity(sources: ActivitySources, limit = 12): ActivityItem[] {
  const items: ActivityItem[] = []
  for (const p of sources.projects ?? []) items.push({ id: `project:${p.id}`, kind: "project", refId: p.id, title: p.title, subtitle: "Project created", at: tsToMillis(p.createdAt) })
  for (const t of sources.tasks ?? []) {
    const createdAt = tsToMillis(t.createdAt)
    const updatedAt = tsToMillis(t.updatedAt)
    const action = t.status === "done" ? "Task completed" : updatedAt > createdAt ? "Task updated" : "Task created"
    items.push({ id: `task:${t.id}`, kind: "task", refId: t.id, title: t.name, subtitle: t.project ? `${action} · ${t.project}` : action, at: Math.max(createdAt, updatedAt) })
  }
  for (const inv of sources.invoices ?? []) items.push({ id: `invoice:${inv.id}`, kind: "invoice", refId: inv.id, title: `Invoice ${inv.invoiceNumber}`, subtitle: `${formatMoney(inv.amount, inv.currency)} · ${inv.status}`, at: tsToMillis(inv.createdAt) })
  for (const est of sources.estimates ?? []) items.push({ id: `estimate:${est.id}`, kind: "estimate", refId: est.id, title: est.title || `Estimate ${est.estimateNumber}`, subtitle: `${formatMoney(est.amount, est.currency)} · ${est.status}`, at: tsToMillis(est.createdAt) })
  for (const c of sources.contracts ?? []) items.push({ id: `contract:${c.id}`, kind: "contract", refId: c.id, title: c.title, subtitle: `Contract · ${c.status}`, at: tsToMillis(c.createdAt) })
  for (const d of sources.documents ?? []) items.push({ id: `document:${d.id}`, kind: "document", refId: d.id, title: d.title, subtitle: "Document shared", at: tsToMillis(d.createdAt) })
  for (const f of sources.files ?? []) items.push({ id: `file:${f.id}`, kind: "file", refId: f.id, title: f.title, subtitle: "File added", at: tsToMillis(f.createdAt) })
  return items.filter((item) => item.at > 0).sort((a, b) => b.at - a.at).slice(0, limit)
}

/** The agency-side feed: everything for a company, drafts included. */
export async function getCompanyActivity(companyId: string, limit = 12): Promise<ActivityItem[]> {
  if (!companyId) return []
  const [projects, tasks, invoices, estimates, contracts] = await Promise.all([
    getProjectsByCompanyId(companyId),
    getTasksByCompanyId(companyId),
    getInvoicesByCompanyId(companyId, true),
    getEstimatesByCompanyId(companyId, true),
    getContractsByCompanyId(companyId, true),
  ])
  return buildActivity({ projects, tasks, invoices, estimates, contracts }, limit)
}
