import type { ReactNode } from "react"
import { ClipboardList, FileSignature, FileText, Receipt } from "lucide-react"

import {
  contractStatusMeta,
  estimateStatusMeta,
  formatMoney,
  invoiceStatusMeta,
  type Contract,
  type Estimate,
  type Invoice,
} from "@/lib/billing"
import { companyDocumentKindMeta, companyDocumentStatusMeta, type CompanyDocument } from "@/lib/company-documents"
import { CompanyEmptyState } from "@/components/company/empty-state"
import { ListSearch, useListSearch } from "@/components/dashboard/list-search"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { SectionAddButton } from "@/components/company/section-add-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export type CompanyDocumentKind = "invoice" | "contract" | "estimate" | "document"

type Entry = {
  key: string
  kind: CompanyDocumentKind
  id: string
  title: string
  kindLabel: string
  statusLabel: string
  amount?: string
  icon: ReactNode
}

export function CompanyDocuments({
  invoices,
  contracts,
  estimates,
  documents,
  onSelect,
  onEdit,
  canAdd = false,
  onAdd,
  heading = "Documents",
  addKinds = ["document", "invoice", "contract", "estimate"],
  emptyDescription = "Proposals, invoices and contracts will appear here.",
  media,
  mediaCount = 0,
  onUpload,
  uploading = false,
  hideHeading = false,
  layout = "grid",
}: {
  invoices: Invoice[]
  contracts: Contract[]
  estimates: Estimate[]
  documents: CompanyDocument[]
  onSelect: (kind: CompanyDocumentKind, id: string) => void
  onEdit?: (kind: CompanyDocumentKind, id: string) => void
  canAdd?: boolean
  onAdd?: (kind: CompanyDocumentKind) => void
  heading?: string
  /** Which kinds the add menu offers. */
  addKinds?: CompanyDocumentKind[]
  emptyDescription?: string
  /** Image and video tiles for the same grid as the documents, filtered by the search text. */
  media?: (query: string) => ReactNode
  mediaCount?: number
  /** Adds an "Upload files" entry to the add menu. */
  onUpload?: () => void
  uploading?: boolean
  /** Hides the visible label when the page already titles itself. */
  hideHeading?: boolean
  /** "rows" is the searchable list the email page uses. */
  layout?: "grid" | "rows"
}) {
  const count = invoices.length + contracts.length + estimates.length + documents.length + mediaCount

  const entries: Entry[] = [
    ...documents.map((document) => ({
      key: `document-${document.id}`,
      kind: "document" as const,
      id: document.id,
      title: document.title || "Document",
      kindLabel: companyDocumentKindMeta[document.kind]?.label ?? "Document",
      statusLabel: (companyDocumentStatusMeta[document.status] ?? companyDocumentStatusMeta.draft).label,
      icon: <FileText className="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />,
    })),
    ...invoices.map((invoice) => ({
      key: `invoice-${invoice.id}`,
      kind: "invoice" as const,
      id: invoice.id,
      title: invoice.title?.trim() || invoice.invoiceNumber || "Invoice",
      kindLabel: "Invoice",
      statusLabel: invoiceStatusMeta[invoice.status].label,
      amount: formatMoney(invoice.amount, invoice.currency),
      icon: <Receipt className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />,
    })),
    ...contracts.map((contract) => ({
      key: `contract-${contract.id}`,
      kind: "contract" as const,
      id: contract.id,
      title: contract.title || "Contract",
      kindLabel: "Contract",
      statusLabel: contractStatusMeta[contract.status].label,
      icon: <FileSignature className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />,
    })),
    ...estimates.map((estimate) => ({
      key: `estimate-${estimate.id}`,
      kind: "estimate" as const,
      id: estimate.id,
      title: estimate.estimateNumber || estimate.title || "Estimate",
      kindLabel: "Estimate",
      statusLabel: estimateStatusMeta[estimate.status].label,
      amount: formatMoney(estimate.amount, estimate.currency),
      icon: <ClipboardList className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
    })),
  ]

  const { query, setQuery, results } = useListSearch(entries, (entry) => [entry.title, entry.kindLabel, entry.statusLabel, entry.amount])

  function menuFor(entry: Entry) {
    return (
      <>
        <DropdownMenuItem onSelect={() => onSelect(entry.kind, entry.id)}>Open {entry.kind}</DropdownMenuItem>
        {onEdit && <DropdownMenuItem onSelect={() => onEdit(entry.kind, entry.id)}>Edit {entry.kind}</DropdownMenuItem>}
      </>
    )
  }

  return (
    <section className="mt-4" aria-labelledby="company-documents-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="company-documents-heading" className="sr-only">{heading}</h2>
        {layout === "rows" || hideHeading ? (
          <ListSearch value={query} onChange={setQuery} placeholder={`Search ${heading.toLowerCase()}`} className="max-w-sm flex-1" />
        ) : <span className="sidebar-nav-label text-muted-foreground">{heading}</span>}
        {canAdd && onAdd && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SectionAddButton label={onUpload ? "Add to Drive" : "Add document"} disabled={uploading} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onUpload && <DropdownMenuItem onSelect={onUpload}>Upload files</DropdownMenuItem>}
              {addKinds.includes("document") && <DropdownMenuItem onSelect={() => onAdd("document")}>Document</DropdownMenuItem>}
              {addKinds.includes("invoice") && <DropdownMenuItem onSelect={() => onAdd("invoice")}>Invoice</DropdownMenuItem>}
              {addKinds.includes("contract") && <DropdownMenuItem onSelect={() => onAdd("contract")}>Contract</DropdownMenuItem>}
              {addKinds.includes("estimate") && <DropdownMenuItem onSelect={() => onAdd("estimate")}>Estimate / quote</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {count === 0 ? (
        <CompanyEmptyState
          icon={FileText}
          title={heading === "Drive" ? "Nothing in Drive yet" : `No ${heading.toLowerCase()} yet`}
          description={emptyDescription}
        />
      ) : layout === "rows" ? (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches your search.</p>
          ) : results.map((entry) => (
            <MobileDataCard
              key={entry.key}
              surface="list"
              variant="inline"
              iconShape="circle"
              title={entry.title}
              subtitle={`${entry.kindLabel} · ${entry.statusLabel}`}
              icon={entry.icon}
              trailing={entry.amount}
              onClick={() => onSelect(entry.kind, entry.id)}
              ariaLabel={`Open ${entry.title}`}
              menuLabel={`Options for ${entry.title}`}
              menu={menuFor(entry)}
            />
          ))}
        </div>
      ) : (
        <div className={`mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4 ${mediaCount > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
          {results.map((entry) => (
            <MobileDataCard
              key={entry.key}
              title={entry.title}
              subtitle={entry.amount ? `${entry.amount} · ${entry.statusLabel}` : `${entry.kindLabel} · ${entry.statusLabel}`}
              ariaLabel={`Open ${entry.title}`}
              icon={entry.icon}
              menuLabel={`Options for ${entry.title}`}
              menu={menuFor(entry)}
              onClick={() => onSelect(entry.kind, entry.id)}
            />
          ))}

          {media?.(query)}
          {query.trim() && results.length === 0 && mediaCount === 0 && (
            <p className="col-span-full px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches your search.</p>
          )}
        </div>
      )}
    </section>
  )
}
