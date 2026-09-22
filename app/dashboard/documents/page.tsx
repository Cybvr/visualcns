"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createElement } from "react"
import { ChevronDown, Eye, FileUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { FaFileAlt, FaFileInvoiceDollar, FaFileSignature } from "react-icons/fa"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { DriveView } from "@/components/dashboard/drive-view"
import { FirstRunState } from "@/components/dashboard/empty-state"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { ImportWordDocumentDialog } from "@/components/dashboard/import-word-document-dialog"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserEditorSheet } from "@/components/dashboard/user-editor-sheet"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  contractStatusMeta,
  deleteContract,
  deleteEstimate,
  deleteInvoice,
  estimateStatusMeta,
  formatDate,
  getContracts,
  getContractsByCompanyId,
  getEstimates,
  getEstimatesByCompanyId,
  getInvoices,
  getInvoicesByCompanyId,
  invoiceStatusMeta,
  type Contract,
  type Estimate,
  type Invoice,
} from "@/lib/billing"
import {
  companyDocumentKindMeta,
  companyDocumentStatusMeta,
  deleteCompanyDocument,
  getCompanyDocuments,
  getCompanyDocumentsByCompanyId,
  type CompanyDocument,
  type CompanyDocumentKind,
} from "@/lib/company-documents"
import { tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

type Tab = "all" | "document" | "contract" | "invoice" | "estimate" | "media"

const TYPE_OPTIONS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "document", label: "Documents" },
  { key: "contract", label: "Contracts" },
  { key: "invoice", label: "Invoices" },
  { key: "estimate", label: "Estimates" },
  { key: "media", label: "Media" },
]

type RowKind = "contract" | "invoice" | "estimate" | CompanyDocumentKind

const KIND_LABEL: Record<RowKind, string> = {
  contract: "Contract",
  invoice: "Invoice",
  estimate: "Estimate",
  proposal: companyDocumentKindMeta.proposal.label,
  sow: companyDocumentKindMeta.sow.label,
  brief: companyDocumentKindMeta.brief.label,
  report: companyDocumentKindMeta.report.label,
  other: companyDocumentKindMeta.other.label,
}

const KIND_ICON = {
  contract: FaFileSignature,
  invoice: FaFileInvoiceDollar,
  estimate: FaFileAlt,
  proposal: FaFileAlt,
  sow: FaFileAlt,
  brief: FaFileAlt,
  report: FaFileAlt,
  other: FaFileAlt,
}

