"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react"
import { FileText, Plus, Receipt } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { CompactListRow } from "@/components/dashboard/compact-list-row"
import { DocumentSplitPane } from "@/components/dashboard/document-split-pane"
import { DuplicateDocumentDialog, type DuplicateSelection } from "@/components/dashboard/duplicate-document-dialog"
import { FirstRunState } from "@/components/dashboard/empty-state"
import { GridCard, thumbnailIcon } from "@/components/dashboard/grid-card"
import { BillingPagePreview, DocumentPagePreview, hasDocumentText } from "@/components/dashboard/document-preview"
import type { ItemActions } from "@/components/dashboard/item-menu"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { useViewMode, ViewToggle } from "@/components/dashboard/view-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCachedState } from "@/lib/page-cache"
import { cn } from "@/lib/utils"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { getExchangeRate } from "@/lib/currency"
import {
  createInvoice, deleteInvoice, formatMoney, invoiceAmountDue, invoiceListAmount,
  getInvoices, invoiceStatusMeta, nextInvoiceNumber,
  updateInvoice, type Invoice,
} from "@/lib/billing"
import {
  companyDocumentKindMeta, companyDocumentStatusMeta, createCompanyDocument, deleteCompanyDocument,
  getCompanyDocuments, updateCompanyDocument, type CompanyDocument,
} from "@/lib/company-documents"
import { createNote, moveLegacyNotes } from "@/lib/notes"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"

type DriveItem =
  | { type: "invoice"; record: Invoice }
  | { type: "document"; record: CompanyDocument }
type DriveType = DriveItem["type"]

/** The card's mini first page; undefined keeps the icon for an empty document. */
function itemPreview(item: DriveItem) {
  if (item.type === "document") {
    return hasDocumentText(item.record.body) ? <DocumentPagePreview title={item.record.title} html={item.record.body} tone="document" /> : undefined
  }
  const invoice = item.record
  return (
    <BillingPagePreview
      tone="invoice"
      heading="Invoice"
      number={invoice.invoiceNumber}
      client={invoice.billTo?.name || invoice.client}
      lines={(invoice.lineItems ?? []).map((line) => ({ label: line.title || line.description, amount: Math.round(line.quantity * line.unitPrice) }))}
      total={invoice.amount}
      currency={invoice.currency}
    />
  )
}
type DuplicateTarget = Extract<DriveItem, { type: "invoice" | "document" }>


const SORTS: SortOption<DriveItem>[] = [
  { value: "updatedAt", label: "Last modified", get: (item) => updatedAt(item), ascLabel: "Oldest", descLabel: "Newest" },
  { value: "title", label: "Title", get: (item) => itemTitle(item), ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "type", label: "Type", get: (item) => item.type, ascLabel: "A–Z", descLabel: "Z–A" },
]

const ICONS = { invoice: Receipt, document: FileText }

function keyOf(item: DriveItem) { return `${item.type}:${item.record.id}` }
function updatedAt(item: DriveItem) { return Math.max(tsToMillis(item.record.updatedAt), tsToMillis(item.record.createdAt)) }
function itemTitle(item: DriveItem) {
  if (item.type === "invoice") return item.record.title || item.record.invoiceNumber || "Untitled invoice"
  return item.record.title || "Untitled document"
}
export type MakeNewTile = {
  label: string
  icon: ComponentType<{ className?: string }>
  /** Tile colour and icon colour. */
  tone: string
  href?: string
  onSelect?: () => void
  disabled?: boolean
}

/** A row of coloured tiles across the top of Artifacts, one per kind of thing to make. */
export function MakeSomethingNew({ tiles }: { tiles: MakeNewTile[] }) {
  return (
    <section aria-labelledby="make-new-heading" className="mb-6">
      <h2 id="make-new-heading" className="mb-3 text-sm font-medium text-muted-foreground">Make something new</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {tiles.map((tile) => {
          const Icon = tile.icon
          const body = (
            <>
              <span className={cn("flex aspect-[16/11] w-full items-center justify-center rounded-2xl transition-transform group-hover:scale-[1.02]", tile.tone)}>
                <Icon className="size-9" aria-hidden="true" />
              </span>
              <span className="mt-2 block text-sm font-medium text-foreground">{tile.label}</span>
            </>
          )
          const className = "group w-36 shrink-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl sm:w-40 disabled:opacity-60"
          return tile.href ? (
            <Link key={tile.label} href={tile.href} className={className}>{body}</Link>
          ) : (
            <button key={tile.label} type="button" onClick={tile.onSelect} disabled={tile.disabled} className={className}>{body}</button>
          )
        })}
      </div>
    </section>
  )
}

