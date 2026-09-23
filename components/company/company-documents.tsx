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
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { SectionAddButton } from "@/components/company/section-add-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export type CompanyDocumentKind = "invoice" | "contract" | "estimate" | "document"

export function CompanyDocuments({
  invoices,
  contracts,
  estimates,
  documents,
  onSelect,
  canAdd = false,
  onAdd,
}: {
  invoices: Invoice[]
  contracts: Contract[]
  estimates: Estimate[]
  documents: CompanyDocument[]
  onSelect: (kind: CompanyDocumentKind, id: string) => void
  canAdd?: boolean
  onAdd?: (kind: CompanyDocumentKind) => void
}) {
  const count = invoices.length + contracts.length + estimates.length + documents.length

  return (
    <section className="mt-4" aria-labelledby="company-documents-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="company-documents-heading" className="sr-only">Documents</h2>
        <span className="text-sm text-muted-foreground">{count} document{count === 1 ? "" : "s"}</span>
        {canAdd && onAdd && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SectionAddButton label="Add document" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onAdd("document")}>Document</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAdd("invoice")}>Invoice</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAdd("contract")}>Contract</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAdd("estimate")}>Estimate / quote</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {count === 0 ? (
        <CompanyEmptyState
          icon={FileText}
          title="No documents yet"
          description="Proposals, invoices and contracts will appear here."
        />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {documents.map((document) => {
            const status = companyDocumentStatusMeta[document.status] ?? companyDocumentStatusMeta.draft
            const kind = companyDocumentKindMeta[document.kind]?.label ?? "Document"
            return (
              <MobileDataCard
                key={`document-${document.id}`}
                title={document.title || "Document"}
                subtitle={`${kind} · ${status.label}`}
                ariaLabel={`Open ${document.title || "Document"}`}
                icon={<FileText className="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
                menuLabel={`Options for ${document.title || "Document"}`}
                menu={<DropdownMenuItem onSelect={() => onSelect("document", document.id)}>Open document</DropdownMenuItem>}
                onClick={() => onSelect("document", document.id)}
              />
            )
          })}

          {invoices.map((invoice) => {
            const status = invoiceStatusMeta[invoice.status]
            return (
              <MobileDataCard
                key={`invoice-${invoice.id}`}
                title={invoice.invoiceNumber || "Invoice"}
                subtitle={`${formatMoney(invoice.amount, invoice.currency)} · ${status.label}`}
                ariaLabel={`Open invoice ${invoice.invoiceNumber || ""}`}
                icon={<Receipt className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                menuLabel={`Options for ${invoice.invoiceNumber || "Invoice"}`}
                menu={<DropdownMenuItem onSelect={() => onSelect("invoice", invoice.id)}>Open invoice</DropdownMenuItem>}
                onClick={() => onSelect("invoice", invoice.id)}
              />
            )
          })}

          {contracts.map((contract) => {
            const status = contractStatusMeta[contract.status]
            return (
              <MobileDataCard
                key={`contract-${contract.id}`}
                title={contract.title || "Contract"}
                subtitle={`Contract · ${status.label}`}
                ariaLabel={`Open ${contract.title || "Contract"}`}
                icon={<FileSignature className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />}
                menuLabel={`Options for ${contract.title || "Contract"}`}
                menu={<DropdownMenuItem onSelect={() => onSelect("contract", contract.id)}>Open contract</DropdownMenuItem>}
                onClick={() => onSelect("contract", contract.id)}
              />
            )
          })}

          {estimates.map((estimate) => {
            const status = estimateStatusMeta[estimate.status]
            return (
              <MobileDataCard
                key={`estimate-${estimate.id}`}
                title={estimate.estimateNumber || estimate.title || "Estimate"}
                subtitle={`${formatMoney(estimate.amount, estimate.currency)} · ${status.label}`}
                ariaLabel={`Open estimate ${estimate.estimateNumber || estimate.title || ""}`}
                icon={<ClipboardList className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                menuLabel={`Options for ${estimate.estimateNumber || estimate.title || "Estimate"}`}
                menu={<DropdownMenuItem onSelect={() => onSelect("estimate", estimate.id)}>Open estimate</DropdownMenuItem>}
                onClick={() => onSelect("estimate", estimate.id)}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
