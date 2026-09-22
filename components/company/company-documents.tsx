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
import { DOC_BADGE, DocTile } from "@/components/company/document-tile"
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
              <DocTile
                key={`document-${document.id}`}
                icon={FileText}
                badgeClass={DOC_BADGE.document}
                title={document.title || "Document"}
                subtitle={`${kind} · ${status.label}`}
                onClick={() => onSelect("document", document.id)}
              />
            )
          })}

          {invoices.map((invoice) => {
            const status = invoiceStatusMeta[invoice.status]
            return (
              <DocTile
                key={`invoice-${invoice.id}`}
                icon={Receipt}
                badgeClass={DOC_BADGE.invoice}
                title={invoice.invoiceNumber || "Invoice"}
                subtitle={`${formatMoney(invoice.amount, invoice.currency)} · ${status.label}`}
                onClick={() => onSelect("invoice", invoice.id)}
              />
            )
          })}

          {contracts.map((contract) => {
            const status = contractStatusMeta[contract.status]
            return (
              <DocTile
                key={`contract-${contract.id}`}
                icon={FileSignature}
                badgeClass={DOC_BADGE.contract}
                title={contract.title || "Contract"}
                subtitle={`Contract · ${status.label}`}
                onClick={() => onSelect("contract", contract.id)}
              />
            )
          })}

          {estimates.map((estimate) => {
            const status = estimateStatusMeta[estimate.status]
            return (
              <DocTile
                key={`estimate-${estimate.id}`}
                icon={ClipboardList}
                badgeClass={DOC_BADGE.estimate}
                title={estimate.estimateNumber || estimate.title || "Estimate"}
                subtitle={`${formatMoney(estimate.amount, estimate.currency)} · ${status.label}`}
                onClick={() => onSelect("estimate", estimate.id)}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
