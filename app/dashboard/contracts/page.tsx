"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { DuplicateDocumentDialog, type DuplicateSelection } from "@/components/dashboard/duplicate-document-dialog"
import { MobileCardsSkeleton } from "@/components/dashboard/collection-skeletons"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { CompactListSkeleton, InitialAvatar, MOBILE_LIST_CARD, MobileListRow } from "@/components/dashboard/compact-list-row"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { UserEditorSheet } from "@/components/dashboard/user-editor-sheet"
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
import {
  contractStatusMeta,
  createContract,
  deleteContract,
  formatDate,
  getContracts,
  getContractsByCompanyId,
  type Contract,
} from "@/lib/billing"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { Checkbox } from "@/components/ui/checkbox"
import { useRowSelection } from "@/hooks/use-row-selection"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

const CONTRACT_SORTS: SortOption<Contract>[] = [
  {
    value: "updatedAt",
    label: "Last modified",
    get: (c) => Math.max(tsToMillis(c.updatedAt), tsToMillis(c.createdAt)),
    ascLabel: "Oldest",
    descLabel: "Newest",
  },
  { value: "title", label: "Title", get: (c) => c.title, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "client", label: "Client", get: (c) => c.client || c.companyId, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "startsOn", label: "Start date", get: (c) => c.startsOn, ascLabel: "Oldest", descLabel: "Newest" },
  { value: "endsOn", label: "End date", get: (c) => c.endsOn, ascLabel: "Soonest", descLabel: "Latest" },
  {
    value: "status",
    label: "Status",
    get: (c) => contractStatusMeta[c.status]?.label ?? c.status,
    ascLabel: "A–Z",
    descLabel: "Z–A",
  },
]

function searchContract(c: Contract) {
  return [c.title, c.client, c.companyId, c.project, contractStatusMeta[c.status]?.label]
}

