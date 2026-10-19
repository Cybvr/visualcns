"use client"

import { RouteTabs, DOCUMENT_TABS } from "@/components/dashboard/route-tabs"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ExternalLink, FileText, FileUp, Mail, Pencil } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { CompanyDocumentView } from "@/components/dashboard/company-document-view"
import { CompanyDocumentBuilder } from "@/components/dashboard/company-document-builder"
import { CompactListRow, shortListDate } from "@/components/dashboard/compact-list-row"
import { DocumentSplitPane } from "@/components/dashboard/document-split-pane"
import { GridCard, thumbnailIcon } from "@/components/dashboard/grid-card"
import { DuplicateDocumentDialog, type DuplicateSelection } from "@/components/dashboard/duplicate-document-dialog"
import { FirstRunState } from "@/components/dashboard/empty-state"
import { ImportWordDocumentDialog } from "@/components/dashboard/import-word-document-dialog"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { type ItemActions } from "@/components/dashboard/item-menu"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { usePageTitle, useRecordTitle } from "@/components/dashboard/page-title-context"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { buildEmailComposeHref } from "@/lib/email-composer"
import { companyDocumentEmailContext } from "@/lib/document-emails"
import { companyDocumentKindMeta, companyDocumentStatusMeta, createCompanyDocument, deleteCompanyDocument, getCompanyDocuments, getCompanyDocumentsByCompanyId, type CompanyDocument, type CompanyDocumentKind } from "@/lib/company-documents"
import { getOrganizations, organizationRef, type Organization } from "@/lib/organizations"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"
import { useViewMode, ViewToggle } from "@/components/dashboard/view-toggle"

interface DocumentRow {
  id: string
  kind: CompanyDocumentKind
  title: string
  company: string
  companyId: string
  statusLabel?: string
  updatedAtMs: number
  viewHref: string
  editHref?: string
  source: CompanyDocument
}

function companyDocToRow(document: CompanyDocument, adminView: boolean): DocumentRow {
  const meta = companyDocumentStatusMeta[document.status] ?? companyDocumentStatusMeta.draft
  return {
    id: document.id,
    kind: document.kind,
    title: document.title,
    company: document.client || document.companyId,
    companyId: document.companyId,
    statusLabel: meta.label,
    updatedAtMs: Math.max(tsToMillis(document.updatedAt), tsToMillis(document.createdAt)),
    viewHref: `/dashboard/documents/${document.id}`,
    editHref: adminView ? `/dashboard/documents/${document.id}/edit` : undefined,
    source: document,
  }
}

const DOCUMENT_SORTS: SortOption<DocumentRow>[] = [
  { value: "updatedAt", label: "Last modified", get: (row) => row.updatedAtMs, ascLabel: "Oldest", descLabel: "Newest" },
  { value: "title", label: "Title", get: (row) => row.title, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "company", label: "Company", get: (row) => row.company, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "status", label: "Status", get: (row) => row.statusLabel, ascLabel: "A–Z", descLabel: "Z–A" },
]