function itemHref(item: DriveItem) {
  const id = encodeURIComponent(item.record.id)
  if (item.type === "document") return `/dashboard/documents?document=${id}`
  return `/dashboard/invoices/${id}`
}
/** "Nov 14", with the year only when it isn't this year. */
function shortDate(item: DriveItem) {
  const date = new Date(updatedAt(item))
  if (!updatedAt(item)) return ""
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" })
}
function itemStatus(item: DriveItem) {
  if (item.type === "invoice") return invoiceStatusMeta[item.record.status] ?? invoiceStatusMeta.draft
  return companyDocumentStatusMeta[item.record.status] ?? companyDocumentStatusMeta.draft
}
function itemSubtitle(item: DriveItem) {
  if (item.type === "invoice") return invoiceListAmount(item.record)
  return companyDocumentKindMeta[item.record.kind]?.label || "Document"
}
function itemSearch(item: DriveItem) {
  const status = itemStatus(item)
  if (item.type === "invoice") return [itemTitle(item), item.record.invoiceNumber, item.record.client, item.record.project, status?.label, "invoice"]
  return [itemTitle(item), item.record.client, item.record.project, itemSubtitle(item), status?.label, (item.record.body || "").replace(/<[^>]*>/g, " "), "document"]
}

function OutstandingSummary({ invoices }: { invoices: Invoice[] }) {
  const unpaid = invoices.filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
  const targetCurrency = unpaid[0]?.currency || "USD"
  const currencies = [...new Set(unpaid.map((invoice) => invoice.currency || "USD"))]
  const [summary, setSummary] = useState<number | null>(null)
  const [conversionError, setConversionError] = useState(false)

  useEffect(() => {
    let active = true
    setSummary(null)
    setConversionError(false)
    if (!unpaid.length) return () => { active = false }
    async function calculate() {
      try {
        const rates = Object.fromEntries(await Promise.all(currencies.filter((currency) => currency !== targetCurrency).map(async (currency) => [currency, await getExchangeRate(currency, targetCurrency)] as const)))
        const amount = unpaid.reduce((total, invoice) => total + Math.round(invoiceAmountDue(invoice) * (rates[invoice.currency || "USD"] ?? 1)), 0)
        if (active) setSummary(amount)
      } catch {
        if (active) setConversionError(true)
      }
    }
    void calculate()
    return () => { active = false }
  }, [invoices, targetCurrency, currencies.join(",")])

  if (!unpaid.length) return null
  const className = "mb-4 mt-2 rounded-sm bg-primary px-3 py-2 text-lg font-medium leading-7 text-primary-foreground"
  if (conversionError) return <p className={className}>Outstanding {currencies.map((currency) => formatMoney(unpaid.filter((invoice) => (invoice.currency || "USD") === currency).reduce((total, invoice) => total + invoiceAmountDue(invoice), 0), currency)).join(" · ")}</p>
  return <p className={className}>Outstanding {summary === null ? "…" : formatMoney(summary, targetCurrency)}</p>
}

/**
 * Artifacts: your documents. With mode "invoices" it is
 * the Invoices page instead: invoices only, with what is still owed on top.
 */
