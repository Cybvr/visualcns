import type { ComponentType, ReactNode } from "react"
import { ClipboardList, FileSignature, FileText, Receipt } from "lucide-react"
import { toast } from "sonner"

import {
  contractStatusMeta,
  createContract,
  createEstimate,
  createInvoice,
  deleteContract,
  deleteEstimate,
  deleteInvoice,
  estimateStatusMeta,
  formatMoney,
  invoiceStatusMeta,
  nextEstimateNumber,
  nextInvoiceNumber,
  updateContract,
  updateEstimate,
  updateInvoice,
  type Contract,
  type Estimate,
  type Invoice,
} from "@/lib/billing"
import {
  companyDocumentKindMeta,
  companyDocumentStatusMeta,
  createCompanyDocument,
  deleteCompanyDocument,
  updateCompanyDocument,
  type CompanyDocument,
} from "@/lib/company-documents"
import { CollectionView, type CollectionItemActions } from "@/components/dashboard/collection-view"
import { thumbnailIcon } from "@/components/dashboard/grid-card"
import { SectionAddButton } from "@/components/company/section-add-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export type CompanyDocumentKind = "invoice" | "contract" | "estimate" | "document"

type Entry = {
  key: string
  title: string
  kindLabel: string
  statusLabel: string
  amount?: string
  icon: ReactNode
  /** The big icon for its thumbnail. */
  thumbnail: ComponentType<{ className?: string }>
  /** When it was last changed, for sorting and the date on its card and row. */
  updatedMs: number
  searchText?: string[]
  actions: CollectionItemActions
}

/** Something else kept with the documents, like a note, with its own menu actions. */
export type ExtraDocumentEntry = Entry

function modifiedMs(row: { createdAt?: { toMillis(): number }; updatedAt?: { toMillis(): number } }) {
  return Math.max(row.updatedAt?.toMillis() ?? 0, row.createdAt?.toMillis() ?? 0)
}

/** Runs a change from the menu, says so if it fails, then lets the page reload. */
async function run(change: () => Promise<unknown>, failure: string, onChanged?: () => void | Promise<void>) {
  try {
    await change()
    await onChanged?.()
  } catch (error) {
    console.error(failure, error)
    toast.error(failure)
  }
}

