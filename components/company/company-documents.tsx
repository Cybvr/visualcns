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
import { CollectionView } from "@/components/dashboard/collection-view"
import { SectionAddButton } from "@/components/company/section-add-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export type CompanyDocumentKind = "invoice" | "contract" | "estimate" | "document"

type Entry = {
  key: string
  kind?: CompanyDocumentKind
  id?: string
  title: string
  kindLabel: string
  statusLabel: string
  amount?: string
  icon: ReactNode
  /** When it was last changed, for sorting and the card's date line. */
  updatedMs: number
  searchText?: string[]
  onOpen?: () => void
  menu?: ReactNode
}

function modifiedMs(row: { createdAt?: { toMillis(): number }; updatedAt?: { toMillis(): number } }) {
  return Math.max(row.updatedAt?.toMillis() ?? 0, row.createdAt?.toMillis() ?? 0)
}

/** "Updated 3:40 PM" today, "Updated 12 Oct" before that. */
export function lastUpdated(ms: number) {
  if (!ms) return "No date"
  const date = new Date(ms)
  const sameDay = date.toDateString() === new Date().toDateString()
  return `Updated ${sameDay ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
}

/** Something else kept with the documents, like a note, that opens and has a menu of its own. */
export type ExtraDocumentEntry = Omit<Entry, "kind" | "id" | "amount"> & { onOpen: () => void; menu: ReactNode }

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
  extraEntries = [],
  extraAddItems,
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
  /** Shown in the same list, after the documents. */
  extraEntries?: ExtraDocumentEntry[]
  /** More entries for the New menu, offered even to people who can't add documents. */
  extraAddItems?: ReactNode
}) {

  const entries: Entry[] = [
    ...documents.map((document) => ({
      key: `document-${document.id}`,
      updatedMs: modifiedMs(document),
      kind: "document" as const,
      id: document.id,
      title: document.title || "Document",
      kindLabel: companyDocumentKindMeta[document.kind]?.label ?? "Document",
      statusLabel: (companyDocumentStatusMeta[document.status] ?? companyDocumentStatusMeta.draft).label,
      icon: <FileText className="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />,
    })),
    ...invoices.map((invoice) => ({
      key: `invoice-${invoice.id}`,
      updatedMs: modifiedMs(invoice),
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
      updatedMs: modifiedMs(contract),
      kind: "contract" as const,
      id: contract.id,
      title: contract.title || "Contract",
      kindLabel: "Contract",
      statusLabel: contractStatusMeta[contract.status].label,
      icon: <FileSignature className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />,
    })),
    ...estimates.map((estimate) => ({
      key: `estimate-${estimate.id}`,
      updatedMs: modifiedMs(estimate),
      kind: "estimate" as const,
      id: estimate.id,
      title: estimate.estimateNumber || estimate.title || "Estimate",
      kindLabel: "Estimate",
      statusLabel: estimateStatusMeta[estimate.status].label,
      amount: formatMoney(estimate.amount, estimate.currency),
      icon: <ClipboardList className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
    })),
    ...extraEntries,
  ].sort((a, b) => b.updatedMs - a.updatedMs)

  const open = (entry: Entry) => {
    if (entry.onOpen) entry.onOpen()
    else if (entry.kind && entry.id) onSelect(entry.kind, entry.id)
  }
  const canAddDocuments = canAdd && Boolean(onAdd)

  function menuFor(entry: Entry) {
    if (entry.menu || !entry.kind || !entry.id) return entry.menu
    const { kind, id } = entry
    return (
      <>
        <DropdownMenuItem onSelect={() => onSelect(kind, id)}>Open {kind}</DropdownMenuItem>
        {onEdit && <DropdownMenuItem onSelect={() => onEdit(kind, id)}>Edit {kind}</DropdownMenuItem>}
      </>
    )
  }

  return (
    <CollectionView
      className="mt-4"
      items={entries}
      getKey={(entry) => entry.key}
      searchFields={(entry) => [entry.title, entry.kindLabel, entry.statusLabel, entry.amount, ...(entry.searchText ?? [])]}
      searchPlaceholder={`Search ${heading.toLowerCase()}`}
      viewKey={`company-${heading.toLowerCase()}`}
      actions={canAddDocuments || extraAddItems ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SectionAddButton label="New document" disabled={uploading} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canAddDocuments && onAdd && (
              <>
                {onUpload && <DropdownMenuItem onSelect={onUpload}>Upload files</DropdownMenuItem>}
                {addKinds.includes("document") && <DropdownMenuItem onSelect={() => onAdd("document")}>Document</DropdownMenuItem>}
                {addKinds.includes("invoice") && <DropdownMenuItem onSelect={() => onAdd("invoice")}>Invoice</DropdownMenuItem>}
                {addKinds.includes("contract") && <DropdownMenuItem onSelect={() => onAdd("contract")}>Contract</DropdownMenuItem>}
                {addKinds.includes("estimate") && <DropdownMenuItem onSelect={() => onAdd("estimate")}>Estimate / quote</DropdownMenuItem>}
              </>
            )}
            {extraAddItems}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : undefined}
      empty={{
        icon: FileText,
        title: `No ${heading.toLowerCase()} yet`,
        description: emptyDescription,
      }}
      card={(entry) => ({
        icon: <span className="flex [&_svg]:size-4">{entry.icon}</span>,
        title: entry.title,
        subtitle: lastUpdated(entry.updatedMs),
        preview: (
          <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center">
            <span className="flex [&_svg]:size-10">{entry.icon}</span>
            {entry.amount && <p className="text-lg font-semibold tabular-nums tracking-[-0.02em] text-foreground">{entry.amount}</p>}
          </div>
        ),
        onClick: () => open(entry),
        ariaLabel: `Open ${entry.title}`,
        menuLabel: `Options for ${entry.title}`,
        menu: menuFor(entry),
      })}
      row={(entry) => ({ subtitle: `${entry.kindLabel} · ${entry.statusLabel}`, trailing: entry.amount ?? lastUpdated(entry.updatedMs) })}
      cardsAfter={media}
      hasExtraCards={mediaCount > 0}
    />
  )
}
