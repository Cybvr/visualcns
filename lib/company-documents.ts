import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentTenantId } from "./tenancy"

export type CompanyDocumentStatus = "draft" | "sent" | "viewed" | "final"
export type CompanyDocumentKind = "proposal" | "sow" | "brief" | "report" | "other"

/**
 * A written document sent to a company: a proposal, a statement of work, a
 * brief. It sits alongside invoices, estimates and contracts rather than
 * inside them, because the body is free prose and nothing here is priced.
 *
 * Not to be confused with `SharedDocument` in lib/documents.ts, which is the
 * drive's uploaded files and external links.
 */
export interface CompanyDocument {
  id: string
  tenantId?: string
  companyId: string
  client: string
  title: string
  kind: CompanyDocumentKind
  projectId?: string
  project?: string
  status: CompanyDocumentStatus
  /** The document itself, as HTML from the rich text editor. */
  body?: string
  /** A short line shown under the title in lists and in the portal. */
  summary?: string
  /** Readable without an account at /share/documents/{id} once turned on. */
  shareEnabled?: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export const companyDocumentStatusMeta: Record<CompanyDocumentStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  viewed: { label: "Viewed", className: "bg-amber-100 text-amber-700" },
  final: { label: "Final", className: "bg-emerald-100 text-emerald-700" },
}

export const companyDocumentKindMeta: Record<CompanyDocumentKind, { label: string }> = {
  proposal: { label: "Proposal" },
  sow: { label: "Statement of work" },
  brief: { label: "Brief" },
  report: { label: "Report" },
  other: { label: "Document" },
}

/** Starter bodies, so a new document opens with its sections already in place. */
export const COMPANY_DOCUMENT_TEMPLATES: { id: string; label: string; description: string; kind: CompanyDocumentKind; title: string; body: string }[] = [
  {
    id: "proposal",
    label: "Proposal",
    description: "The problem, what you'll do about it, and what it costs.",
    kind: "proposal",
    title: "Proposal",
    body: "<h2>The opportunity</h2><p></p><h2>What we propose</h2><p></p><h2>How we'll work</h2><p></p><h2>Timeline</h2><p></p><h2>Investment</h2><p></p><h2>Next steps</h2><p></p>",
  },
  {
    id: "sow",
    label: "Statement of work",
    description: "Scope, deliverables, milestones and what sits outside them.",
    kind: "sow",
    title: "Statement of work",
    body: "<h2>Scope</h2><p></p><h2>Deliverables</h2><ul><li></li></ul><h2>Milestones</h2><p></p><h2>Out of scope</h2><p></p><h2>Assumptions</h2><p></p>",
  },
  {
    id: "brief",
    label: "Creative brief",
    description: "Audience, message and the thing being made.",
    kind: "brief",
    title: "Creative brief",
    body: "<h2>Background</h2><p></p><h2>Audience</h2><p></p><h2>Message</h2><p></p><h2>Deliverables</h2><ul><li></li></ul><h2>Mandatories</h2><p></p>",
  },
  {
    id: "report",
    label: "Report",
    description: "What happened over the period and what it means.",
    kind: "report",
    title: "Report",
    body: "<h2>Summary</h2><p></p><h2>What we did</h2><p></p><h2>Results</h2><p></p><h2>What we'd change</h2><p></p>",
  },
  {
    id: "blank",
    label: "Blank document",
    description: "Start with an empty page.",
    kind: "other",
    title: "",
    body: "",
  },
]

const COMPANY_DOCUMENTS = "companyDocuments"

function byNewest(rows: CompanyDocument[]): CompanyDocument[] {
  return rows.sort((a, b) => (b.updatedAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0))
}

function toDocument(id: string, data: object): CompanyDocument {
  return { ...data, id } as CompanyDocument
}

export async function getCompanyDocuments(): Promise<CompanyDocument[]> {
  const snapshot = await getDocs(query(collection(db, COMPANY_DOCUMENTS), where("tenantId", "==", await getCurrentTenantId())))
  return byNewest(snapshot.docs.map((d) => toDocument(d.id, d.data() as object)))
}

/** Drafts stay internal, so a company only ever sees what has actually been sent. */
export async function getCompanyDocumentsByCompanyId(companyId: string, includeDrafts = false): Promise<CompanyDocument[]> {
  if (!companyId) return []
  const snapshot = await getDocs(includeDrafts
    ? query(collection(db, COMPANY_DOCUMENTS), where("tenantId", "==", await getCurrentTenantId()), where("companyId", "==", companyId))
    : query(collection(db, COMPANY_DOCUMENTS), where("tenantId", "==", await getCurrentTenantId()), where("companyId", "==", companyId), where("status", "!=", "draft")))
  const rows = snapshot.docs.map((d) => toDocument(d.id, d.data() as object))
  return byNewest(includeDrafts ? rows : rows.filter((row) => row.status !== "draft"))
}

/** What a signed-in client sees in their portal: the documents turned public, drafts included. */
export async function getPublicCompanyDocumentsByCompanyId(companyId: string): Promise<CompanyDocument[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COMPANY_DOCUMENTS), where("tenantId", "==", await getCurrentTenantId()), where("companyId", "==", companyId), where("shareEnabled", "==", true)))
  return byNewest(snapshot.docs.map((d) => toDocument(d.id, d.data() as object)))
}

export async function getCompanyDocument(id: string): Promise<CompanyDocument | null> {
  const snapshot = await getDoc(doc(db, COMPANY_DOCUMENTS, id))
  if (!snapshot.exists()) return null
  return toDocument(snapshot.id, snapshot.data() as object)
}

export async function createCompanyDocument(data: Omit<CompanyDocument, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const tenantId = await getCurrentTenantId()
  const ref = await addDoc(collection(db, COMPANY_DOCUMENTS), {
    ...data,
    tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return ref.id
}

export async function updateCompanyDocument(id: string, data: Partial<Omit<CompanyDocument, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, COMPANY_DOCUMENTS, id), { ...data, updatedAt: Timestamp.now() })
}

export async function deleteCompanyDocument(id: string): Promise<void> {
  await deleteDoc(doc(db, COMPANY_DOCUMENTS, id))
}

/** Plain text length, so an editor holding only an empty paragraph counts as empty. */
export function documentTextLength(body?: string): number {
  return (body ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim().length
}