export default function ContractsPage() {
  const router = useRouter()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const companyId = appUser?.companyId ?? ""
  const adminView = isAdmin && !isImpersonating

  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Contract | null>(null)
  const [clientSheet, setClientSheet] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<Contract | null>(null)
  const [duplicating, setDuplicating] = useState(false)

  const fetchData = useCallback(async () => {
    setError(false)
    try {
      setContracts(adminView ? await getContracts() : await getContractsByCompanyId(companyId))
    } catch (err) {
      console.error("Error loading contracts:", err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [adminView, companyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function confirmDuplicateContract(selection: DuplicateSelection) {
    if (!duplicateTarget || duplicating) return
    setDuplicating(true)
    try {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = duplicateTarget
      const newId = await createContract({
        ...rest,
        title: `${duplicateTarget.title} (Copy)`,
        status: "draft",
        signedOn: "",
        shareEnabled: false,
        companyId: selection.companyId,
        client: selection.client || duplicateTarget.client,
        projectId: selection.projectId,
        project: selection.project,
      })
      setDuplicateTarget(null)
      router.push(`/dashboard/contracts/${newId}/edit`)
    } catch (duplicateError) {
      console.error("Error duplicating contract:", duplicateError)
      toast.error("Couldn't duplicate this contract.")
    } finally {
      setDuplicating(false)
    }
  }

  async function removeContract() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteContract(confirmDelete.id)
      setContracts((current) => current.filter((row) => row.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err) {
      console.error("Error deleting contract:", err)
    } finally {
      setDeleting(false)
    }
  }


  const sorts = useMemo(
    () => (adminView ? CONTRACT_SORTS : CONTRACT_SORTS.filter((option) => option.value !== "client")),
    [adminView],
  )
  const { results: visibleContracts, bar } = useFilterBar({
    items: contracts,
    search: searchContract,
    sorts,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })

  const selection = useRowSelection(visibleContracts, (contract) => contract.id)

  async function handleBulkDelete() {
    const ids = selection.selectedIds
    if (ids.length === 0 || bulkDeleting) return
    setBulkDeleting(true)
    try {
      await Promise.all(ids.map((id) => deleteContract(id)))
      const removed = new Set(ids)
      setContracts((current) => current.filter((row) => !removed.has(row.id)))
      if (confirmDelete && removed.has(confirmDelete.id)) setConfirmDelete(null)
      selection.clear()
    } catch (err) {
      console.error("Error deleting contracts:", err)
    } finally {
      setBulkDeleting(false)
    }
  }

  if (!user) return null

  const awaiting = contracts.filter((contract) => contract.status === "sent").length

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-12 sm:px-6">
      <TableFilterBar
        {...bar}
        placeholder="Search contracts"
        createAction={adminView ? { label: "New contract", href: "/dashboard/contracts/new" } : undefined}
      />

      {loading ? (
        <div className="mt-6">
          <div className="sm:hidden"><CompactListSkeleton /></div>
          <div className="hidden sm:block"><MobileCardsSkeleton /></div>
        </div>
      ) : error ? (
        <p className="mt-10 text-sm text-destructive">Couldn&apos;t load contracts right now.</p>
      ) : contracts.length === 0 ? (
        <FirstRunState
          className="mt-8"
          label="Contract"
          title={adminView ? "Let's create your first contract" : "No contracts yet"}
          description={
            adminView
              ? "The agreements you send clients before work starts. Write one here or link one you already hold, then follow it through to signature."
              : "Contracts sent to you will show up here."
          }
          action={
            adminView ? (
              <Button asChild>
                <Link href="/dashboard/contracts/new">New Contract</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {awaiting > 0 && (
            <p className="mt-6 rounded-[12px] bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-900 dark:text-amber-200">
              {awaiting} contract{awaiting === 1 ? "" : "s"} waiting on a signature.
            </p>
          )}

          <div className="mt-6">
            {visibleContracts.length === 0 ? (
              <EmptySearchState label="No contracts match your search." />
            ) : (
              <>
                {adminView && (
                  <TableBulkBar
                    count={selection.selectedCount}
                    noun="contract"
                    deleting={bulkDeleting}
                    onClear={selection.clear}
                    onDelete={handleBulkDelete}
                  />
                )}
                <ul className={cn(MOBILE_LIST_CARD, "sm:hidden")}>
                  {visibleContracts.map((contract) => {
                    const meta = contractStatusMeta[contract.status] ?? contractStatusMeta.draft
                    const href = adminView ? `/dashboard/contracts/${contract.id}/edit` : `/dashboard/contracts/${contract.id}`
                    return (
                      <li key={contract.id}>
                        <MobileListRow
                          href={href}
                          ariaLabel={`Open contract ${contract.title}`}
                          avatar={<InitialAvatar text={(adminView ? contract.client : "") || contract.title} />}
                          avatarLabel={`Options for ${contract.title}`}
                          title={contract.title}
                          meta={<span className={cn("rounded-full px-1.5 py-px text-[10px] font-medium", meta.className)}>{meta.label}</span>}
                          lines={[
                            [adminView ? contract.client : "", contract.project].filter(Boolean).join(" · ") || undefined,
                            contract.endsOn ? `Ends ${formatDate(contract.endsOn)}` : `Modified ${formatTimestamp(contract.updatedAt ?? contract.createdAt)}`,
                          ]}
                          avatarMenu={
                            <>
                              <DropdownMenuItem onSelect={() => router.push(`/dashboard/contracts/${contract.id}`)}>View contract</DropdownMenuItem>
                              {contract.url && (
                                <DropdownMenuItem onSelect={() => window.open(contract.url, "_blank", "noopener,noreferrer")}>Open source link</DropdownMenuItem>
                              )}
                              {adminView && (
                                <>
                                  <DropdownMenuItem onSelect={() => router.push(`/dashboard/contracts/${contract.id}/edit`)}>Edit contract</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setDuplicateTarget(contract)}>Duplicate</DropdownMenuItem>
                                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(contract)}>Delete contract</DropdownMenuItem>
                                </>
                              )}
                            </>
                          }
                        />
                      </li>
                    )
                  })}
                </ul>
                <div className="hidden space-y-2 sm:block">
                  {adminView && (
                    <label className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                      <Checkbox aria-label="Select all contracts" checked={selection.allSelected} indeterminate={selection.someSelected} onChange={selection.toggleAll} />
                      Select all contracts
                    </label>
                  )}
                  {visibleContracts.map((contract) => {
                    const meta = contractStatusMeta[contract.status] ?? contractStatusMeta.draft
                    const href = adminView ? `/dashboard/contracts/${contract.id}/edit` : `/dashboard/contracts/${contract.id}`
                    const selected = selection.isSelected(contract.id)
                    return <MobileDataCard
                      key={contract.id}
                      surface="muted"
                      iconShape="circle"
                      icon={<InitialAvatar text={(adminView ? contract.client : "") || contract.title} className="size-11" />}
                      title={contract.title}
                      subtitle={[adminView && contract.client, contract.project].filter(Boolean).join(" · ") || "No project"}
                      description={[`Starts ${formatDate(contract.startsOn)}`, `Ends ${formatDate(contract.endsOn)}`, contract.signedOn && `Signed ${formatDate(contract.signedOn)}`].filter(Boolean).join(" · ")}
                      trailing={meta.label}
                      selected={selected}
                      pressed={selected}
                      onClick={(event) => adminView && selection.selectedCount > 0 ? selection.toggle(contract.id, event.shiftKey) : router.push(href)}
                      ariaLabel={`Open contract ${contract.title}`}
                      menuLabel={`Options for ${contract.title}`}
                      menu={<>
                        <DropdownMenuItem onSelect={() => router.push(`/dashboard/contracts/${contract.id}`)}>View contract</DropdownMenuItem>
                        {contract.url && <DropdownMenuItem onSelect={() => window.open(contract.url, "_blank", "noopener,noreferrer")}>Open source link</DropdownMenuItem>}
                        {contract.projectId && <DropdownMenuItem onSelect={() => router.push(`/dashboard/projects/${contract.projectId}`)}>View project</DropdownMenuItem>}
                        {adminView && <>
                          {contract.companyId && <DropdownMenuItem onSelect={() => setClientSheet(contract.companyId)}>View client</DropdownMenuItem>}
                          <DropdownMenuItem onSelect={() => router.push(`/dashboard/contracts/${contract.id}/edit`)}>Edit contract</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => selection.toggle(contract.id)}>{selected ? "Deselect" : "Select"}</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDuplicateTarget(contract)}>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(contract)}>Delete contract</DropdownMenuItem>
                        </>}
                      </>}
                    />
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {adminView && (
        <>

          <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this contract?</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmDelete?.title} will be removed for good. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault()
                    removeContract()
                  }}
                  disabled={deleting}
                >
                  {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DuplicateDocumentDialog
            open={duplicateTarget !== null}
            onOpenChange={(open) => !open && setDuplicateTarget(null)}
            title={`Duplicate ${duplicateTarget?.title ?? "contract"}`}
            description="Choose which client and project the copy belongs to."
            defaultCompanyId={duplicateTarget?.companyId ?? ""}
            defaultProjectId={duplicateTarget?.projectId}
            submitting={duplicating}
            onConfirm={confirmDuplicateContract}
          />
        </>
      )}

      {adminView && (
        <UserEditorSheet
          open={clientSheet !== null}
          companyId={clientSheet ?? ""}
          onClose={() => setClientSheet(null)}
          onSaved={() => setClientSheet(null)}
        />
      )}
    </main>
  )
}
