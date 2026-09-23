"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Copy, Eye, Loader2, Pencil, Plus, Receipt, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { DuplicateDocumentDialog, type DuplicateSelection } from "@/components/dashboard/duplicate-document-dialog"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
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
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createInvoice,
  deleteInvoice,
  formatDate,
  formatMoney,
  getInvoices,
  getInvoicesByCompanyId,
  invoiceStatusMeta,
  nextInvoiceNumber,
  type Invoice,
} from "@/lib/billing"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { Checkbox } from "@/components/ui/checkbox"
import { useRowSelection } from "@/hooks/use-row-selection"
import { cn } from "@/lib/utils"

const INVOICE_SORTS: SortOption<Invoice>[] = [
  { value: "issuedOn", label: "Issue date", get: (i) => i.issuedOn, ascLabel: "Oldest", descLabel: "Newest" },
  { value: "dueOn", label: "Due date", get: (i) => i.dueOn, ascLabel: "Soonest", descLabel: "Latest" },
  { value: "invoiceNumber", label: "Invoice no.", get: (i) => i.invoiceNumber, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "client", label: "Client", get: (i) => i.client || i.companyId, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "amount", label: "Amount", get: (i) => i.amount ?? 0, ascLabel: "Lowest", descLabel: "Highest" },
  {
    value: "status",
    label: "Status",
    get: (i) => invoiceStatusMeta[i.status]?.label ?? i.status,
    ascLabel: "A–Z",
    descLabel: "Z–A",
  },
]

function searchInvoice(i: Invoice) {
  return [i.invoiceNumber, i.client, i.companyId, i.project, i.poReference, invoiceStatusMeta[i.status]?.label]
}