const KIND_ICON_COLOR: Record<RowKind, string> = {
  contract: "text-violet-600 dark:text-violet-400",
  invoice: "text-emerald-600 dark:text-emerald-400",
  estimate: "text-amber-600 dark:text-amber-400",
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

interface UnifiedRow {
  id: string
  kind: RowKind
  title: string
  company: string
  companyId: string
  statusLabel?: string
  statusClassName?: string
  updatedAtMs: number
  viewHref: string
  editHref?: string
}

function companyDocToRow(d: CompanyDocument, adminView: boolean): UnifiedRow {
  const meta = companyDocumentStatusMeta[d.status] ?? companyDocumentStatusMeta.draft
  return {
    id: d.id,
    kind: d.kind,
    title: d.title,
    company: d.client || d.companyId,
    companyId: d.companyId,
    statusLabel: meta.label,
    statusClassName: meta.className,
    updatedAtMs: tsToMillis(d.updatedAt) || tsToMillis(d.createdAt),
    viewHref: `/dashboard/documents/${d.id}`,
    editHref: adminView ? `/dashboard/documents/${d.id}/edit` : undefined,
  }
}

function contractToRow(c: Contract, adminView: boolean): UnifiedRow {
  const meta = contractStatusMeta[c.status] ?? contractStatusMeta.draft
  return {
    id: c.id,
    kind: "contract",
    title: c.title,
    company: c.client || c.companyId,
    companyId: c.companyId,
    statusLabel: meta.label,
    statusClassName: meta.className,
    updatedAtMs: tsToMillis(c.updatedAt) || tsToMillis(c.createdAt),
    viewHref: `/dashboard/contracts/${c.id}`,
    editHref: adminView ? `/dashboard/contracts/${c.id}/edit` : undefined,
  }
}

function invoiceToRow(i: Invoice, adminView: boolean): UnifiedRow {
  const meta = invoiceStatusMeta[i.status] ?? invoiceStatusMeta.draft
  return {
    id: i.id,
    kind: "invoice",
    title: `Invoice ${i.invoiceNumber}`,
    company: i.client || i.companyId,
    companyId: i.companyId,
    statusLabel: meta.label,
    statusClassName: meta.className,
    updatedAtMs: tsToMillis(i.updatedAt) || tsToMillis(i.createdAt),
    viewHref: `/dashboard/invoices/${i.id}`,
    editHref: adminView ? `/dashboard/invoices/${i.id}/edit` : undefined,
  }
}

function estimateToRow(e: Estimate, adminView: boolean): UnifiedRow {
  const meta = estimateStatusMeta[e.status] ?? estimateStatusMeta.draft
  return {
    id: e.id,
    kind: "estimate",
    title: e.title || `Estimate ${e.estimateNumber}`,
    company: e.client || e.companyId,
    companyId: e.companyId,
    statusLabel: meta.label,
    statusClassName: meta.className,
    updatedAtMs: tsToMillis(e.updatedAt) || tsToMillis(e.createdAt),
    viewHref: `/dashboard/estimates/${e.id}`,
    editHref: adminView ? `/dashboard/estimates/${e.id}/edit` : undefined,
  }
}

const DOCUMENT_KINDS = new Set<RowKind>(["proposal", "sow", "brief", "report", "other"])

function matchesTab(row: UnifiedRow, tab: Tab) {
  if (tab === "all") return true
  if (tab === "document") return DOCUMENT_KINDS.has(row.kind)
  return row.kind === tab
}

export default function DocumentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const companyId = appUser?.companyId ?? ""
  const adminView = isAdmin && !isImpersonating

  usePageTitle("Documents")

  const initialTab = TYPE_OPTIONS.find((t) => t.key === searchParams.get("type"))?.key ?? "all"
  const [tab, setTab] = useState<Tab>(initialTab)
  const [rows, setRows] = useState<UnifiedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<UnifiedRow | null>(null)
  const [clientSheet, setClientSheet] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)

  const fetchData = useCallback(async () => {
    setError(false)
    try {
      const [docs, contracts, invoices, estimates] = adminView
        ? await Promise.all([getCompanyDocuments(), getContracts(), getInvoices(), getEstimates()])
        : await Promise.all([
            getCompanyDocumentsByCompanyId(companyId),
            getContractsByCompanyId(companyId),
            getInvoicesByCompanyId(companyId),
            getEstimatesByCompanyId(companyId),
          ])
      setRows([
        ...docs.map((d) => companyDocToRow(d, adminView)),
        ...contracts.map((c) => contractToRow(c, adminView)),
        ...invoices.map((i) => invoiceToRow(i, adminView)),
        ...estimates.map((e) => estimateToRow(e, adminView)),
      ])
    } catch (loadError) {
      console.error("Error loading documents:", loadError)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [adminView, companyId])

  useEffect(() => {
    if (tab !== "media") void fetchData()
  }, [fetchData, tab])

  function changeTab(next: Tab) {
    setTab(next)
    router.replace(next === "all" ? "/dashboard/documents" : `/dashboard/documents?type=${next}`, { scroll: false })
  }

  async function removeRow() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      if (confirmDelete.kind === "contract") await deleteContract(confirmDelete.id)
      else if (confirmDelete.kind === "invoice") await deleteInvoice(confirmDelete.id)
      else if (confirmDelete.kind === "estimate") await deleteEstimate(confirmDelete.id)
      else await deleteCompanyDocument(confirmDelete.id)
      setRows((current) => current.filter((row) => row.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (deleteError) {
      console.error("Error deleting document:", deleteError)
      toast.error("Couldn't delete this.")
    } finally {
      setDeleting(false)
    }
  }

  const tabRows = useMemo(() => rows.filter((row) => matchesTab(row, tab)), [rows, tab])

  const sorts: SortOption<UnifiedRow>[] = useMemo(() => {
    const all: SortOption<UnifiedRow>[] = [
      { value: "updated", label: "Last updated", get: (row) => row.updatedAtMs, ascLabel: "Oldest", descLabel: "Newest" },
      { value: "title", label: "Title", get: (row) => row.title, ascLabel: "A–Z", descLabel: "Z–A" },
      { value: "company", label: "Company", get: (row) => row.company, ascLabel: "A–Z", descLabel: "Z–A" },
      { value: "type", label: "Type", get: (row) => KIND_LABEL[row.kind], ascLabel: "A–Z", descLabel: "Z–A" },
      { value: "status", label: "Status", get: (row) => row.statusLabel, ascLabel: "A–Z", descLabel: "Z–A" },
    ]
    return adminView ? all : all.filter((option) => option.value !== "company")
  }, [adminView])

  const { results: visibleRows, bar } = useFilterBar({
    items: tabRows,
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
        showSearch={false}
        actions={
          adminView && (
            <>
              <Button variant="outline" size="icon" onClick={() => setImporting(true)} aria-label="Import document" title="Import document"><FileUp className="size-4" aria-hidden="true" /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="px-3" aria-label="New" title="New">
                    <Plus className="size-4" aria-hidden="true" />
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setCreating(true)}>Document</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push("/dashboard/contracts/new")}>Contract</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push("/dashboard/invoices/new")}>Invoice</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push("/dashboard/estimates/new")}>Estimate</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )
        }
      >
        <Select value={tab} onValueChange={(value) => changeTab(value as Tab)}>
          <SelectTrigger className="w-full sm:w-[140px]" aria-label="Document type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {tab === "media" ? (
        <DriveView />
      ) : loading ? (
        <DashboardPageSkeleton rows={6} />
      ) : error ? (
        <p className="mt-10 text-sm text-destructive">Couldn&rsquo;t load documents right now.</p>
      ) : tabRows.length === 0 ? (
        <FirstRunState
          className="mt-2"
          label="Document"
          title={adminView ? "Let's create your first document" : "Nothing here yet"}
          description={adminView
            ? "Proposals, contracts, invoices, estimates and everything else you send to clients, all in one place. Pick a type or start blank."
            : "Documents your agency shares with you will show up here."}
          action={adminView ? <Button onClick={() => setCreating(true)}>New Document</Button> : undefined}
        />
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
                  icon={createElement(KindIcon, { className: cn("size-5", KIND_ICON_COLOR[row.kind]), "aria-hidden": true })}
                  menuLabel={`Options for ${row.title}`}
                  menu={
                    <>
                      <DropdownMenuItem onSelect={() => router.push(row.viewHref)}>View {KIND_LABEL[row.kind].toLowerCase()}</DropdownMenuItem>
                      {adminView && row.editHref && <DropdownMenuItem onSelect={() => row.editHref && router.push(row.editHref)}>Edit</DropdownMenuItem>}
                      {adminView && <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(row)}>Delete</DropdownMenuItem>}
                    </>
                  }
                />
              )
            })}
          </div>

          <Table className="hidden sm:table">
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                {adminView && <TableHead>Company</TableHead>}
                <TableHead>Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={`${row.kind}-${row.id}`}>
                  <TableCell className="font-medium">
                    <Link href={row.editHref ?? row.viewHref} className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{row.title}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{KIND_LABEL[row.kind]}</TableCell>
                  {adminView && (
                    <TableCell>
                      {row.companyId ? (
                        <button type="button" onClick={() => setClientSheet(row.companyId)} className="rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{row.company || "Company"}</button>
                      ) : "—"}
                    </TableCell>
                  )}
                  <TableCell>{row.updatedAtMs ? formatDate(new Date(row.updatedAtMs).toISOString().slice(0, 10)) : "—"}</TableCell>
                  <TableCell>{row.statusLabel && <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", row.statusClassName)}>{row.statusLabel}</span>}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Link href={row.viewHref} aria-label={`View ${row.title}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Eye className="size-4" aria-hidden="true" /></Link>
                      {adminView && row.editHref && (
                        <Link href={row.editHref} aria-label={`Edit ${row.title}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Pencil className="size-4" aria-hidden="true" /></Link>
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
        </>
      )}

      {adminView && (
        <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this {confirmDelete && KIND_LABEL[confirmDelete.kind].toLowerCase()}?</AlertDialogTitle><AlertDialogDescription>{confirmDelete?.title} will be removed for good. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void removeRow() }} disabled={deleting}>{deleting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {adminView && <NewDocumentDialog open={creating} onOpenChange={setCreating} />}

      {adminView && <ImportWordDocumentDialog open={importing} onOpenChange={setImporting} />}

      {adminView && <UserEditorSheet open={clientSheet !== null} companyId={clientSheet ?? ""} onClose={() => setClientSheet(null)} onSaved={() => setClientSheet(null)} />}
    </main>
  )
}
