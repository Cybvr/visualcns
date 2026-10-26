"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, ClipboardList, ExternalLink, FileSignature, FileText, Loader2, Maximize2, Minimize2, Pencil, Receipt, X } from "lucide-react"

import { CompanyDocumentView } from "@/components/dashboard/company-document-view"
import { ContractDocument } from "@/components/dashboard/contract-document"
import { EstimateDocument } from "@/components/dashboard/estimate-document"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { Button } from "@/components/ui/button"
import { getContract, getEstimate, getInvoice, type Contract, type Estimate, type Invoice } from "@/lib/billing"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { getCompanyDocument, type CompanyDocument } from "@/lib/company-documents"
import { cn } from "@/lib/utils"

export type ArtifactKind = "document" | "invoice" | "estimate" | "contract"

/** A document to open in the artifact pane, by kind and id. */
export type ArtifactRef = { kind: ArtifactKind; id: string; title?: string }

type ArtifactRecord =
  | { kind: "document"; record: CompanyDocument }
  | { kind: "invoice"; record: Invoice }
  | { kind: "estimate"; record: Estimate }
  | { kind: "contract"; record: Contract }

const KIND_META: Record<ArtifactKind, { label: string; icon: typeof FileText; color: string }> = {
  document: { label: "Document", icon: FileText, color: "text-blue-600 dark:text-blue-400" },
  invoice: { label: "Invoice", icon: Receipt, color: "text-emerald-600 dark:text-emerald-400" },
  estimate: { label: "Estimate", icon: ClipboardList, color: "text-amber-600 dark:text-amber-400" },
  contract: { label: "Contract", icon: FileSignature, color: "text-indigo-600 dark:text-indigo-400" },
}

export function artifactEditHref(artifact: ArtifactRef) {
  return `/dashboard/${artifact.kind}s/${encodeURIComponent(artifact.id)}/edit`
}

async function loadRecord(artifact: ArtifactRef): Promise<ArtifactRecord | null> {
  if (artifact.kind === "document") { const record = await getCompanyDocument(artifact.id); return record ? { kind: "document", record } : null }
  if (artifact.kind === "invoice") { const record = await getInvoice(artifact.id); return record ? { kind: "invoice", record } : null }
  if (artifact.kind === "estimate") { const record = await getEstimate(artifact.id); return record ? { kind: "estimate", record } : null }
  const record = await getContract(artifact.id)
  return record ? { kind: "contract", record } : null
}

function recordTitle(loaded: ArtifactRecord) {
  if (loaded.kind === "invoice") return loaded.record.title?.trim() || loaded.record.invoiceNumber || "Invoice"
  if (loaded.kind === "estimate") return loaded.record.title || loaded.record.estimateNumber || "Estimate"
  return loaded.record.title || KIND_META[loaded.kind].label
}

