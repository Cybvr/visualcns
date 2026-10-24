"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter, useSearchParams } from "next/navigation"

import { CompanyDocuments, type CompanyDocumentKind } from "@/components/company/company-documents"
import { useCompanyPage } from "@/components/company/company-page-context"
import { useCompanyCampaignMedia, useCompanyFiles } from "@/components/company/sections/files-section"
import { useCompanyNotes } from "@/components/company/sections/notes-section"
import { DocumentArtifact } from "@/components/dashboard/document-artifact"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { cn } from "@/lib/utils"

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
  const [artifactSlot, setArtifactSlot] = useState<HTMLElement | null>(null)
  useEffect(() => { setArtifactSlot(document.getElementById("company-artifact-slot")) }, [])
  // Notes sit in the same list as the documents and open in their own editor.
  const notes = useCompanyNotes()
  // Every campaign's media sits in the Drive too.
  const campaignMedia = useCompanyCampaignMedia()
  // Uploaded files sit in the same list too, and open in a new tab.
  const files = useCompanyFiles(campaignMedia.urls)

  // The open document is ?doc={kind}:{id}, so it can be linked to directly.
  const docParam = searchParams.get("doc") ?? ""
  // Close hides the document at once, without waiting for the address to update.
  const [dismissed, setDismissed] = useState("")
  useEffect(() => { if (docParam !== dismissed) setDismissed("") }, [docParam]) // eslint-disable-line react-hooks/exhaustive-deps
  const [docKind, docId] = (docParam === dismissed ? "" : docParam).split(":")
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

  const selectedRecord = selected
    ? selected.kind === "invoice" ? invoices.find((i) => i.id === selected.id)
      : selected.kind === "contract" ? contracts.find((c) => c.id === selected.id)
        : selected.kind === "estimate" ? estimates.find((e) => e.id === selected.id)
          : documents.find((d) => d.id === selected.id)
    : undefined

  return (
    <div className="mt-5">
      {/* The list stays put; an open document sits beside it like an artifact, or over it on a phone. */}
      <div className="flex min-w-0 items-start gap-4">
        <div className={cn("min-w-0 flex-1", selected && "max-md:hidden")}>
          <CompanyDocuments
            invoices={invoices}
            contracts={contracts}
            estimates={estimates}
            documents={documents}
            heading="Drive"
            emptyTitle="Your drive is empty"
            addKinds={["document", "invoice", "contract", "estimate"]}
            emptyDescription="Documents, invoices, estimates, contracts, files and campaign media will appear here."
            onSelect={(kind, id) => updateParams({ doc: `${kind}:${id}` })}
            onEdit={canEditDocuments ? (kind, id) => router.push(editHref(kind, id)) : undefined}
            canAdd={Boolean(admin)}
            onAdd={handleAdd}
            extraEntries={[...notes.entries, ...files.entries, ...campaignMedia.entries]}
            extraAddItems={files.addItem || notes.addItem ? <>{files.addItem}{notes.addItem}</> : undefined}
            canManage={canEditDocuments}
            onChanged={admin?.reload}
          />
        </div>
        {selected && selectedRecord && (() => {
          const pane = (
            <DocumentArtifact
              artifact={selected}
              record={selectedRecord}
              issuer={issuer}
              canEdit={canEditDocuments}
              fullHref={isAdmin ? `/dashboard/${selected.kind}s/${encodeURIComponent(selected.id)}` : undefined}
              actions={!admin ? <DocumentActions title={`${company.name} ${KIND_LABELS[selected.kind]}`} iconOnly /> : undefined}
              onClose={() => { setDismissed(docParam); updateParams({ doc: null }, true) }}
              className="h-full md:border-l md:border-border"
            />
          )
          // The company page keeps a full-height slot on the right for it; anywhere else it sits beside the list.
          return artifactSlot ? createPortal(pane, artifactSlot) : <div className="max-md:fixed max-md:inset-0 max-md:z-50 md:sticky md:top-4 md:h-[calc(100svh-8rem)] md:w-[min(48rem,50%)] md:shrink-0">{pane}</div>
        })()}
      </div>

      {notes.dialogs}
      {files.dialogs}

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
