import { ClipboardList, FileSignature, FileText, Plus, Receipt } from "lucide-react"

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
import { DOC_BADGE, DocTile } from "@/components/company/document-tile"
import { Button } from "@/components/ui/button"
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
        <div className="flex items-baseline gap-2">
          <h2 id="company-documents-heading" className="text-base font-semibold">Documents</h2>
          <span className="text-sm text-muted-foreground">{count}</span>
        </div>
        {canAdd && onAdd && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="size-4" aria-hidden="true" />
                Add
              </Button>
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
        <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-border py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted">
            <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-medium">No documents yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Proposals, invoices and contracts will appear here.</p>
        </div>
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
