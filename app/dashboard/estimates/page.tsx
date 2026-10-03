"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ExternalLink, Mail, MoreHorizontal, Plus } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useRecordTitle } from "@/components/dashboard/page-title-context"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { CompactListRow } from "@/components/dashboard/compact-list-row"
import { DocumentSplitPane } from "@/components/dashboard/document-split-pane"
import { DuplicateDocumentDialog, type DuplicateSelection } from "@/components/dashboard/duplicate-document-dialog"
import { EstimateDocument } from "@/components/dashboard/estimate-document"
import { EstimateBuilder } from "@/components/dashboard/estimate-builder"
import { FirstRunState } from "@/components/dashboard/empty-state"
import { FilterBar, useFilterBar } from "@/components/dashboard/filter-bar"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createEstimate, deleteEstimate, estimateStatusMeta, formatMoney, getEstimates, getEstimatesByCompanyId, nextEstimateNumber, type Estimate } from "@/lib/billing"
import { estimateEmailContext } from "@/lib/document-emails"
import { buildEmailComposeHref } from "@/lib/email-composer"
import { getOrganizations, organizationRef, type Organization } from "@/lib/organizations"
import { formatTimestamp } from "@/lib/tasks"

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
  const [selectedId, setSelectedId] = useUrlSelection("estimate")
  const [confirmDelete, setConfirmDelete] = useState<Estimate | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<Estimate | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])

  const fetchData = useCallback(async () => {
    setError(false)
    try {
      if (adminView) {
        const [rows, organizationList] = await Promise.all([getEstimates(), getOrganizations()])
        setEstimates(rows)
        setOrganizations(organizationList)
      } else {
        setEstimates(await getEstimatesByCompanyId(companyId))
        setOrganizations([])
      }
    } catch (loadError) {
      console.error("Error loading estimates:", loadError)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [adminView, companyId])

  useEffect(() => { void fetchData() }, [fetchData])

  const organizationRefById = useMemo(() => new Map(organizations.map((organization) => [organization.id, organizationRef(organization)])), [organizations])
  const companyRefFor = (id: string) => organizationRefById.get(id) ?? id
  const { results: visibleEstimates, bar } = useFilterBar({ items: estimates, search: searchEstimate, sorts: [] })
  const selectedEstimate = selectedId ? estimates.find((estimate) => estimate.id === selectedId) ?? null : null
  useRecordTitle(selectedEstimate ? selectedEstimate.title || (selectedEstimate.estimateNumber ? `Estimate ${selectedEstimate.estimateNumber}` : "Estimate") : null)

  async function removeEstimate() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteEstimate(confirmDelete.id)
      setEstimates((current) => current.filter((row) => row.id !== confirmDelete.id))
      if (selectedId === confirmDelete.id) setSelectedId(null)
      setConfirmDelete(null)
    } catch (deleteError) {
      console.error("Error deleting estimate:", deleteError)
      toast.error("Couldn't delete this estimate.")
    } finally {
      setDeleting(false)
    }
  }

  async function confirmDuplicate(selectionValue: DuplicateSelection) {
    if (!duplicateTarget || duplicating) return
    setDuplicating(true)
    try {
      const estimateNumber = await nextEstimateNumber()
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = duplicateTarget
      const newId = await createEstimate({ ...rest, estimateNumber, status: "draft", shareEnabled: false, companyId: selectionValue.companyId, client: selectionValue.client || duplicateTarget.client, projectId: selectionValue.projectId, project: selectionValue.project })
      setDuplicateTarget(null)
      await fetchData()
      setSelectedId(newId)
    } catch (duplicateError) {
      console.error("Error duplicating estimate:", duplicateError)
      toast.error("Couldn't duplicate this estimate.")
    } finally {
      setDuplicating(false)
    }
  }

  if (!user) return null

  const estimateFilter = (
    <FilterBar
      {...bar}
      className="mb-0 h-16 border-b border-border"
      placeholder="Search estimates"
      actions={adminView && <Button asChild variant="ghost" className="bg-transparent text-foreground hover:bg-transparent"><Link href="/dashboard/estimates/new"><Plus className="size-4" aria-hidden="true" />New</Link></Button>}
    />
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      {error ? <p className="mt-10 text-sm text-destructive">Couldn’t load estimates right now.</p> : !loading && estimates.length === 0 ? (
        <>
          <div className="lg:max-w-[30rem]">{estimateFilter}</div>
          <FirstRunState label="Estimate" title={adminView ? "Let's create your first estimate" : "No estimates yet"} description={adminView ? "Price and scope work before it becomes an invoice." : "Estimates sent to you will show up here."} action={adminView ? <Button asChild><Link href="/dashboard/estimates/new">New estimate</Link></Button> : undefined} />
        </>
      ) : (
        <DocumentSplitPane
          visibleItems={loading ? [] : visibleEstimates}
          loading={loading}
          selectedId={selectedId}
          onClearSelection={() => setSelectedId(null)}
          sectionLabel="Estimates"
          filter={estimateFilter}
          emptySearchLabel="No estimates match your search."
          getKey={(estimate) => estimate.id}
          selectedTitle={selectedEstimate?.title || selectedEstimate?.estimateNumber || "Estimate"}
          headerActions={selectedEstimate && (
            <>
              {adminView && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Estimate actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setDuplicateTarget(selectedEstimate)}>Duplicate</DropdownMenuItem><DropdownMenuItem onSelect={() => router.push(`/dashboard/invoices/new?estimateId=${encodeURIComponent(selectedEstimate.id)}`)}>Convert to invoice</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(selectedEstimate)}>Delete estimate</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
              {adminView && <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Email estimate"><Link href={buildEmailComposeHref(estimateEmailContext(selectedEstimate, companyRefFor(selectedEstimate.companyId)))}><Mail className="size-4" /></Link></Button>}
              <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label={adminView ? "Edit estimate" : "Open estimate"}><Link href={adminView ? `/dashboard/estimates/${selectedEstimate.id}/edit` : `/dashboard/estimates/${selectedEstimate.id}`}><ExternalLink className="size-4" /></Link></Button>
            </>
          )}
          content={selectedEstimate ? (adminView ? <EstimateBuilder key={selectedEstimate.id} estimate={selectedEstimate} onSaved={(saved) => setEstimates((current) => current.map((row) => row.id === saved.id ? saved : row))} onDeleted={(id) => { setEstimates((current) => current.filter((row) => row.id !== id)); setSelectedId(null) }} /> : <EstimateDocument key={selectedEstimate.id} estimate={selectedEstimate} />) : null}
          renderItem={(estimate, active) => {
            return <CompactListRow
              title={estimate.title || "Untitled estimate"}
              subtitle={`${estimate.estimateNumber} · ${formatMoney(estimate.amount, estimate.currency)} · ${formatTimestamp(estimate.updatedAt ?? estimate.createdAt)}`}
              mobileSubtitle={formatTimestamp(estimate.updatedAt ?? estimate.createdAt)}
              active={active}
              onClick={() => setSelectedId(estimate.id)}
              menuLabel={`Options for ${estimate.title || estimate.estimateNumber}`}
              menu={<>
                <DropdownMenuItem onSelect={() => setSelectedId(estimate.id)}>Open estimate</DropdownMenuItem>
                {adminView && <DropdownMenuItem onSelect={() => router.push(`/dashboard/estimates/${estimate.id}/edit`)}>Edit estimate</DropdownMenuItem>}
                {adminView && <DropdownMenuItem onSelect={() => router.push(buildEmailComposeHref(estimateEmailContext(estimate, companyRefFor(estimate.companyId))))}>Email estimate</DropdownMenuItem>}
                {adminView && <DropdownMenuItem onSelect={() => setDuplicateTarget(estimate)}>Duplicate estimate</DropdownMenuItem>}
                {adminView && <DropdownMenuItem onSelect={() => router.push(`/dashboard/invoices/new?estimateId=${encodeURIComponent(estimate.id)}`)}>Convert to invoice</DropdownMenuItem>}
                {adminView && <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(estimate)}>Delete estimate</DropdownMenuItem>}
              </>}
            />
          }}
        />
      )}

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this estimate?</AlertDialogTitle><AlertDialogDescription>{confirmDelete?.estimateNumber} will be removed for good. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void removeEstimate() }} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <DuplicateDocumentDialog open={duplicateTarget !== null} onOpenChange={(open) => !open && setDuplicateTarget(null)} title={`Duplicate ${duplicateTarget?.estimateNumber ?? "estimate"}`} description="Choose which client and project the copy belongs to." defaultCompanyId={duplicateTarget?.companyId ?? ""} defaultProjectId={duplicateTarget?.projectId} submitting={duplicating} onConfirm={confirmDuplicate} />
    </main>
  )
}
