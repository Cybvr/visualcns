"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { CompanyDocuments, type CompanyDocumentKind, type ExtraDocumentEntry } from "@/components/company/company-documents"
import { MediaLightbox, type MediaLightboxItem } from "@/components/ui/media-lightbox"
import { useCompanyPage } from "@/components/company/company-page-context"
import { useCompanyCampaignMedia, useCompanyFiles } from "@/components/company/sections/files-section"
import { DocumentArtifact } from "@/components/dashboard/document-artifact"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"

const KIND_LABELS: Record<CompanyDocumentKind, string> = {
  invoice: "Invoice",
  contract: "Contract",
  document: "Document",
}

function editHref(kind: CompanyDocumentKind, id: string) {
  return `/dashboard/${kind}s/${encodeURIComponent(id)}/edit`
}

/** Where the main Artifacts page opens each kind: documents and invoices beside Ngai. */
function artifactHref(kind: CompanyDocumentKind, id: string) {
  const ref = encodeURIComponent(id)
  if (kind === "document") return `/dashboard/documents?document=${ref}`
  if (kind === "invoice") return `/dashboard/invoices/${ref}`
  return `/dashboard/contracts/${ref}`
}

/**
 * Documents (under Finance): invoices, estimates, contracts, documents and other files.
 * Assets (under Marketing): images and videos, uploaded or from campaigns.
 */
export function DocumentsSection({ view = "documents" }: { view?: "documents" | "assets" | "artifacts" }) {
  const assets = view === "assets"
  // Artifacts (the dashboard's company tab): documents, invoices, files and media together.
  const artifacts = view === "artifacts"
  const { company, projects, invoices, contracts, documents, admin, isAdmin, canEditDocuments, updateParams, setRecordOpen } = useCompanyPage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [creatingDocument, setCreatingDocument] = useState(false)
  // Every campaign's media sits in the Drive too.
  const campaignMedia = useCompanyCampaignMedia()
  // Uploaded files sit in the same list too, and open in a new tab.
  const files = useCompanyFiles(campaignMedia.urls)
  // Images and videos open full size in the lightbox, with arrows between them.
  const [lightboxId, setLightboxId] = useState<string | null>(null)
  const withLightbox = (entries: ExtraDocumentEntry[]) => entries.map((entry) => entry.lightbox ? { ...entry, actions: { ...entry.actions, onOpen: () => setLightboxId(entry.key) } } : entry)
  const lightboxItems: MediaLightboxItem[] = [...files.entries, ...campaignMedia.entries].flatMap((entry) => entry.lightbox ? [{ id: entry.key, title: entry.title, url: entry.lightbox.url, type: entry.lightbox.type }] : [])

  // The open document is ?doc={kind}:{id}, so it can be linked to directly.
  const docParam = searchParams.get("doc") ?? ""
  // Close hides the document at once, without waiting for the address to update.
  const [dismissed, setDismissed] = useState("")
  useEffect(() => { if (docParam !== dismissed) setDismissed("") }, [docParam]) // eslint-disable-line react-hooks/exhaustive-deps
  const [docKind, docId] = (docParam === dismissed ? "" : docParam).split(":")
  const selected = useMemo(() => {
    if (docKind === "invoice") return invoices.find((i) => i.id === docId) ? { kind: "invoice" as const, id: docId } : null
    if (docKind === "contract") return contracts.find((c) => c.id === docId) ? { kind: "contract" as const, id: docId } : null
    if (docKind === "document") return documents.find((d) => d.id === docId) ? { kind: "document" as const, id: docId } : null
    return null
  }, [docKind, docId, invoices, contracts, documents])

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
        : documents.find((d) => d.id === selected.id)
    : undefined

  const documentOpen = Boolean(selected && selectedRecord)
  useEffect(() => {
    setRecordOpen(documentOpen)
    return () => setRecordOpen(false)
  }, [documentOpen, setRecordOpen])

  return (
    <div className={documentOpen ? "min-w-0" : "mt-5"}>
      {selected && selectedRecord ? (
        <DocumentArtifact
          layout="page"
          artifact={selected}
          record={selectedRecord}
          issuer={issuer}
          canEdit={canEditDocuments}
          actions={!admin ? <DocumentActions title={`${company.name} ${KIND_LABELS[selected.kind]}`} iconOnly /> : undefined}
          onClose={() => { setDismissed(docParam); updateParams({ doc: null }, true) }}
        />
      ) : (
        assets ? (
        <CompanyDocuments
          invoices={[]}
          contracts={[]}
          documents={[]}
          heading="Assets"
          emptyTitle="No assets yet"
          addKinds={[]}
          emptyDescription="Images and videos, uploaded here or added to campaigns, will appear here."
          onSelect={() => {}}
          canAdd={false}
          extraEntries={withLightbox([...files.entries.filter((entry) => entry.media), ...campaignMedia.entries])}
          extraAddItems={files.addItem ?? undefined}
          canManage={canEditDocuments}
          onChanged={admin?.reload}
        />
        ) : (
        <>
        <CompanyDocuments
          invoices={invoices}
          contracts={contracts}
          documents={documents}
          heading={artifacts ? "Artifacts" : "Documents"}
          emptyTitle={artifacts ? "No artifacts yet" : "No documents yet"}
          addKinds={["document", "invoice", "contract"]}
          emptyDescription={artifacts ? "Documents, invoices, contracts, files, images and videos will appear here." : "Documents, invoices, contracts and files will appear here."}
          // Artifacts opens the same editors as the main Artifacts page; Documents opens in place.
          onSelect={(kind, id) => artifacts ? router.push(artifactHref(kind, id)) : updateParams({ doc: `${kind}:${id}` })}
          onEdit={canEditDocuments ? (kind, id) => router.push(artifacts ? artifactHref(kind, id) : editHref(kind, id)) : undefined}
          canAdd={Boolean(admin)}
          onAdd={handleAdd}
          campaignName={(projectId) => projectId ? projects.find((project) => project.id === projectId)?.title : undefined}
          extraEntries={withLightbox(artifacts ? [...files.entries, ...campaignMedia.entries] : files.entries.filter((entry) => !entry.media))}
          extraAddItems={files.addItem ?? undefined}
          canManage={canEditDocuments}
          onChanged={admin?.reload}
        />
        </>
        )
      )}

      {files.dialogs}
      <MediaLightbox items={lightboxItems} activeId={lightboxId} onChange={setLightboxId} />

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
