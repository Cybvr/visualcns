"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { FileText, FileUp, Plus, Receipt, StickyNote } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { CompactListRow } from "@/components/dashboard/compact-list-row"
import { DocumentSplitPane } from "@/components/dashboard/document-split-pane"
import { DuplicateDocumentDialog, type DuplicateSelection } from "@/components/dashboard/duplicate-document-dialog"
import { FirstRunState } from "@/components/dashboard/empty-state"
import { GridCard, thumbnailIcon } from "@/components/dashboard/grid-card"
import { ImportWordDocumentDialog } from "@/components/dashboard/import-word-document-dialog"
import type { ItemActions } from "@/components/dashboard/item-menu"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { useViewMode, ViewToggle } from "@/components/dashboard/view-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCachedState } from "@/lib/page-cache"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { getExchangeRate } from "@/lib/currency"
import {
  createInvoice, deleteInvoice, formatMoney, getInvoices, invoiceStatusMeta,
  nextInvoiceNumber, updateInvoice, type Invoice,
} from "@/lib/billing"
import {
  companyDocumentKindMeta, companyDocumentStatusMeta, createCompanyDocument, deleteCompanyDocument,
  getCompanyDocuments, updateCompanyDocument, type CompanyDocument,
} from "@/lib/company-documents"
import { createNote, deleteNote, setNoteShared, updateNote, watchNotes, type Note } from "@/lib/notes"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"

type DriveItem =
  | { type: "invoice"; record: Invoice }
  | { type: "document"; record: CompanyDocument }
  | { type: "note"; record: Note }
type DriveType = DriveItem["type"]
type DriveFilter = "all" | DriveType
type DuplicateTarget = Extract<DriveItem, { type: "invoice" | "document" }>

const TYPES: { value: DriveFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "invoice", label: "Invoices" },
  { value: "document", label: "Documents" },
  { value: "note", label: "Notes" },
]

const SORTS: SortOption<DriveItem>[] = [
  { value: "updatedAt", label: "Last modified", get: (item) => updatedAt(item), ascLabel: "Oldest", descLabel: "Newest" },
  { value: "title", label: "Title", get: (item) => itemTitle(item), ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "type", label: "Type", get: (item) => item.type, ascLabel: "A–Z", descLabel: "Z–A" },
]

const ICONS = { invoice: Receipt, document: FileText, note: StickyNote }

function keyOf(item: DriveItem) { return `${item.type}:${item.record.id}` }
function updatedAt(item: DriveItem) { return Math.max(tsToMillis(item.record.updatedAt), tsToMillis(item.record.createdAt)) }
function noteTitle(note: Note) {
  if (note.title?.trim()) return note.title.trim()
  return note.body.replace(/<\/(?:p|li|h[1-6])>/gi, "\n").replace(/<[^>]*>/g, "").split("\n").map((line) => line.trim()).find(Boolean) || "New note"
}
function itemTitle(item: DriveItem) {
  if (item.type === "invoice") return item.record.title || item.record.invoiceNumber || "Untitled invoice"
  if (item.type === "document") return item.record.title || "Untitled document"
  return noteTitle(item.record)
}
function itemHref(item: DriveItem) {
  const id = encodeURIComponent(item.record.id)
  return item.type === "note" ? `/dashboard/notes?note=${id}` : `/dashboard/${item.type === "document" ? "documents" : "invoices"}/${id}`
}
function itemStatus(item: DriveItem) {
  if (item.type === "invoice") return invoiceStatusMeta[item.record.status] ?? invoiceStatusMeta.draft
  if (item.type === "document") return companyDocumentStatusMeta[item.record.status] ?? companyDocumentStatusMeta.draft
  return null
}
function itemSubtitle(item: DriveItem) {
  if (item.type === "invoice") return formatMoney(item.record.amount, item.record.currency)
  if (item.type === "document") return companyDocumentKindMeta[item.record.kind]?.label || "Document"
  return "Note"
}
function itemSearch(item: DriveItem) {
  const status = itemStatus(item)
  if (item.type === "invoice") return [itemTitle(item), item.record.invoiceNumber, item.record.client, item.record.project, status?.label, "invoice"]
  if (item.type === "document") return [itemTitle(item), item.record.client, item.record.project, itemSubtitle(item), status?.label, "document"]
  return [itemTitle(item), item.record.body.replace(/<[^>]*>/g, " "), "note"]
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
        const amount = unpaid.reduce((total, invoice) => total + Math.round((invoice.amount ?? 0) * (rates[invoice.currency || "USD"] ?? 1)), 0)
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
  if (conversionError) return <p className={className}>Outstanding {currencies.map((currency) => formatMoney(unpaid.filter((invoice) => (invoice.currency || "USD") === currency).reduce((total, invoice) => total + (invoice.amount ?? 0), 0), currency)).join(" · ")}</p>
  return <p className={className}>Outstanding {summary === null ? "…" : formatMoney(summary, targetCurrency)}</p>
}

