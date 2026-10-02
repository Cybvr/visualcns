"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ExternalLink, Mail, MoreHorizontal, Plus } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { DocumentSplitPane } from "@/components/dashboard/document-split-pane"
import { DuplicateDocumentDialog, type DuplicateSelection } from "@/components/dashboard/duplicate-document-dialog"
import { FirstRunState } from "@/components/dashboard/empty-state"
import { FilterBar, useFilterBar } from "@/components/dashboard/filter-bar"
import { InvoiceBuilder } from "@/components/dashboard/invoice-builder"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRowSelection } from "@/hooks/use-row-selection"
import { createInvoice, deleteInvoice, formatMoney, getInvoices, getInvoicesByCompanyId, invoiceStatusMeta, nextInvoiceNumber, type Invoice } from "@/lib/billing"
import { invoiceEmailContext } from "@/lib/document-emails"
import { buildEmailComposeHref } from "@/lib/email-composer"
import { getExchangeRate } from "@/lib/currency"
import { getOrganizations, organizationRef, type Organization } from "@/lib/organizations"
import { formatTimestamp } from "@/lib/tasks"
import { cn } from "@/lib/utils"

function OutstandingSummary({ invoices }: { invoices: Invoice[] }) {
  const unpaid = invoices.filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
  const targetCurrency = unpaid[0]?.currency || "USD"
  const currencies = [...new Set(unpaid.map((invoice) => invoice.currency || "USD"))]
  const [summary, setSummary] = useState<{ amount: number; currency: string; converted: boolean } | null>(null)
  const [conversionError, setConversionError] = useState(false)

  useEffect(() => {
    let active = true
    setSummary(null)
    setConversionError(false)
    if (!unpaid.length) return () => { active = false }
    async function calculate() {
      try {
        const rates = Object.fromEntries(await Promise.all(currencies.filter((currency) => currency !== targetCurrency).map(async (currency) => [currency, await getExchangeRate(currency, targetCurrency)] as const)))
      const amount = unpaid.reduce((total, invoice) => total + Math.round((invoice.amount ?? 0) * (rates[invoice.currency || "USD"] ?? 1)), 0)
        if (active) setSummary({ amount, currency: targetCurrency, converted: currencies.length > 1 })
      } catch {
        if (active) setConversionError(true)
      }
    }
    void calculate()
    return () => { active = false }
  }, [invoices, targetCurrency, currencies.join(",")])

  if (!unpaid.length) return null
  if (conversionError) return <p className="mb-4 rounded-[12px] bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-900 dark:text-amber-200">{currencies.map((currency) => formatMoney(unpaid.filter((invoice) => (invoice.currency || "USD") === currency).reduce((total, invoice) => total + (invoice.amount ?? 0), 0), currency)).join(" · ")} outstanding across {unpaid.length} invoices.</p>
  if (!summary) return <p className="mb-4 rounded-[12px] bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-900 dark:text-amber-200">Calculating outstanding balance across {unpaid.length} invoices…</p>
  return <p className="mb-4 rounded-[12px] bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-900 dark:text-amber-200">{formatMoney(summary.amount, summary.currency)} outstanding across {unpaid.length} invoice{unpaid.length === 1 ? "" : "s"}{summary.converted ? ` (converted to ${summary.currency})` : ""}.</p>
}

function searchInvoice(invoice: Invoice) {
  return [invoice.invoiceNumber, invoice.title, invoice.client, invoice.companyId, invoice.project, invoice.poReference, invoiceStatusMeta[invoice.status]?.label]
}

