"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Copy, Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { DuplicateDocumentDialog, type DuplicateSelection } from "@/components/dashboard/duplicate-document-dialog"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { UserEditorSheet } from "@/components/dashboard/user-editor-sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { useRowSelection } from "@/hooks/use-row-selection"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  createEstimate,
  deleteEstimate,
  estimateStatusMeta,
  formatDate,
  formatMoney,
  getEstimates,
  getEstimatesByCompanyId,
  nextEstimateNumber,
  type Estimate,
} from "@/lib/billing"
import { tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

const ESTIMATE_SORTS: SortOption<Estimate>[] = [
  { value: "createdAt", label: "Date created", get: (estimate) => tsToMillis(estimate.createdAt), ascLabel: "Oldest", descLabel: "Newest" },
  { value: "estimateNumber", label: "Estimate no.", get: (estimate) => estimate.estimateNumber, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "client", label: "Client", get: (estimate) => estimate.client || estimate.companyId, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "amount", label: "Amount", get: (estimate) => estimate.amount, ascLabel: "Lowest", descLabel: "Highest" },
  { value: "validUntil", label: "Valid until", get: (estimate) => estimate.validUntil, ascLabel: "Soonest", descLabel: "Latest" },
  { value: "status", label: "Status", get: (estimate) => estimateStatusMeta[estimate.status]?.label ?? estimate.status, ascLabel: "A–Z", descLabel: "Z–A" },
]

function searchEstimate(estimate: Estimate) {
  return [estimate.estimateNumber, estimate.title, estimate.client, estimate.companyId, estimate.project, estimateStatusMeta[estimate.status]?.label]
}

export default function EstimatesPage() {
  const router = useRouter()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const companyId = appUser?.companyId ?? ""
  const adminView = isAdmin && !isImpersonating
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Estimate | null>(null)
  const [clientSheet, setClientSheet] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<Estimate | null>(null)
  const [duplicating, setDuplicating] = useState(false)

  const fetchData = useCallback(async () => {
    setError(false)
    try {
      setEstimates(adminView ? await getEstimates() : await getEstimatesByCompanyId(companyId))
    } catch (loadError) {
      console.error("Error loading estimates:", loadError)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [adminView, companyId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  async function confirmDuplicateEstimate(selection: DuplicateSelection) {
    if (!duplicateTarget || duplicating) return
    setDuplicating(true)
    try {
      const estimateNumber = await nextEstimateNumber()
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = duplicateTarget
      const newId = await createEstimate({
        ...rest,
        estimateNumber,
        status: "draft",
        shareEnabled: false,
        companyId: selection.companyId,
        client: selection.client || duplicateTarget.client,
        projectId: selection.projectId,
        project: selection.project,
      })
      setDuplicateTarget(null)
      router.push(`/dashboard/estimates/${newId}/edit`)
    } catch (duplicateError) {
      console.error("Error duplicating estimate:", duplicateError)
      toast.error("Couldn't duplicate this estimate.")
    } finally {
      setDuplicating(false)
    }
  }

  async function removeEstimate() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteEstimate(confirmDelete.id)
      setEstimates((current) => current.filter((row) => row.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (deleteError) {
      console.error("Error deleting estimate:", deleteError)
    } finally {
      setDeleting(false)
    }
  }

  const sorts = useMemo(
    () => (adminView ? ESTIMATE_SORTS : ESTIMATE_SORTS.filter((option) => option.value !== "client")),
    [adminView],
  )
  const { results: visibleEstimates, bar } = useFilterBar({
    items: estimates,
    search: searchEstimate,
    sorts,
    defaultSort: "createdAt",
    defaultDirection: "desc",
  })

  const selection = useRowSelection(visibleEstimates, (estimate) => estimate.id)

  async function handleBulkDelete() {
    const ids = selection.selectedIds
    if (ids.length === 0 || bulkDeleting) return
    setBulkDeleting(true)
    try {
      await Promise.all(ids.map((id) => deleteEstimate(id)))
      const removed = new Set(ids)
      setEstimates((current) => current.filter((row) => !removed.has(row.id)))
      if (confirmDelete && removed.has(confirmDelete.id)) setConfirmDelete(null)
      selection.clear()
    } catch (deleteError) {
      console.error("Error deleting estimates:", deleteError)
    } finally {
      setBulkDeleting(false)
    }
  }

  if (!user) return null
  const awaiting = estimates.filter((estimate) => estimate.status === "sent").length

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-12 sm:px-6">
      <FilterBar
        {...bar}
        placeholder="Search estimates"
        actions={
          adminView && <Button asChild><Link href="/dashboard/estimates/new"><Plus className="size-4" aria-hidden="true" />New</Link></Button>
        }
      />
      <p className="mb-6 text-sm text-muted-foreground">Price and scope work before it becomes an invoice.</p>

      {loading ? (
        <DashboardPageSkeleton rows={6} />
      ) : error ? (
        <p className="mt-10 text-sm text-destructive">Couldn’t load estimates right now.</p>
      ) : estimates.length === 0 ? (
        <FirstRunState
          className="mt-8"
          label="Estimate"
          title={adminView ? "Let's create your first estimate" : "No estimates yet"}
          description={adminView
            ? "Price and scope work before it becomes an invoice. Build up the line items, send it over, and turn it into an invoice once the client accepts."
            : "Estimates sent to you will show up here."}
          action={adminView ? <Button asChild><Link href="/dashboard/estimates/new">New Estimate</Link></Button> : undefined}
        />
      ) : (
        <>
          {awaiting > 0 && <p className="mt-6 rounded-[12px] bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-900 dark:text-amber-200">{awaiting} estimate{awaiting === 1 ? "" : "s"} awaiting a response.</p>}
          <div className="mt-6">
            {visibleEstimates.length === 0 ? <EmptySearchState label="No estimates match your search." /> : (
              <>
              {adminView && (
                <TableBulkBar
                  count={selection.selectedCount}
                  noun="estimate"
                  deleting={bulkDeleting}
                  onClear={selection.clear}
                  onDelete={handleBulkDelete}
                />
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    {adminView && (
                      <TableHead className="w-10">
                        <Checkbox
                          aria-label="Select all estimates"
                          checked={selection.allSelected}
                          indeterminate={selection.someSelected}
                          onChange={selection.toggleAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Estimate no.</TableHead>
                    <TableHead>Title</TableHead>
                    {adminView && <TableHead>Client</TableHead>}
                    <TableHead>Amount</TableHead>
                    <TableHead>Valid until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEstimates.map((estimate) => {
                    const meta = estimateStatusMeta[estimate.status] ?? estimateStatusMeta.draft
                    return (
                      <TableRow key={estimate.id}>
                        {adminView && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              aria-label={`Select estimate ${estimate.estimateNumber}`}
                              checked={selection.isSelected(estimate.id)}
                              onChange={() => selection.toggle(estimate.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium"><Link href={`/dashboard/estimates/${estimate.id}`} className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{estimate.estimateNumber}</Link></TableCell>
                        <TableCell>{estimate.title}</TableCell>
                        {adminView && <TableCell>{estimate.companyId ? <button type="button" onClick={() => setClientSheet(estimate.companyId)} className="rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{estimate.client || "Client"}</button> : "—"}</TableCell>}
                        <TableCell>{formatMoney(estimate.amount, estimate.currency)}</TableCell>
                        <TableCell>{formatDate(estimate.validUntil)}</TableCell>
                        <TableCell><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>{meta.label}</span></TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            <Link href={`/dashboard/estimates/${estimate.id}`} aria-label={`View estimate ${estimate.estimateNumber}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Eye className="size-4" aria-hidden="true" /></Link>
                            {adminView && <>
                              <Link href={`/dashboard/estimates/${estimate.id}/edit`} aria-label={`Edit estimate ${estimate.estimateNumber}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="size-4" aria-hidden="true" /></Link>
                              <button type="button" onClick={() => setDuplicateTarget(estimate)} aria-label={`Duplicate estimate ${estimate.estimateNumber}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Copy className="size-4" aria-hidden="true" /></button>
                              <button type="button" onClick={() => setConfirmDelete(estimate)} aria-label={`Delete estimate ${estimate.estimateNumber}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="size-4" aria-hidden="true" /></button>
                            </>}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </>
            )}
          </div>
        </>
      )}

      {adminView && <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this estimate?</AlertDialogTitle><AlertDialogDescription>{confirmDelete?.estimateNumber} will be removed for good. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void removeEstimate() }} disabled={deleting}>{deleting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}

      {adminView && (
        <DuplicateDocumentDialog
          open={duplicateTarget !== null}
          onOpenChange={(open) => !open && setDuplicateTarget(null)}
          title={`Duplicate ${duplicateTarget?.estimateNumber ?? "estimate"}`}
          description="Choose which client and project the copy belongs to."
          defaultCompanyId={duplicateTarget?.companyId ?? ""}
          defaultProjectId={duplicateTarget?.projectId}
          submitting={duplicating}
          onConfirm={confirmDuplicateEstimate}
        />
      )}

      {adminView && <UserEditorSheet open={clientSheet !== null} companyId={clientSheet ?? ""} onClose={() => setClientSheet(null)} onSaved={() => setClientSheet(null)} />}
    </main>
  )
}
