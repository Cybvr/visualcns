"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Copy, Eye, FileUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { FaFileAlt } from "react-icons/fa"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { ReactIcon } from "@/components/react-icon"
import { FirstRunState } from "@/components/dashboard/empty-state"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { ImportWordDocumentDialog } from "@/components/dashboard/import-word-document-dialog"
import { DuplicateDocumentDialog, type DuplicateSelection } from "@/components/dashboard/duplicate-document-dialog"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { UserEditorSheet } from "@/components/dashboard/user-editor-sheet"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ViewToggle, useViewMode } from "@/components/dashboard/view-toggle"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/billing"
import {
  companyDocumentStatusMeta,
  createCompanyDocument,
  deleteCompanyDocument,
  getCompanyDocuments,
  getCompanyDocumentsByCompanyId,
  type CompanyDocument,
  type CompanyDocumentKind,
} from "@/lib/company-documents"
import { tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

const KIND_ICON = {
  proposal: FaFileAlt,
  sow: FaFileAlt,
  brief: FaFileAlt,
  report: FaFileAlt,
  other: FaFileAlt,
}

const KIND_ICON_COLOR: Record<CompanyDocumentKind, string> = {
  proposal: "text-blue-600 dark:text-blue-400",
  sow: "text-cyan-600 dark:text-cyan-400",
  brief: "text-sky-600 dark:text-sky-400",
  report: "text-teal-600 dark:text-teal-400",
  other: "text-muted-foreground",
}

function timeAgo(ms: number): string {
  if (!ms) return ""
  const diff = Date.now() - ms
  if (diff < 60_000) return "just now"
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

interface DocumentRow {
  id: string
  kind: CompanyDocumentKind
  title: string
  company: string
  companyId: string
  statusLabel?: string
  statusClassName?: string
  updatedAtMs: number
  viewHref: string
  editHref?: string
  source: CompanyDocument
}

function companyDocToRow(d: CompanyDocument, adminView: boolean): DocumentRow {
  const meta = companyDocumentStatusMeta[d.status] ?? companyDocumentStatusMeta.draft
  return {
    id: d.id,
    kind: d.kind,
    title: d.title,
    company: d.client || d.companyId,
    companyId: d.companyId,
    statusLabel: meta.label,
    statusClassName: meta.className,
    updatedAtMs: tsToMillis(d.updatedAt),
    viewHref: `/dashboard/documents/${d.id}`,
    editHref: adminView ? `/dashboard/documents/${d.id}/edit` : undefined,
    source: d,
  }
}

export default function DocumentsPage() {
  const router = useRouter()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const companyId = appUser?.companyId ?? ""
  const adminView = isAdmin && !isImpersonating

  usePageTitle("Documents")

  const [rows, setRows] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<DocumentRow | null>(null)
  const [clientSheet, setClientSheet] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [view, setView] = useViewMode("documents")
  const [importing, setImporting] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<DocumentRow | null>(null)
  const [duplicating, setDuplicating] = useState(false)

  const fetchData = useCallback(async () => {
    setError(false)
    try {
      const docs = adminView ? await getCompanyDocuments() : await getCompanyDocumentsByCompanyId(companyId)
      setRows(docs.map((d) => companyDocToRow(d, adminView)))
    } catch (loadError) {
      console.error("Error loading documents:", loadError)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [adminView, companyId])

  useEffect(() => { void fetchData() }, [fetchData])

  async function removeRow() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteCompanyDocument(confirmDelete.id)
      setRows((current) => current.filter((row) => row.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (deleteError) {
      console.error("Error deleting document:", deleteError)
      toast.error("Couldn't delete this.")
    } finally {
      setDeleting(false)
    }
  }

  async function confirmDuplicate(selection: DuplicateSelection) {
    if (!duplicateTarget || duplicating) return
    setDuplicating(true)
    try {
      const source = duplicateTarget.source
      let newId = ""
      const document = source
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = document
      newId = await createCompanyDocument({
        ...rest,
        title: `${document.title || "Document"} (Copy)`,
        status: "draft",
        shareEnabled: false,
        companyId: selection.companyId,
        client: selection.client || document.client,
        projectId: selection.projectId,
        project: selection.project,
      })

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

  const sorts: SortOption<DocumentRow>[] = useMemo(() => {
    const all: SortOption<DocumentRow>[] = [
      { value: "updated", label: "Last updated", get: (row) => row.updatedAtMs, ascLabel: "Oldest", descLabel: "Newest" },
      { value: "title", label: "Title", get: (row) => row.title, ascLabel: "A–Z", descLabel: "Z–A" },
      { value: "company", label: "Company", get: (row) => row.company, ascLabel: "A–Z", descLabel: "Z–A" },
      { value: "status", label: "Status", get: (row) => row.statusLabel, ascLabel: "A–Z", descLabel: "Z–A" },
    ]
    return adminView ? all : all.filter((option) => option.value !== "company")
  }, [adminView])

  const { results: visibleRows, bar } = useFilterBar({
    items: rows,
    sorts,
    defaultSort: "updated",
    defaultDirection: "desc",
  })

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <FilterBar
        {...bar}
        mobileVariant="drawer"
        headerOnMobile
        controls={<ViewToggle view={view} onChange={setView} />}
        actions={
          adminView && (
            <>
              <Button variant="ghost" size="icon" className="bg-transparent shadow-none hover:bg-transparent" onClick={() => setImporting(true)} aria-label="Import document" title="Import document"><FileUp className="size-4" aria-hidden="true" /></Button>
              <Button variant="ghost" size="sm" className="bg-transparent px-3 text-foreground hover:bg-transparent" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                New document
              </Button>
            </>
          )
        }
      />

      {loading ? (
        <DashboardPageSkeleton rows={6} />
      ) : error ? (
        <p className="mt-10 text-sm text-destructive">Couldn&rsquo;t load documents right now.</p>
      ) : rows.length === 0 ? (
        <FirstRunState
          className="mt-2"
          label="Document"
          title={adminView ? "Let's create your first document" : "Nothing here yet"}
          description={adminView
            ? "Proposals and other documents you create for clients will show up here."
            : "Documents your agency shares with you will show up here."}
          action={adminView ? <Button onClick={() => setCreating(true)}>New Document</Button> : undefined}
        />
      ) : view === "grid" ? (
        <GridCardList>
          {visibleRows.map((row) => {
            const KindIcon = KIND_ICON[row.kind]
            return (
              <GridCard
                key={`${row.kind}-${row.id}`}
                href={row.editHref ?? row.viewHref}
                ariaLabel={`Open ${row.title}`}
                title={row.title}
                icon={<ReactIcon icon={KindIcon} className={cn("size-4", KIND_ICON_COLOR[row.kind])} aria-hidden="true" />}
                placeholder={<ReactIcon icon={KindIcon} className={cn("size-12 opacity-40", KIND_ICON_COLOR[row.kind])} aria-hidden="true" />}
                menuLabel={`Options for ${row.title}`}
                menu={
                  <>
                    <DropdownMenuItem onSelect={() => router.push(row.viewHref)}>View document</DropdownMenuItem>
                    {adminView && row.editHref && <DropdownMenuItem onSelect={() => row.editHref && router.push(row.editHref)}>Edit</DropdownMenuItem>}
                    {adminView && <DropdownMenuItem onSelect={() => setDuplicateTarget(row)}>Duplicate</DropdownMenuItem>}
                    {adminView && <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(row)}>Delete</DropdownMenuItem>}
                  </>
                }
              />
            )
          })}
        </GridCardList>
      ) : (
        <>
          <div className="space-y-2 sm:hidden">
            {visibleRows.map((row) => {
              const KindIcon = KIND_ICON[row.kind]
              return (
                <MobileDataCard
                  key={`${row.kind}-${row.id}`}
                  href={row.editHref ?? row.viewHref}
                  title={row.title}
                  subtitle={timeAgo(row.updatedAtMs)}
                  icon={<ReactIcon icon={KindIcon} className={cn("size-5", KIND_ICON_COLOR[row.kind])} aria-hidden="true" />}
                  menuLabel={`Options for ${row.title}`}
                  menu={
                    <>
                      <DropdownMenuItem onSelect={() => router.push(row.viewHref)}>View document</DropdownMenuItem>
                      {adminView && row.editHref && <DropdownMenuItem onSelect={() => row.editHref && router.push(row.editHref)}>Edit</DropdownMenuItem>}
                      {adminView && <DropdownMenuItem onSelect={() => setDuplicateTarget(row)}>Duplicate</DropdownMenuItem>}
                      {adminView && <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(row)}>Delete</DropdownMenuItem>}
                    </>
                  }
                />
              )
            })}
          </div>

          <div className="hidden overflow-x-hidden sm:block">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[38%]">Title</TableHead>
                {adminView && <TableHead className="w-[22%]">Company</TableHead>}
                <TableHead className="w-[15%]">Updated</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-24 text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={`${row.kind}-${row.id}`}>
                  <TableCell className="max-w-0 font-medium">
                    <Link href={row.editHref ?? row.viewHref} className="block truncate rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{row.title}</Link>
                  </TableCell>
                  {adminView && (
                    <TableCell className="max-w-0">
                      {row.companyId ? (
                        <button type="button" onClick={() => setClientSheet(row.companyId)} className="block max-w-full truncate rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{row.company || "Company"}</button>
                      ) : "—"}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">{row.updatedAtMs ? formatDate(new Date(row.updatedAtMs).toISOString().slice(0, 10)) : "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.statusLabel && <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", row.statusClassName)}>{row.statusLabel}</span>}</TableCell>
                  <TableCell className="w-24">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={row.viewHref} aria-label={`View ${row.title}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Eye className="size-4" aria-hidden="true" /></Link>
                      {adminView && row.editHref && (
                        <Link href={row.editHref} aria-label={`Edit ${row.title}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="size-4" aria-hidden="true" /></Link>
                      )}
                      {adminView && (
                        <button type="button" onClick={() => setDuplicateTarget(row)} aria-label={`Duplicate ${row.title}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Copy className="size-4" aria-hidden="true" /></button>
                      )}
                      {adminView && (
                        <button type="button" onClick={() => setConfirmDelete(row)} aria-label={`Delete ${row.title}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="size-4" aria-hidden="true" /></button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </>
      )}

      {adminView && (
        <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this document?</AlertDialogTitle><AlertDialogDescription>{confirmDelete?.title} will be removed for good. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void removeRow() }} disabled={deleting}>{deleting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {adminView && <NewDocumentDialog open={creating} onOpenChange={setCreating} />}

      {adminView && (
        <DuplicateDocumentDialog
          open={duplicateTarget !== null}
          onOpenChange={(open) => !open && !duplicating && setDuplicateTarget(null)}
          title={`Duplicate ${duplicateTarget?.title ?? "document"}`}
          description="Choose where the duplicate should live."
          defaultCompanyId={duplicateTarget?.companyId ?? ""}
          defaultProjectId={duplicateTarget?.source && "projectId" in duplicateTarget.source ? duplicateTarget.source.projectId : undefined}
          submitting={duplicating}
          onConfirm={confirmDuplicate}
        />
      )}

      {adminView && <ImportWordDocumentDialog open={importing} onOpenChange={setImporting} />}

      {adminView && <UserEditorSheet open={clientSheet !== null} companyId={clientSheet ?? ""} onClose={() => setClientSheet(null)} onSaved={() => setClientSheet(null)} />}
    </main>
  )
}