export default function InvoicesPage() {
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const companyId = appUser?.companyId ?? ""
  const adminView = isAdmin && !isImpersonating
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<Invoice | null>(null)
  const [duplicating, setDuplicating] = useState(false)

  const fetchData = useCallback(async () => {
    setError(false)
    try {
      if (adminView) {
        const [rows, organizationList] = await Promise.all([getInvoices(), getOrganizations()])
        setInvoices(rows)
        setOrganizations(organizationList)
      } else {
        setInvoices(await getInvoicesByCompanyId(companyId))
        setOrganizations([])
      }
    } catch (loadError) {
      console.error("Error loading invoices:", loadError)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [adminView, companyId])

  useEffect(() => { void fetchData() }, [fetchData])

  const organizationRefById = useMemo(() => new Map(organizations.map((organization) => [organization.id, organizationRef(organization)])), [organizations])
  const companyRefFor = (id: string) => organizationRefById.get(id) ?? id
  const { results: visibleInvoices, bar } = useFilterBar({ items: invoices, search: searchInvoice, sorts: [] })
  const selection = useRowSelection(visibleInvoices, (invoice) => invoice.id)
  const selectedInvoice = selectedId ? invoices.find((invoice) => invoice.id === selectedId) ?? null : null

  async function removeInvoice() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteInvoice(confirmDelete.id)
      setInvoices((current) => current.filter((row) => row.id !== confirmDelete.id))
      if (selectedId === confirmDelete.id) setSelectedId(null)
      setConfirmDelete(null)
    } catch (deleteError) {
      console.error("Error deleting invoice:", deleteError)
      toast.error("Couldn't delete this invoice.")
    } finally {
      setDeleting(false)
    }
  }

  async function handleBulkDelete() {
    const ids = selection.selectedIds
    if (!ids.length || bulkDeleting) return
    setBulkDeleting(true)
    try {
      await Promise.all(ids.map((id) => deleteInvoice(id)))
      const removed = new Set(ids)
      setInvoices((current) => current.filter((row) => !removed.has(row.id)))
      if (selectedId && removed.has(selectedId)) setSelectedId(null)
      selection.clear()
    } catch (deleteError) {
      console.error("Error deleting invoices:", deleteError)
      toast.error("Couldn't delete the selected invoices.")
    } finally {
      setBulkDeleting(false)
    }
  }

  async function confirmDuplicate(selectionValue: DuplicateSelection) {
    if (!duplicateTarget || duplicating) return
    setDuplicating(true)
    try {
      const invoiceNumber = await nextInvoiceNumber()
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = duplicateTarget
      const newId = await createInvoice({ ...rest, invoiceNumber, status: "draft", shareEnabled: false, companyId: selectionValue.companyId, client: selectionValue.client || duplicateTarget.client, projectId: selectionValue.projectId, project: selectionValue.project })
      setDuplicateTarget(null)
      await fetchData()
      setSelectedId(newId)
    } catch (duplicateError) {
      console.error("Error duplicating invoice:", duplicateError)
      toast.error("Couldn't duplicate this invoice.")
    } finally {
      setDuplicating(false)
    }
  }

  if (!user) return null

  const invoiceFilter = (
    <FilterBar
      {...bar}
      className="mb-0 h-16 border-b border-border"
      placeholder="Search invoices"
      actions={adminView && <Button asChild variant="ghost" className="bg-transparent text-foreground hover:bg-transparent"><Link href="/dashboard/invoices/new" aria-label="New invoice"><Plus className="size-4" aria-hidden="true" />New</Link></Button>}
    />
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      {loading ? <DashboardPageSkeleton rows={6} /> : error ? <p className="mt-10 text-sm text-destructive">Couldn’t load invoices right now.</p> : invoices.length === 0 ? (
        <>
          <div className="lg:max-w-[30rem]">{invoiceFilter}</div>
          <FirstRunState label="Invoice" title={adminView ? "Let's raise your first invoice" : "No invoices yet"} description={adminView ? "This is where you bill clients and track what’s outstanding." : "Invoices issued to you will show up here."} action={adminView ? <Button asChild><Link href="/dashboard/invoices/new">New invoice</Link></Button> : undefined} />
        </>
      ) : (
        <>
          <OutstandingSummary invoices={invoices} />
          <DocumentSplitPane
            visibleItems={visibleInvoices}
            selectedId={selectedId}
            onClearSelection={() => setSelectedId(null)}
            sectionLabel="Invoices"
            filter={invoiceFilter}
            listExtra={adminView ? <TableBulkBar count={selection.selectedCount} noun="invoice" deleting={bulkDeleting} onClear={selection.clear} onDelete={handleBulkDelete} /> : undefined}
            emptySearchLabel="No invoices match your search."
            getKey={(invoice) => invoice.id}
            selectedTitle={selectedInvoice?.title || selectedInvoice?.invoiceNumber || "Invoice"}
            headerActions={selectedInvoice && (
              <>
                {adminView && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Invoice actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setDuplicateTarget(selectedInvoice)}>Duplicate</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(selectedInvoice)}>Delete invoice</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
                {adminView && <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Email invoice"><Link href={buildEmailComposeHref(invoiceEmailContext(selectedInvoice, companyRefFor(selectedInvoice.companyId)))}><Mail className="size-4" /></Link></Button>}
                <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label={adminView ? "Edit invoice" : "Open invoice"}><Link href={adminView ? `/dashboard/invoices/${selectedInvoice.id}/edit` : `/dashboard/invoices/${selectedInvoice.id}`}><ExternalLink className="size-4" /></Link></Button>
              </>
            )}
            content={selectedInvoice ? (adminView ? <InvoiceBuilder invoice={selectedInvoice} /> : <InvoiceDocument invoice={selectedInvoice} />) : null}
            renderItem={(invoice, active) => {
              const meta = invoiceStatusMeta[invoice.status] ?? invoiceStatusMeta.draft
              return <div className={cn("flex items-center gap-2 border-b border-border/60 px-1 py-2 transition-colors hover:bg-muted/50", active && "bg-muted/50")}>
                {adminView && <Checkbox aria-label={`Select invoice ${invoice.invoiceNumber}`} checked={selection.isSelected(invoice.id)} onChange={() => selection.toggle(invoice.id)} />}
                <button type="button" onClick={() => setSelectedId(invoice.id)} aria-current={active ? "true" : undefined} className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className={cn("sidebar-nav-label block truncate font-medium text-sidebar-foreground/70", active && "text-sidebar-accent-foreground")}>{invoice.title || "Untitled invoice"}</span>
                  <span className="block truncate text-[10px] font-normal leading-tight text-muted-foreground">{invoice.invoiceNumber} · {formatMoney(invoice.amount, invoice.currency)} · {formatTimestamp(invoice.updatedAt ?? invoice.createdAt)}</span>
                </button>
                <span className={cn("shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium", meta.className)}>{meta.label}</span>
              </div>
            }}
          />
        </>
      )}

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this invoice?</AlertDialogTitle><AlertDialogDescription>{confirmDelete?.invoiceNumber} will be removed for good. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void removeInvoice() }} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <DuplicateDocumentDialog open={duplicateTarget !== null} onOpenChange={(open) => !open && setDuplicateTarget(null)} title={`Duplicate ${duplicateTarget?.invoiceNumber ?? "invoice"}`} description="Choose which client and project the copy belongs to." defaultCompanyId={duplicateTarget?.companyId ?? ""} defaultProjectId={duplicateTarget?.projectId} submitting={duplicating} onConfirm={confirmDuplicate} />
    </main>
  )
}