export function DriveLibrary({ mode = "artifacts" }: { mode?: "artifacts" | "invoices" }) {
  const router = useRouter()
  const { user, isAdmin, isImpersonating } = useAuth()
  const adminView = isAdmin && !isImpersonating
  const invoicesOnly = mode === "invoices"
  const label = invoicesOnly ? "Invoices" : "Artifacts"
  usePageTitle(label)

  const [invoices, setInvoices, invoicesCached] = useCachedState<Invoice[]>("invoices", [])
  const [documents, setDocuments, documentsCached] = useCachedState<CompanyDocument[]>("drive:company-documents", [])
  const [loading, setLoading] = useState(!(invoicesCached && documentsCached))
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useViewMode("drive-library", "list")
  const [creatingNote, setCreatingNote] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<DuplicateTarget | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [sharing, setSharing] = useState<DriveItem | null>(null)
  const [shareSaving, setShareSaving] = useState(false)


  const fetchData = useCallback(async () => {
    if (!adminView) return
    const results = await Promise.allSettled([getInvoices(), getCompanyDocuments()])
    if (results[0].status === "fulfilled") setInvoices(results[0].value)
    if (results[1].status === "fulfilled") setDocuments(results[1].value)
    setLoadError(results.some((result) => result.status === "rejected"))
    setLoading(false)
  }, [adminView, setDocuments, setInvoices])

  useEffect(() => { void fetchData() }, [fetchData])
  // Move any notes still in the old notes collection into documents, then reload the list.
  useEffect(() => {
    if (!adminView) return
    let active = true
    getCurrentAgencyId()
      .then((agencyId) => moveLegacyNotes(agencyId))
      .then(() => getCompanyDocuments())
      .then((rows) => { if (active) setDocuments(rows) })
      .catch((error) => console.error("Error moving notes into documents:", error))
    return () => { active = false }
  }, [adminView, setDocuments])

  // Artifacts holds documents and invoices together; each opens in its own editor.
  const items = useMemo<DriveItem[]>(() => invoicesOnly ? invoices.map((record) => ({ type: "invoice" as const, record })) : [
    ...documents.map((record) => ({ type: "document" as const, record })),
    ...invoices.map((record) => ({ type: "invoice" as const, record })),
  ], [invoicesOnly, invoices, documents])
  const { results: visibleItems, bar } = useFilterBar({ items, search: itemSearch, sorts: SORTS, defaultSort: "updatedAt", defaultDirection: "desc" })
  const busy = loading

  async function renameItem(item: DriveItem, title: string) {
    try {
      if (item.type === "invoice") {
        await updateInvoice(item.record.id, { title })
        setInvoices((current) => current.map((record) => record.id === item.record.id ? { ...record, title } : record))
      } else if (item.type === "document") {
        await updateCompanyDocument(item.record.id, { title })
        setDocuments((current) => current.map((record) => record.id === item.record.id ? { ...record, title } : record))
      }
    } catch (error) {
      console.error("Error renaming item:", error)
      toast.error(`Couldn't rename this ${item.type}.`)
      throw error
    }
  }

  async function deleteItem(item: DriveItem) {
    try {
      if (item.type === "invoice") {
        await deleteInvoice(item.record.id)
        setInvoices((current) => current.filter((record) => record.id !== item.record.id))
      } else if (item.type === "document") {
        await deleteCompanyDocument(item.record.id)
        setDocuments((current) => current.filter((record) => record.id !== item.record.id))
      }
    } catch (error) {
      console.error("Error deleting item:", error)
      toast.error(`Couldn't delete this ${item.type}.`)
      throw error
    }
  }

  async function changeShareEnabled(enabled: boolean) {
    if (!sharing || shareSaving) return
    const item = sharing
    setShareSaving(true)
    try {
      if (item.type === "invoice") {
        await updateInvoice(item.record.id, { shareEnabled: enabled })
        setInvoices((current) => current.map((record) => record.id === item.record.id ? { ...record, shareEnabled: enabled } : record))
      } else if (item.type === "document") {
        await updateCompanyDocument(item.record.id, { shareEnabled: enabled })
        setDocuments((current) => current.map((record) => record.id === item.record.id ? { ...record, shareEnabled: enabled } : record))
      }
      setSharing((current) => current && keyOf(current) === keyOf(item) ? { ...current, record: { ...current.record, shareEnabled: enabled } } as DriveItem : current)
    } catch (error) {
      console.error("Error updating sharing:", error)
      toast.error("Couldn't update sharing.")
    } finally {
      setShareSaving(false)
    }
  }

  function itemActions(item: DriveItem): ItemActions {
    const title = itemTitle(item)
    const href = itemHref(item)
    return {
      noun: item.type,
      name: title,
      onOpen: () => router.push(href),
      onRename: adminView ? (next) => renameItem(item, next) : undefined,
      onDuplicate: adminView ? () => setDuplicateTarget(item) : undefined,
      extra: adminView ? <>
        {item.type === "document" && <DropdownMenuItem onSelect={() => router.push(`/dashboard/documents/${encodeURIComponent(item.record.id)}/edit`)}>Client, type and status</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => setSharing(item)}>Share</DropdownMenuItem>
      </> : undefined,
      onDelete: adminView ? () => deleteItem(item) : undefined,
      deleteMessage: `${title} will be removed for good. This cannot be undone.`,
    }
  }

  async function confirmDuplicate(selection: DuplicateSelection) {
    const target = duplicateTarget
    if (!target || duplicating) return
    setDuplicating(true)
    try {
      if (target.type === "invoice") {
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = target.record
        const invoiceNumber = await nextInvoiceNumber()
        const id = await createInvoice({ ...rest, invoiceNumber, status: "draft", shareEnabled: false, companyId: selection.companyId, client: selection.client || target.record.client, projectId: selection.projectId, project: selection.project })
        router.push(`/dashboard/invoices/${encodeURIComponent(id)}`)
      } else {
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = target.record
        const id = await createCompanyDocument({ ...rest, title: `${target.record.title || "Document"} (Copy)`, status: "draft", shareEnabled: false, companyId: selection.companyId, client: selection.client || target.record.client, projectId: selection.projectId, project: selection.project })
        router.push(`/dashboard/documents?document=${encodeURIComponent(id)}`)
      }
      setDuplicateTarget(null)
    } catch (error) {
      console.error("Error duplicating item:", error)
      toast.error("Couldn't duplicate this item.")
    } finally {
      setDuplicating(false)
    }
  }

  async function createNewNote() {
    if (!user || creatingNote) return
    setCreatingNote(true)
    try {
      const id = await createNote(user.uid)
      router.push(`/dashboard/documents?document=${encodeURIComponent(id)}`)
    } catch (error) {
      console.error("Error creating note:", error)
      toast.error("Couldn't create a note.")
      setCreatingNote(false)
    }
  }

  if (!user || !adminView) return null

  const newMenu = invoicesOnly ? (
    <Button asChild variant="ghost" className="h-9 gap-1 rounded-full bg-sidebar-accent px-3 text-sm font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent/80">
      <Link href="/dashboard/invoices/new"><Plus className="size-[18px]" aria-hidden="true" /> New invoice</Link>
    </Button>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="h-9 gap-1 rounded-full bg-sidebar-accent px-3 text-sm font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent/80" aria-label="New in Artifacts">
          <Plus className="size-[18px]" aria-hidden="true" /> New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void createNewNote()} disabled={creatingNote}>Document</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const toolbar = <TableFilterBar {...bar} placeholder={`Search ${label}`} controls={<ViewToggle view={view} onChange={setView} />} actions={newMenu} />

  const makeNew: MakeNewTile[] = [
    { label: "Document", icon: FileText, tone: "bg-blue-700 text-blue-100 dark:bg-blue-900 dark:text-blue-200", onSelect: () => void createNewNote(), disabled: creatingNote },
    { label: "Invoice", icon: Receipt, tone: "bg-emerald-700 text-emerald-100 dark:bg-emerald-900 dark:text-emerald-200", href: "/dashboard/invoices/new" },
  ]

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      {!invoicesOnly && <MakeSomethingNew tiles={makeNew} />}
      {loadError && <p role="alert" className="mb-3 text-sm text-destructive">Some {label.toLowerCase()} couldn’t load. Refresh to try again.</p>}
      {!busy && items.length === 0 && !loadError ? (
        <>
          {toolbar}
          {invoicesOnly ? (
            <FirstRunState label="Invoices" title="No invoices yet" description="Invoices you send will appear here, with what is still owed." action={<Button asChild><Link href="/dashboard/invoices/new">New invoice</Link></Button>} />
          ) : (
            <FirstRunState label="Artifacts" title="No documents yet" description="Your documents will appear here." action={<Button onClick={() => void createNewNote()} disabled={creatingNote}>New document</Button>} />
          )}
        </>
      ) : (
        <DocumentSplitPane
          visibleItems={busy ? [] : visibleItems}
          loading={busy}
          selectedId={null}
          onClearSelection={() => undefined}
          sectionLabel={label}
          filter={toolbar}
          listExtra={invoicesOnly && !busy ? <OutstandingSummary invoices={invoices} /> : undefined}
          emptySearchLabel="No items match your search."
          getKey={keyOf}
          content={null}
          singlePane
          view={view}
          renderGridItem={(item) => {
            const Icon = ICONS[item.type]
            const status = itemStatus(item)
            const detail = itemSubtitle(item)
            return <GridCard
              title={itemTitle(item)}
              icon={<Icon className="size-4 text-muted-foreground" aria-hidden="true" />}
              placeholder={thumbnailIcon(Icon)}
              preview={itemPreview(item)}
              subtitle={invoicesOnly ? <span className="inline-flex items-center gap-1.5">{status && <Badge variant="secondary" className={`rounded-full border-0 ${status.className}`}>{status.label}</Badge>}{detail && <span>{status ? "· " : ""}{detail}</span>}</span> : shortDate(item)}
              href={itemHref(item)}
              ariaLabel={`Open ${itemTitle(item)}`}
              menuLabel={`Options for ${itemTitle(item)}`}
              actions={itemActions(item)}
            />
          }}
          renderItem={(item) => {
            const Icon = ICONS[item.type]
            const status = itemStatus(item)
            const client = item.record.client
            const detail = itemSubtitle(item)
            const timestamp = formatTimestamp(item.record.updatedAt ?? item.record.createdAt)
            return <CompactListRow
              title={itemTitle(item)}
              leading={<span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon className="size-5" aria-hidden="true" /></span>}
              subtitle={invoicesOnly ? <span className="inline-flex items-center gap-1.5">{status && <Badge variant="secondary" className={`rounded-full border-0 ${status.className}`}>{status.label}</Badge>}<span>{status ? "· " : ""}{detail ? `${detail} · ` : ""}{timestamp}</span></span> : shortDate(item)}
              mobileSubtitle={invoicesOnly ? <span className="inline-flex max-w-full items-center gap-1.5">{client && <span className="truncate">{client}</span>}{status && <Badge variant="secondary" className={`rounded-full border-0 ${status.className}`}>{status.label}</Badge>}{detail && <span className="truncate">{detail}</span>}</span> : shortDate(item)}
              meta={invoicesOnly ? timestamp : undefined}
              href={itemHref(item)}
              menuLabel={`Options for ${itemTitle(item)}`}
              actions={itemActions(item)}
            />
          }}
        />
      )}

      <DuplicateDocumentDialog open={duplicateTarget !== null} onOpenChange={(open) => { if (!open && !duplicating) setDuplicateTarget(null) }} title={`Duplicate ${duplicateTarget ? itemTitle(duplicateTarget) : "item"}`} description="Choose which client and project the copy belongs to." defaultCompanyId={duplicateTarget?.record.companyId ?? ""} defaultProjectId={duplicateTarget?.record.projectId} submitting={duplicating} onConfirm={confirmDuplicate} />
      <ShareDialog
        open={sharing !== null}
        onOpenChange={(open) => { if (!open && !shareSaving) setSharing(null) }}
        showTrigger={false}
        path={sharing ? `/share/${sharing.type === "document" ? "documents" : `${sharing.type}s`}/${encodeURIComponent(sharing.record.id)}` : ""}
        title={sharing ? itemTitle(sharing) : "item"}
        access={{ enabled: Boolean(sharing?.record.shareEnabled), onEnabledChange: (enabled) => { void changeShareEnabled(enabled) }, disabled: shareSaving }}
      />
    </main>
  )
}