export function DriveLibrary() {
  const router = useRouter()
  const { user, isAdmin, isImpersonating } = useAuth()
  const adminView = isAdmin && !isImpersonating
  usePageTitle("Drive")

  const [invoices, setInvoices, invoicesCached] = useCachedState<Invoice[]>("invoices", [])
  const [documents, setDocuments, documentsCached] = useCachedState<CompanyDocument[]>("drive:company-documents", [])
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [loading, setLoading] = useState(!(invoicesCached && documentsCached))
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState<DriveFilter>("all")
  const [view, setView] = useViewMode("drive-library", "list")
  const [creatingDocument, setCreatingDocument] = useState(false)
  const [importingDocument, setImportingDocument] = useState(false)
  const [creatingNote, setCreatingNote] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<DuplicateTarget | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [sharing, setSharing] = useState<DriveItem | null>(null)
  const [shareSaving, setShareSaving] = useState(false)

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("type")
    if (TYPES.some(({ value }) => value === requested)) setFilter(requested as DriveFilter)
  }, [])

  function selectFilter(next: DriveFilter) {
    setFilter(next)
    const url = new URL(window.location.href)
    if (next === "all") url.searchParams.delete("type")
    else url.searchParams.set("type", next)
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
  }

  const fetchData = useCallback(async () => {
    if (!adminView) return
    const results = await Promise.allSettled([getInvoices(), getCompanyDocuments()])
    if (results[0].status === "fulfilled") setInvoices(results[0].value)
    if (results[1].status === "fulfilled") setDocuments(results[1].value)
    setLoadError(results.some((result) => result.status === "rejected"))
    setLoading(false)
  }, [adminView, setDocuments, setInvoices])

  useEffect(() => { void fetchData() }, [fetchData])
  useEffect(() => {
    if (!adminView) return
    let stop = () => {}
    let active = true
    getCurrentAgencyId().then((agencyId) => {
      if (!active) return
      stop = watchNotes(agencyId, (rows) => { setNotes(rows); setNotesLoaded(true) }, (error) => { console.error("Error loading notes:", error); setLoadError(true); setNotesLoaded(true) })
    }).catch((error) => { console.error("Error loading notes:", error); setLoadError(true); setNotesLoaded(true) })
    return () => { active = false; stop() }
  }, [adminView])

  const items = useMemo<DriveItem[]>(() => [
    ...invoices.map((record) => ({ type: "invoice" as const, record })),
    ...documents.map((record) => ({ type: "document" as const, record })),
    ...notes.map((record) => ({ type: "note" as const, record })),
  ], [invoices, documents, notes])
  const filteredItems = useMemo(() => filter === "all" ? items : items.filter((item) => item.type === filter), [filter, items])
  const { results: visibleItems, bar } = useFilterBar({ items: filteredItems, search: itemSearch, sorts: SORTS, defaultSort: "updatedAt", defaultDirection: "desc" })
  const busy = loading || !notesLoaded

  async function renameItem(item: DriveItem, title: string) {
    try {
      if (item.type === "invoice") {
        await updateInvoice(item.record.id, { title })
        setInvoices((current) => current.map((record) => record.id === item.record.id ? { ...record, title } : record))
      } else if (item.type === "document") {
        await updateCompanyDocument(item.record.id, { title })
        setDocuments((current) => current.map((record) => record.id === item.record.id ? { ...record, title } : record))
      } else {
        await updateNote(item.record.id, { title, body: item.record.body })
        setNotes((current) => current.map((record) => record.id === item.record.id ? { ...record, title } : record))
      }
    } catch (error) {
      console.error("Error renaming Drive item:", error)
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
      } else {
        await deleteNote(item.record.id)
        setNotes((current) => current.filter((record) => record.id !== item.record.id))
      }
    } catch (error) {
      console.error("Error deleting Drive item:", error)
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
      } else {
        await setNoteShared(item.record.id, enabled)
        setNotes((current) => current.map((record) => record.id === item.record.id ? { ...record, shareEnabled: enabled } : record))
      }
      setSharing((current) => current && keyOf(current) === keyOf(item) ? { ...current, record: { ...current.record, shareEnabled: enabled } } as DriveItem : current)
    } catch (error) {
      console.error("Error updating Drive sharing:", error)
      toast.error("Couldn't update sharing.")
    } finally {
      setShareSaving(false)
    }
  }

  function itemActions(item: DriveItem): ItemActions {
    const title = itemTitle(item)
    const href = itemHref(item)
    const shareReady = item.type === "note" || item.record.status !== "draft"
    return {
      noun: item.type,
      name: title,
      onOpen: () => router.push(href),
      onRename: adminView ? (next) => renameItem(item, next) : undefined,
      onDuplicate: adminView && item.type !== "note" ? () => setDuplicateTarget(item as DuplicateTarget) : undefined,
      extra: adminView ? <>
        {item.type === "document" && <DropdownMenuItem onSelect={() => router.push(`${href}/edit`)}>Edit document</DropdownMenuItem>}
        <DropdownMenuItem disabled={!shareReady} onSelect={() => setSharing(item)}>{shareReady ? "Share" : "Share (send first)"}</DropdownMenuItem>
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
        router.push(`/dashboard/documents/${encodeURIComponent(id)}/edit`)
      }
      setDuplicateTarget(null)
    } catch (error) {
      console.error("Error duplicating Drive item:", error)
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
      router.push(`/dashboard/notes?note=${encodeURIComponent(id)}`)
    } catch (error) {
      console.error("Error creating note:", error)
      toast.error("Couldn't create a note.")
      setCreatingNote(false)
    }
  }

  if (!user || !adminView) return null

  const newMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="h-9 gap-1 rounded-full bg-sidebar-accent px-3 text-sm font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent/80" aria-label="New in Drive">
          <Plus className="size-[18px]" aria-hidden="true" /> New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => router.push("/dashboard/invoices/new")}>Invoice</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setCreatingDocument(true)}>Document</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void createNewNote()} disabled={creatingNote}>Note</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setImportingDocument(true)}><FileUp className="size-4" aria-hidden="true" />Import document</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const toolbar = <TableFilterBar {...bar} placeholder="Search Drive" controls={<ViewToggle view={view} onChange={setView} />} actions={newMenu} />

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <nav className="mb-3 flex items-center gap-1 overflow-x-auto border-b border-border" aria-label="Drive types">
        {TYPES.map(({ value, label }) => {
          const count = value === "all" ? items.length : items.filter((item) => item.type === value).length
          return <button key={value} type="button" onClick={() => selectFilter(value)} aria-pressed={filter === value} className={`shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${filter === value ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label} <span className="ml-1 text-xs tabular-nums text-muted-foreground">{count}</span></button>
        })}
      </nav>
      {loadError && <p role="alert" className="mb-3 text-sm text-destructive">Some Drive items couldn’t load. Refresh to try again.</p>}
      {!busy && items.length === 0 && !loadError ? (
        <>
          {toolbar}
          <FirstRunState label="Drive" title="Your Drive is empty" description="Notes, documents and invoices will appear together here." action={<div className="flex flex-wrap justify-center gap-2"><Button asChild><Link href="/dashboard/invoices/new">New invoice</Link></Button><Button variant="outline" onClick={() => setCreatingDocument(true)}>New document</Button></div>} />
        </>
      ) : (
        <DocumentSplitPane
          visibleItems={busy ? [] : visibleItems}
          loading={busy}
          selectedId={null}
          onClearSelection={() => undefined}
          sectionLabel="Drive"
          filter={toolbar}
          listExtra={filter === "invoice" && !busy ? <OutstandingSummary invoices={invoices} /> : undefined}
          emptySearchLabel="No items match your search."
          getKey={keyOf}
          content={null}
          singlePane
          view={view}
          renderGridItem={(item) => {
            const Icon = ICONS[item.type]
            const status = itemStatus(item)
            const detail = item.type === "note" ? "" : itemSubtitle(item)
            return <GridCard
              title={itemTitle(item)}
              icon={<Icon className="size-4 text-muted-foreground" aria-hidden="true" />}
              placeholder={thumbnailIcon(Icon)}
              subtitle={<span className="inline-flex items-center gap-1.5">{status && <Badge variant="secondary" className={`rounded-full border-0 ${status.className}`}>{status.label}</Badge>}{detail && <span>{status ? "· " : ""}{detail}</span>}{item.type === "note" && <span>{formatTimestamp(item.record.updatedAt ?? item.record.createdAt)}</span>}</span>}
              href={itemHref(item)}
              ariaLabel={`Open ${itemTitle(item)}`}
              menuLabel={`Options for ${itemTitle(item)}`}
              actions={itemActions(item)}
            />
          }}
          renderItem={(item) => {
            const Icon = ICONS[item.type]
            const status = itemStatus(item)
            const client = item.type === "note" ? "" : item.record.client
            const detail = item.type === "note" ? "" : itemSubtitle(item)
            const timestamp = formatTimestamp(item.record.updatedAt ?? item.record.createdAt)
            return <CompactListRow
              title={itemTitle(item)}
              leading={<span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon className="size-5" aria-hidden="true" /></span>}
              subtitle={<span className="inline-flex items-center gap-1.5">{status && <Badge variant="secondary" className={`rounded-full border-0 ${status.className}`}>{status.label}</Badge>}<span>{status ? "· " : ""}{detail ? `${detail} · ` : ""}{timestamp}</span></span>}
              mobileSubtitle={<span className="inline-flex max-w-full items-center gap-1.5">{client && <span className="truncate">{client}</span>}{status && <Badge variant="secondary" className={`rounded-full border-0 ${status.className}`}>{status.label}</Badge>}{detail && <span className="truncate">{detail}</span>}{item.type === "note" && <span>{timestamp}</span>}</span>}
              meta={item.type === "note" ? undefined : timestamp}
              href={itemHref(item)}
              menuLabel={`Options for ${itemTitle(item)}`}
              actions={itemActions(item)}
            />
          }}
        />
      )}

      <NewDocumentDialog open={creatingDocument} onOpenChange={setCreatingDocument} />
      <ImportWordDocumentDialog open={importingDocument} onOpenChange={setImportingDocument} />
      <DuplicateDocumentDialog open={duplicateTarget !== null} onOpenChange={(open) => { if (!open && !duplicating) setDuplicateTarget(null) }} title={`Duplicate ${duplicateTarget ? itemTitle(duplicateTarget) : "item"}`} description="Choose which client and project the copy belongs to." defaultCompanyId={duplicateTarget?.record.companyId ?? ""} defaultProjectId={duplicateTarget?.record.projectId} submitting={duplicating} onConfirm={confirmDuplicate} />
      <ShareDialog
        open={sharing !== null}
        onOpenChange={(open) => { if (!open && !shareSaving) setSharing(null) }}
        showTrigger={false}
        path={sharing ? `/share/${sharing.type === "document" ? "documents" : `${sharing.type}s`}/${encodeURIComponent(sharing.record.id)}` : ""}
        title={sharing ? itemTitle(sharing) : "item"}
        viewer={user ? { name: user.displayName, email: user.email } : undefined}
        access={{ enabled: Boolean(sharing?.record.shareEnabled), onEnabledChange: (enabled) => { void changeShareEnabled(enabled) }, disabled: shareSaving }}
      />
    </main>
  )
}