export default function InvoicesPage() {
  const router = useRouter()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const companyId = appUser?.companyId ?? ""
  const adminView = isAdmin && !isImpersonating

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null)
  const [clientSheet, setClientSheet] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<Invoice | null>(null)
  const [duplicating, setDuplicating] = useState(false)

  const fetchData = useCallback(async () => {
    setError(false)
    try {
      setInvoices(adminView ? await getInvoices() : await getInvoicesByCompanyId(companyId))
    } catch (err) {
      console.error("Error loading invoices:", err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [adminView, companyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function confirmDuplicateInvoice(selection: DuplicateSelection) {
    if (!duplicateTarget || duplicating) return
    setDuplicating(true)
    try {
      const invoiceNumber = await nextInvoiceNumber()
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = duplicateTarget
      const newId = await createInvoice({
        ...rest,
        invoiceNumber,
        status: "draft",
        shareEnabled: false,
        companyId: selection.companyId,
        client: selection.client || duplicateTarget.client,
        projectId: selection.projectId,
        project: selection.project,
      })
      setDuplicateTarget(null)
      router.push(`/dashboard/invoices/${newId}/edit`)
    } catch (err) {
      console.error("Error duplicating invoice:", err)
      toast.error("Couldn't duplicate this invoice.")
    } finally {
      setDuplicating(false)
    }
  }

  async function removeInvoice() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteInvoice(confirmDelete.id)
      setInvoices((current) => current.filter((row) => row.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err) {
      console.error("Error deleting invoice:", err)
    } finally {
      setDeleting(false)
    }
  }

  const sorts = useMemo(
    () => (adminView ? INVOICE_SORTS : INVOICE_SORTS.filter((option) => option.value !== "client")),
    [adminView],
  )
  const { results: visibleInvoices, bar } = useFilterBar({
    items: invoices,
    search: searchInvoice,
    sorts,
    defaultSort: "issuedOn",
    defaultDirection: "desc",
  })

  const selection = useRowSelection(visibleInvoices, (invoice) => invoice.id)

  async function handleBulkDelete() {
    const ids = selection.selectedIds
    if (ids.length === 0 || bulkDeleting) return
    setBulkDeleting(true)
    try {
      await Promise.all(ids.map((id) => deleteInvoice(id)))
      const removed = new Set(ids)
      setInvoices((current) => current.filter((row) => !removed.has(row.id)))
      if (confirmDelete && removed.has(confirmDelete.id)) setConfirmDelete(null)
      selection.clear()
    } catch (err) {
      console.error("Error deleting invoices:", err)
    } finally {
      setBulkDeleting(false)
    }
  }

  if (!user) return null

  const unpaid = invoices.filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
  const outstanding = unpaid.reduce((total, invoice) => total + (invoice.amount ?? 0), 0)
  const currency = invoices[0]?.currency || "USD"

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-12 sm:px-6">
      <FilterBar
        {...bar}
        mobileVariant="drawer"
        headerOnMobile
        showSearch={false}
        placeholder="Search invoices"
        actions={
          adminView && (
            <Button asChild variant="ghost" size="icon" className="bg-transparent text-foreground hover:bg-transparent" aria-label="New invoice" title="New invoice">
              <Link href="/dashboard/invoices/new"><Plus className="size-4" aria-hidden="true" /></Link>
            </Button>
          )
        }
      />

      {loading ? (
        <DashboardPageSkeleton rows={6} />
      ) : error ? (
        <p className="mt-10 text-sm text-destructive">Couldn&apos;t load invoices right now.</p>
      ) : invoices.length === 0 ? (
        <FirstRunState
          className="mt-8"
          label="Invoice"
          title={adminView ? "Let's raise your first invoice" : "No invoices yet"}
          description={
            adminView
              ? "This is where you bill clients. Issue an invoice, keep track of what's outstanding, and mark it paid once the money lands."
              : "Invoices issued to you will show up here."
          }
          action={
            adminView ? (
              <Button asChild>
                <Link href="/dashboard/invoices/new">New Invoice</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {outstanding > 0 && (
            <p className="mt-6 rounded-[12px] bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-900 dark:text-amber-200">
              {formatMoney(outstanding, currency)} outstanding across {unpaid.length} invoice
              {unpaid.length === 1 ? "" : "s"}.
            </p>
          )}

          <div className="mt-6">
            {visibleInvoices.length === 0 ? (
              <EmptySearchState label="No invoices match your search." />
            ) : (
              <>
                {adminView && (
                  <TableBulkBar
                    count={selection.selectedCount}
                    noun="invoice"
                    deleting={bulkDeleting}
                    onClear={selection.clear}
                    onDelete={handleBulkDelete}
                  />
                )}
                <div className="space-y-2 sm:hidden">
                  {visibleInvoices.map((invoice) => {
                    const meta = invoiceStatusMeta[invoice.status] ?? invoiceStatusMeta.draft
                    const href = adminView ? `/dashboard/invoices/${invoice.id}/edit` : `/dashboard/invoices/${invoice.id}`
                    return (
                      <MobileDataCard
                        key={invoice.id}
                        href={href}
                        ariaLabel={`Open invoice ${invoice.invoiceNumber}`}
                        title={
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate">{adminView ? invoice.client || invoice.invoiceNumber : invoice.invoiceNumber}</span>
                            <span className="shrink-0 font-medium">{formatMoney(invoice.amount, invoice.currency)}</span>
                          </span>
                        }
                        subtitle={
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate">{adminView ? invoice.invoiceNumber : invoice.project || formatDate(invoice.issuedOn)} · Due {formatDate(invoice.dueOn)}</span>
                            <span className={cn("shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium", meta.className)}>{meta.label}</span>
                          </span>
                        }
                        icon={<Receipt className="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
                        menuLabel={`Options for ${invoice.invoiceNumber}`}
                        menu={
                          <>
                            <DropdownMenuItem onSelect={() => router.push(`/dashboard/invoices/${invoice.id}`)}>View invoice</DropdownMenuItem>
                            {adminView && (
                              <>
                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}>Edit invoice</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setDuplicateTarget(invoice)}>Duplicate</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(invoice)}>Delete invoice</DropdownMenuItem>
                              </>
                            )}
                          </>
                        }
                      />
                    )
                  })}
                </div>
                <div className="hidden sm:block">
                <Table>
                <TableHeader>
                  <TableRow>
                    {adminView && (
                      <TableHead className="w-10">
                        <Checkbox
                          aria-label="Select all invoices"
                          checked={selection.allSelected}
                          indeterminate={selection.someSelected}
                          onChange={selection.toggleAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Invoice no.</TableHead>
                    {adminView && <TableHead>Client</TableHead>}
                    <TableHead>Project</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-24 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleInvoices.map((invoice) => {
                    const meta = invoiceStatusMeta[invoice.status] ?? invoiceStatusMeta.draft
                    return (
                      <TableRow key={invoice.id}>
                        {adminView && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              aria-label={`Select invoice ${invoice.invoiceNumber}`}
                              checked={selection.isSelected(invoice.id)}
                              onChange={() => selection.toggle(invoice.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <Link
                            href={
                              adminView
                                ? `/dashboard/invoices/${invoice.id}/edit`
                                : `/dashboard/invoices/${invoice.id}`
                            }
                            className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        {adminView && (
                          <TableCell>
                            {invoice.companyId ? (
                              <button
                                type="button"
                                onClick={() => setClientSheet(invoice.companyId)}
                                className="rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {invoice.client || "Client"}
                              </button>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          {invoice.projectId ? (
                            <Link
                              href={`/dashboard/projects/${invoice.projectId}`}
                              className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {invoice.project || "Project"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{formatDate(invoice.issuedOn)}</TableCell>
                        <TableCell>{formatDate(invoice.dueOn)}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(invoice.amount, invoice.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            <Link
                              href={`/dashboard/invoices/${invoice.id}`}
                              aria-label={`View invoice ${invoice.invoiceNumber}`}
                              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Eye className="size-4" aria-hidden="true" />
                            </Link>
                            {adminView && (
                              <>
                                <Link
                                  href={`/dashboard/invoices/${invoice.id}/edit`}
                                  aria-label={`Edit invoice ${invoice.invoiceNumber}`}
                                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Pencil className="size-4" aria-hidden="true" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setDuplicateTarget(invoice)}
                                  aria-label={`Duplicate invoice ${invoice.invoiceNumber}`}
                                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Copy className="size-4" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(invoice)}
                                  aria-label={`Delete invoice ${invoice.invoiceNumber}`}
                                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <Trash2 className="size-4" aria-hidden="true" />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
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
                <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmDelete?.invoiceNumber} will be removed for good. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault()
                    removeInvoice()
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
            title={`Duplicate ${duplicateTarget?.invoiceNumber ?? "invoice"}`}
            description="Choose which client and project the copy belongs to."
            defaultCompanyId={duplicateTarget?.companyId ?? ""}
            defaultProjectId={duplicateTarget?.projectId}
            submitting={duplicating}
            onConfirm={confirmDuplicateInvoice}
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