export default function DocumentsPage() {
  const router = useRouter()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const companyId = appUser?.companyId ?? ""
  const adminView = isAdmin && !isImpersonating

  usePageTitle("Documents")

  const [rows, setRows] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useUrlSelection("document")
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<DocumentRow | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [view, setView] = useViewMode("documents", "grid")

  const fetchData = useCallback(async () => {
    setError(false)
    try {
      if (adminView) {
        const [documents, organizationList] = await Promise.all([getCompanyDocuments(), getOrganizations()])
        setRows(documents.map((document) => companyDocToRow(document, adminView)))
        setOrganizations(organizationList)
      } else {
        const documents = await getCompanyDocumentsByCompanyId(companyId)
        setRows(documents.map((document) => companyDocToRow(document, adminView)))
        setOrganizations([])
      }
    } catch (loadError) {
      console.error("Error loading documents:", loadError)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [adminView, companyId])

  useEffect(() => { void fetchData() }, [fetchData])

  const organizationRefById = useMemo(() => new Map(organizations.map((organization) => [organization.id, organizationRef(organization)])), [organizations])
  const companyRefFor = (id: string) => organizationRefById.get(id) ?? id
  const { results: visibleRows, bar } = useFilterBar({ items: rows, search: (row) => [row.title, row.company, row.statusLabel, companyDocumentKindMeta[row.kind]?.label], sorts: DOCUMENT_SORTS, defaultSort: "updatedAt", defaultDirection: "desc" })
  const selectedRow = selectedId ? rows.find((row) => row.id === selectedId) ?? null : null
  useRecordTitle(selectedRow?.title || null)

  async function removeRow(target: DocumentRow) {
    try {
      await deleteCompanyDocument(target.id)
      setRows((current) => current.filter((row) => row.id !== target.id))
      if (selectedId === target.id) setSelectedId(null)
    } catch (deleteError) {
      console.error("Error deleting document:", deleteError)
      toast.error("Couldn't delete this document.")
    }
  }

  function documentActions(row: DocumentRow): ItemActions {
    return {
      noun: "document",
      name: row.title || "Untitled document",
      onOpen: () => setSelectedId(row.id),
      onDuplicate: adminView ? () => setDuplicateTarget(row) : undefined,
      extra: <>
        <DropdownMenuItem onSelect={() => router.push(row.viewHref)}>View document</DropdownMenuItem>
        {adminView && row.editHref && <DropdownMenuItem onSelect={() => router.push(row.editHref!)}>Edit document</DropdownMenuItem>}
        {adminView && <DropdownMenuItem onSelect={() => router.push(buildEmailComposeHref(companyDocumentEmailContext(row.source, companyRefFor(row.companyId))))}>Email document</DropdownMenuItem>}
      </>,
      onDelete: adminView ? () => removeRow(row) : undefined,
      deleteMessage: `${row.title || "This document"} will be removed for good. This cannot be undone.`,
    }
  }

  async function confirmDuplicate(selection: DuplicateSelection) {
    if (!duplicateTarget || duplicating) return
    setDuplicating(true)
    try {
      const source = duplicateTarget.source
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = source
      const newId = await createCompanyDocument({ ...rest, title: `${source.title || "Document"} (Copy)`, status: "draft", shareEnabled: false, companyId: selection.companyId, client: selection.client || source.client, projectId: selection.projectId, project: selection.project })
      setDuplicateTarget(null)
      await fetchData()
      router.push(`/dashboard/documents/${newId}/edit`)
    } catch (duplicateError) {
      console.error("Error duplicating document:", duplicateError)
      toast.error("Couldn't duplicate this document.")
    } finally {
      setDuplicating(false)
    }
  }

  if (!user) return null

  const documentFilter = (
    <TableFilterBar
      {...bar}
      placeholder="Search documents"
      controls={<ViewToggle view={view} onChange={setView} />}
      createAction={adminView ? { label: "New document", onClick: () => setCreating(true) } : undefined}
      actions={adminView && (
        <>
          <Button variant="ghost" size="icon" className="bg-transparent text-foreground hover:bg-transparent" onClick={() => setImporting(true)} aria-label="Import document" title="Import document"><FileUp className="size-4" aria-hidden="true" /></Button>
        </>
      )}
    />
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <RouteTabs tabs={DOCUMENT_TABS} />
      {error ? <p className="mt-10 text-sm text-destructive">Couldn’t load documents right now.</p> : !loading && rows.length === 0 ? (
        <>
          {documentFilter}
          <FirstRunState label="Document" title={adminView ? "Let's create your first document" : "Nothing here yet"} description={adminView ? "Proposals and other documents you create for clients will show up here." : "Documents your agency shares with you will show up here."} action={adminView ? <Button onClick={() => setCreating(true)}>New document</Button> : undefined} />
        </>
      ) : (
        <DocumentSplitPane
          visibleItems={loading ? [] : visibleRows}
          loading={loading}
          selectedId={selectedId}
          onClearSelection={() => setSelectedId(null)}
          sectionLabel="Documents"
          filter={documentFilter}
          emptySearchLabel="No documents match your search."
          getKey={(row) => row.id}
          selectedTitle={selectedRow?.title || "Document"}
          headerActions={selectedRow && (
            <>
              {adminView && selectedRow.editHref && <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Edit document"><Link href={selectedRow.editHref}><Pencil className="size-4" /></Link></Button>}
              {adminView && <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Email document"><Link href={buildEmailComposeHref(companyDocumentEmailContext(selectedRow.source, companyRefFor(selectedRow.companyId)))}><Mail className="size-4" /></Link></Button>}
              <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Open document"><Link href={selectedRow.viewHref}><ExternalLink className="size-4" /></Link></Button>
            </>
          )}
          content={selectedRow ? (adminView ? <CompanyDocumentBuilder document={selectedRow.source} /> : <CompanyDocumentView document={selectedRow.source} />) : null}
          singlePane
          view={view}
          renderGridItem={(row) => (
            <GridCard
              title={row.title || "Untitled document"}
              icon={<FileText className="size-4 text-muted-foreground" aria-hidden="true" />}
              placeholder={thumbnailIcon(FileText)}
              subtitle={row.statusLabel || companyDocumentKindMeta[row.kind]?.label || "Document"}
              onClick={() => setSelectedId(row.id)}
              ariaLabel={`Open ${row.title || "document"}`}
              menuLabel={`Options for ${row.title || "document"}`}
              actions={documentActions(row)}
            />
          )}
          renderItem={(row, active) => (
            <CompactListRow
              title={row.title || "Untitled document"}
              subtitle={`${companyDocumentKindMeta[row.kind]?.label ?? "Document"} · ${formatTimestamp(row.source.updatedAt ?? row.source.createdAt)}`}
              meta={shortListDate(row.updatedAtMs)}
              mobileSubtitle={[row.source.client || (row.companyId && companyRefFor(row.companyId)), companyDocumentKindMeta[row.kind]?.label ?? "Document", row.statusLabel].filter(Boolean).join(" · ")}
              active={active}
              onClick={() => setSelectedId(row.id)}
              menuLabel={`Options for ${row.title || "document"}`}
              actions={documentActions(row)}
            />
          )}
        />
      )}

      {adminView && <NewDocumentDialog open={creating} onOpenChange={setCreating} />}
      {adminView && <ImportWordDocumentDialog open={importing} onOpenChange={setImporting} />}
      {adminView && <DuplicateDocumentDialog open={duplicateTarget !== null} onOpenChange={(open) => !open && !duplicating && setDuplicateTarget(null)} title={`Duplicate ${duplicateTarget?.title ?? "document"}`} description="Choose where the duplicate should live." defaultCompanyId={duplicateTarget?.companyId ?? ""} defaultProjectId={duplicateTarget?.source && "projectId" in duplicateTarget.source ? duplicateTarget.source.projectId : undefined} submitting={duplicating} onConfirm={confirmDuplicate} />}
    </main>
  )
}
