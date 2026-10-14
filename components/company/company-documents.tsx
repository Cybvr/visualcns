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
}) {

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

  function menuFor(entry: Entry) {
    if (!onEdit) return undefined
    return <DropdownMenuItem onSelect={() => onEdit(entry.kind, entry.id)}>Edit {entry.kind}</DropdownMenuItem>
  }

  return (
    <CollectionView
      className="mt-4"
      items={entries}
      getKey={(entry) => entry.key}
      searchFields={(entry) => [entry.title, entry.kindLabel, entry.statusLabel, entry.amount]}
      searchPlaceholder={`Search ${heading.toLowerCase()}`}
      viewKey={`company-${heading.toLowerCase()}`}
      actions={canAdd && onAdd ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SectionAddButton label={heading === "Payments" ? "New invoice, estimate or contract" : "New document"} disabled={uploading} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onUpload && <DropdownMenuItem onSelect={onUpload}>Upload files</DropdownMenuItem>}
            {addKinds.includes("document") && <DropdownMenuItem onSelect={() => onAdd("document")}>Document</DropdownMenuItem>}
            {addKinds.includes("invoice") && <DropdownMenuItem onSelect={() => onAdd("invoice")}>Invoice</DropdownMenuItem>}
            {addKinds.includes("contract") && <DropdownMenuItem onSelect={() => onAdd("contract")}>Contract</DropdownMenuItem>}
            {addKinds.includes("estimate") && <DropdownMenuItem onSelect={() => onAdd("estimate")}>Estimate / quote</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : undefined}
      empty={{
        icon: FileText,
        title: heading === "Drive" ? "Nothing in Drive yet" : `No ${heading.toLowerCase()} yet`,
        description: emptyDescription,
      }}
      card={(entry) => ({
        icon: <span className="flex [&_svg]:size-4">{entry.icon}</span>,
        title: entry.title,
        subtitle: `${entry.kindLabel} · ${entry.statusLabel}`,
        preview: (
          <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center">
            <span className="flex [&_svg]:size-10">{entry.icon}</span>
            {entry.amount && <p className="text-lg font-semibold tabular-nums tracking-[-0.02em] text-foreground">{entry.amount}</p>}
          </div>
        ),
        onClick: () => onSelect(entry.kind, entry.id),
        ariaLabel: `Open ${entry.title}`,
        menuLabel: `Options for ${entry.title}`,
        menu: menuFor(entry),
      })}
      row={(entry) => ({ subtitle: `${entry.kindLabel} · ${entry.statusLabel}`, trailing: entry.amount })}
      cardsAfter={media}
      hasExtraCards={mediaCount > 0}
    />
  )
}
