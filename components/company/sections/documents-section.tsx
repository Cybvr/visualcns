"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"

import { CompanyDocuments, type CompanyDocumentKind } from "@/components/company/company-documents"
import { useCompanyPage } from "@/components/company/company-page-context"
import { CompanyDocumentView } from "@/components/dashboard/company-document-view"
import { ContractDocument } from "@/components/dashboard/contract-document"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { EstimateDocument } from "@/components/dashboard/estimate-document"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { Button } from "@/components/ui/button"
import type { Contract, Estimate, Invoice } from "@/lib/billing"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import type { CompanyDocument } from "@/lib/company-documents"

const KIND_LABELS: Record<CompanyDocumentKind, string> = {
  invoice: "Invoice",
  contract: "Contract",
  estimate: "Estimate",
  document: "Document",
}

function editHref(kind: CompanyDocumentKind, id: string) {
  return `/dashboard/${kind}s/${encodeURIComponent(id)}/edit`
}

export function DocumentsSection() {
  const { company, invoices, contracts, estimates, documents, admin, isAdmin, canEditDocuments, updateParams } = useCompanyPage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [creatingDocument, setCreatingDocument] = useState(false)

  // The open document is ?doc={kind}:{id}, so it can be linked to directly.
  const [docKind, docId] = (searchParams.get("doc") ?? "").split(":")
  const selected = useMemo(() => {
    if (docKind === "invoice") return invoices.find((i) => i.id === docId) ? { kind: "invoice" as const, id: docId } : null
    if (docKind === "contract") return contracts.find((c) => c.id === docId) ? { kind: "contract" as const, id: docId } : null
    if (docKind === "estimate") return estimates.find((e) => e.id === docId) ? { kind: "estimate" as const, id: docId } : null
    if (docKind === "document") return documents.find((d) => d.id === docId) ? { kind: "document" as const, id: docId } : null
    return null
  }, [docKind, docId, invoices, contracts, estimates, documents])

  useEffect(() => {
    setIssuer(null)
    if (!isAdmin && !company.agencyId) return
    let active = true
    getBusinessProfile(isAdmin ? undefined : company.agencyId)
      .then((profile) => { if (active) setIssuer(profile) })
      .catch(() => {
        // Document header just stays without issuer details.
      })
    return () => { active = false }
  }, [isAdmin, company.agencyId])

  function handleAdd(kind: CompanyDocumentKind) {
    if (kind === "document") {
      setCreatingDocument(true)
      return
    }
    router.push(`/dashboard/${kind}s/new?companyId=${encodeURIComponent(company.id)}`)
  }

  return (
    <div className="mt-5">
      {selected ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <button
              type="button"
              onClick={() => updateParams({ doc: null })}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Documents
            </button>
            {canEditDocuments ? (
              <Button asChild variant="outline" size="sm">
                <Link href={editHref(selected.kind, selected.id)}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit {selected.kind}
                </Link>
              </Button>
            ) : !admin ? (
              <DocumentActions title={`${company.name} ${KIND_LABELS[selected.kind]}`} />
            ) : null}
          </div>
          {selected.kind === "invoice" && (
            <InvoiceDocument invoice={invoices.find((i) => i.id === selected.id) as Invoice} issuer={issuer ?? undefined} />
          )}
          {selected.kind === "contract" && (
            <ContractDocument contract={contracts.find((c) => c.id === selected.id) as Contract} issuer={issuer ?? undefined} />
          )}
          {selected.kind === "estimate" && (
            <EstimateDocument estimate={estimates.find((e) => e.id === selected.id) as Estimate} issuer={issuer ?? undefined} />
          )}
          {selected.kind === "document" && (
            <CompanyDocumentView document={documents.find((d) => d.id === selected.id) as CompanyDocument} issuer={issuer ?? undefined} />
          )}
        </div>
      ) : (
        <CompanyDocuments
          invoices={invoices}
          contracts={contracts}
          estimates={estimates}
          documents={documents}
          onSelect={(kind, id) => updateParams({ doc: `${kind}:${id}` })}
          onEdit={canEditDocuments ? (kind, id) => router.push(editHref(kind, id)) : undefined}
          canAdd={Boolean(admin)}
          onAdd={handleAdd}
        />
      )}

      {admin && (
        <NewDocumentDialog
          open={creatingDocument}
          onOpenChange={setCreatingDocument}
          initialCompanyId={company.id}
        />
      )}
    </div>
  )
}