// Copies stay with the same client and campaign and start as drafts, the same as on the dashboard pages.
function strip<T extends { id: string; createdAt?: unknown; updatedAt?: unknown }>(row: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = row
  return rest
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
  extraEntries = [],
  extraAddItems,
  canManage = false,
  onChanged,
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
  /** Shown in the same list as the documents. */
  extraEntries?: ExtraDocumentEntry[]
  /** More entries for the New menu, offered even to people who can't add documents. */
  extraAddItems?: ReactNode
  /** Offers Rename, Duplicate and Delete on each document. */
  canManage?: boolean
  /** Called after a rename, copy or delete, so the page can reload. */
  onChanged?: () => void | Promise<void>
}) {
  const manage = <T,>(fn: T) => (canManage ? fn : undefined)
  const editItem = (kind: CompanyDocumentKind, id: string) => (onEdit ? <DropdownMenuItem onSelect={() => onEdit(kind, id)}>Edit {kind}</DropdownMenuItem> : undefined)

  const entries: Entry[] = [
    ...documents.map((document): Entry => ({
      key: `document-${document.id}`,
      updatedMs: modifiedMs(document),
      title: document.title || "Document",
      kindLabel: companyDocumentKindMeta[document.kind]?.label ?? "Document",
      statusLabel: (companyDocumentStatusMeta[document.status] ?? companyDocumentStatusMeta.draft).label,
      icon: <FileText className="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />,
      thumbnail: FileText,
      actions: {
        noun: "document",
        name: document.title || "Document",
        onOpen: () => onSelect("document", document.id),
        onRename: manage((title: string) => run(() => updateCompanyDocument(document.id, { title }), "Couldn't rename the document.", onChanged)),
        onDuplicate: manage(() => run(() => createCompanyDocument({ ...strip(document), title: `${document.title || "Document"} (Copy)`, status: "draft", shareEnabled: false }), "Couldn't duplicate the document.", onChanged)),
        extra: editItem("document", document.id),
        onDelete: manage(() => run(() => deleteCompanyDocument(document.id), "Couldn't delete the document.", onChanged)),
      },
    })),
    ...invoices.map((invoice): Entry => ({
      key: `invoice-${invoice.id}`,
      updatedMs: modifiedMs(invoice),
      title: invoice.title?.trim() || invoice.invoiceNumber || "Invoice",
      kindLabel: "Invoice",
      statusLabel: invoiceStatusMeta[invoice.status].label,
      amount: formatMoney(invoice.amount, invoice.currency),
      icon: <Receipt className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />,
      thumbnail: Receipt,
      actions: {
        noun: "invoice",
        name: invoice.title?.trim() || invoice.invoiceNumber || "Invoice",
        onOpen: () => onSelect("invoice", invoice.id),
        onRename: manage((title: string) => run(() => updateInvoice(invoice.id, { title }), "Couldn't rename the invoice.", onChanged)),
        onDuplicate: manage(() => run(async () => createInvoice({ ...strip(invoice), invoiceNumber: await nextInvoiceNumber(), status: "draft", shareEnabled: false }), "Couldn't duplicate the invoice.", onChanged)),
        extra: editItem("invoice", invoice.id),
        onDelete: manage(() => run(() => deleteInvoice(invoice.id), "Couldn't delete the invoice.", onChanged)),
      },
    })),
    ...contracts.map((contract): Entry => ({
      key: `contract-${contract.id}`,
      updatedMs: modifiedMs(contract),
      title: contract.title || "Contract",
      kindLabel: "Contract",
      statusLabel: contractStatusMeta[contract.status].label,
      icon: <FileSignature className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />,
      thumbnail: FileSignature,
      actions: {
        noun: "contract",
        name: contract.title || "Contract",
        onOpen: () => onSelect("contract", contract.id),
        onRename: manage((title: string) => run(() => updateContract(contract.id, { title }), "Couldn't rename the contract.", onChanged)),
        onDuplicate: manage(() => run(() => createContract({ ...strip(contract), title: `${contract.title} (Copy)`, status: "draft", signedOn: "", shareEnabled: false }), "Couldn't duplicate the contract.", onChanged)),
        extra: editItem("contract", contract.id),
        onDelete: manage(() => run(() => deleteContract(contract.id), "Couldn't delete the contract.", onChanged)),
      },
    })),
    ...estimates.map((estimate): Entry => ({
      key: `estimate-${estimate.id}`,
      updatedMs: modifiedMs(estimate),
      title: estimate.estimateNumber || estimate.title || "Estimate",
      kindLabel: "Estimate",
      statusLabel: estimateStatusMeta[estimate.status].label,
      amount: formatMoney(estimate.amount, estimate.currency),
      icon: <ClipboardList className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
      thumbnail: ClipboardList,
      actions: {
        noun: "estimate",
        name: estimate.title || estimate.estimateNumber || "Estimate",
        onOpen: () => onSelect("estimate", estimate.id),
        onRename: manage((title: string) => run(() => updateEstimate(estimate.id, { title }), "Couldn't rename the estimate.", onChanged)),
        onDuplicate: manage(() => run(async () => createEstimate({ ...strip(estimate), estimateNumber: await nextEstimateNumber(), status: "draft", shareEnabled: false }), "Couldn't duplicate the estimate.", onChanged)),
        extra: editItem("estimate", estimate.id),
        onDelete: manage(() => run(() => deleteEstimate(estimate.id), "Couldn't delete the estimate.", onChanged)),
      },
    })),
    ...extraEntries,
  ].sort((a, b) => b.updatedMs - a.updatedMs)

  const canAddDocuments = canAdd && Boolean(onAdd)

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
      date={(entry) => entry.updatedMs}
      itemActions={(entry) => entry.actions}
      card={(entry) => ({
        icon: <span className="flex [&_svg]:size-4">{entry.icon}</span>,
        title: entry.title,
        placeholder: thumbnailIcon(entry.thumbnail),
        onClick: () => entry.actions.onOpen?.(),
        ariaLabel: `Open ${entry.title}`,
        menuLabel: `Options for ${entry.title}`,
      })}
      // The amount goes with the kind and status, so the right side is always the date.
      row={(entry) => ({ subtitle: [entry.kindLabel, entry.statusLabel, entry.amount].filter(Boolean).join(" · ") })}
      cardsAfter={media}
      hasExtraCards={mediaCount > 0}
    />
  )
}