/** The small card Ngai shows for a document it made; clicking it opens the artifact pane. */
export function ArtifactCard({ artifact, active = false, onOpen }: { artifact: ArtifactRef; active?: boolean; onOpen: () => void }) {
  const meta = KIND_META[artifact.kind]
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={active}
      className={cn(
        "flex w-full max-w-sm items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary" : "border-border",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
        <Icon className={cn("size-5", meta.color)} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{artifact.title || meta.label}</span>
        <span className="block text-xs text-muted-foreground">{meta.label} · Click to open</span>
      </span>
    </button>
  )
}

/**
 * A document open beside whatever you were doing, like an artifact in Claude
 * or ChatGPT: a header with its name, Edit, open in full and close, then the
 * document itself, scrolling on its own. Pass `record` when the page already
 * has it; otherwise it is loaded by id.
 */
export function DocumentArtifact({
  artifact,
  record,
  issuer: givenIssuer,
  canEdit = false,
  fullHref,
  actions,
  onClose,
  className,
  layout = "pane",
}: {
  artifact: ArtifactRef
  record?: CompanyDocument | Invoice | Estimate | Contract
  issuer?: BusinessProfile | null
  canEdit?: boolean
  /** Where "Open in full" goes. Leave out to hide it. */
  fullHref?: string
  /** Extra buttons for the header, e.g. share or print. */
  actions?: ReactNode
  onClose: () => void
  className?: string
  layout?: "pane" | "page"
}) {
  const [loaded, setLoaded] = useState<ArtifactRecord | null>(record ? ({ kind: artifact.kind, record } as ArtifactRecord) : null)
  const [failed, setFailed] = useState(false)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(givenIssuer ?? null)
  // Expand fills the whole window with the document; Escape or the same button brings it back.
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [expanded])

  useEffect(() => {
    if (record) {
      setLoaded({ kind: artifact.kind, record } as ArtifactRecord)
      return
    }
    let active = true
    setLoaded(null)
    setFailed(false)
    loadRecord(artifact)
      .then((next) => { if (active) { setLoaded(next); setFailed(!next) } })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
    // Keyed by kind and id, so a new object for the same document doesn't reload it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifact.kind, artifact.id, record])

  const agencyId = loaded?.record.agencyId
  useEffect(() => {
    if (givenIssuer !== undefined) { setIssuer(givenIssuer); return }
    let active = true
    getBusinessProfile(agencyId || undefined)
      .then((profile) => { if (active) setIssuer(profile) })
      .catch(() => {
        // The document still shows, just without the issuer's details.
      })
    return () => { active = false }
  }, [agencyId, givenIssuer])

  const meta = KIND_META[artifact.kind]
  const Icon = meta.icon
  const title = loaded ? recordTitle(loaded) : artifact.title || meta.label
  const issuerProp = issuer ?? undefined
  const page = layout === "page"

  return (
    <section aria-label={title} className={cn(page ? "min-w-0" : "flex h-full min-h-0 flex-col overflow-hidden bg-card", className, !page && expanded && "fixed inset-0 z-[60] h-svh w-full border-0 md:w-full md:border-0")}>
      {page && (
        <Button type="button" variant="ghost" onClick={onClose} className="mb-2 -ml-3 gap-2 print:hidden">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Drive
        </Button>
      )}
      <header className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-border print:hidden", page ? "px-0" : "px-4")}>
        <Icon className={cn("size-5 shrink-0", meta.color)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{meta.label}</p>
        </div>
        {actions}
        {canEdit && (
          <Button asChild variant="ghost" size="icon" className="size-8" title={`Edit ${meta.label.toLowerCase()}`}>
            <Link href={artifactEditHref(artifact)} aria-label={`Edit ${meta.label.toLowerCase()}`}><Pencil className="size-4" aria-hidden="true" /></Link>
          </Button>
        )}
        {!page && <Button type="button" variant="ghost" size="icon" className="size-8 max-md:hidden" onClick={() => setExpanded((current) => !current)} aria-label={expanded ? "Exit full screen" : "Expand to full screen"} title={expanded ? "Exit full screen" : "Expand to full screen"}>
          {expanded ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
        </Button>}
        {!page && fullHref && (
          <Button asChild variant="ghost" size="icon" className="size-8" title="Open in full">
            <Link href={fullHref} aria-label="Open in full"><ExternalLink className="size-4" aria-hidden="true" /></Link>
          </Button>
        )}
        {!page && <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Close" title="Close">
          <X className="size-4" aria-hidden="true" />
        </Button>}
      </header>
      {/* Full screen keeps the page a readable width, centred. */}
      <div className={cn(page ? "min-w-0 py-5 sm:py-6" : "min-h-0 flex-1 overflow-auto p-4 sm:p-6", !page && expanded && "sm:px-[max(1.5rem,calc((100%-56rem)/2))]")}>
        {failed ? (
          <p className="py-10 text-center text-sm text-muted-foreground">This {meta.label.toLowerCase()} couldn&apos;t be opened. It may have been deleted, or you may not have access.</p>
        ) : !loaded ? (
          <div className="flex justify-center py-10" role="status" aria-label="Loading">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : loaded.kind === "document" ? (
          <CompanyDocumentView document={loaded.record} issuer={issuerProp} />
        ) : loaded.kind === "invoice" ? (
          <InvoiceDocument invoice={loaded.record} issuer={issuerProp} />
        ) : loaded.kind === "estimate" ? (
          <EstimateDocument estimate={loaded.record} issuer={issuerProp} />
        ) : (
          <ContractDocument contract={loaded.record} issuer={issuerProp} />
        )}
      </div>
    </section>
  )
}

