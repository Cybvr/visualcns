"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Send, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { InvoiceBuilder } from "@/components/dashboard/invoice-builder"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { watchInvoice, type Invoice } from "@/lib/billing"
import { noteBodyHtml, updateNote, watchNote } from "@/lib/notes"

/** What the workspace needs to know about the open item, for its title menu and sharing. */
export type ArtifactInfo = { title: string; shareEnabled: boolean }

const SAVE_DELAY = 600

function PaneMissing({ noun }: { noun: string }) {
  return <p className="p-6 text-sm text-muted-foreground">This {noun} couldn’t be found. It may have been deleted.</p>
}

function PaneLoading() {
  return (
    <div className="space-y-4 p-6" aria-label="Loading">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

/**
 * A document in the Ngai workspace: the writing editor, saving as you type.
 * Changes Ngai makes show at once, unless you have typing waiting to save.
 */
export function DocumentPane({ id, controls, onInfo, onShare, onDelete }: {
  id: string
  /** Expand and close, at the end of the bar. */
  controls: ReactNode
  onInfo: (info: ArtifactInfo) => void
  onShare: () => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading")
  const [revision, setRevision] = useState(0)
  const pending = useRef<{ title: string; body: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shared = useRef(false)
  const info = useRef(onInfo)
  info.current = onInfo

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const next = pending.current
    pending.current = null
    if (!next) return
    try {
      await updateNote(id, next)
    } catch {
      toast.error("Couldn't save your document.")
    }
  }, [id])

  useEffect(() => () => { void flush() }, [flush])

  useEffect(() => watchNote(
    id,
    (note, { local }) => {
      if (!note) { setState("missing"); return }
      shared.current = Boolean(note.shareEnabled)
      info.current({ title: note.title?.trim() || "Untitled document", shareEnabled: shared.current })
      // Our own write, or typing still waiting to save: keep what's in the editor.
      if (local || pending.current) return
      setTitle(note.title ?? "")
      setBody(note.body ?? "")
      setRevision((value) => value + 1)
      setState("ready")
    },
    () => setState("missing"),
  ), [id])

  function edit(changes: { title?: string; body?: string }) {
    const nextTitle = changes.title ?? title
    const nextBody = changes.body ?? body
    setTitle(nextTitle)
    setBody(nextBody)
    if (changes.title !== undefined) info.current({ title: nextTitle.trim() || "Untitled document", shareEnabled: shared.current })
    pending.current = { title: nextTitle, body: nextBody }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), SAVE_DELAY)
  }

  if (state === "missing") return <PaneMissing noun="document" />
  if (state === "loading") return <PaneLoading />

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 lg:px-4">
        {/* On desktop the title is in Ngai's header; here it is for phones and tablets. */}
        <input
          value={title}
          onChange={(event) => edit({ title: event.target.value })}
          placeholder="Untitled document"
          aria-label="Document title"
          className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-muted-foreground lg:invisible"
        />
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={onShare} aria-label="Share document">
            <Send className="size-4" aria-hidden="true" />
          </Button>
          {/* On desktop, Delete is in the title menu. */}
          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive lg:hidden" onClick={onDelete} aria-label="Delete document">
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
          {controls}
        </div>
      </div>
      <RichTextEditor
        key={`${id}-${revision}`}
        value={noteBodyHtml(body)}
        onChange={(html) => edit({ body: html })}
        placeholder="Start writing"
        scrollable
        borderless
        documentLayout
        showRuler
        className="min-h-0 flex-1 max-sm:min-h-[55svh] max-sm:flex-none"
      />
    </div>
  )
}

function invoiceTitle(invoice: Invoice) {
  return invoice.title?.trim() || (invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : "Invoice")
}

/**
 * An invoice in the Ngai workspace: the invoice editor, saving by itself.
 * The editor keeps its own draft, so it reloads only when someone else (like Ngai)
 * changes the invoice, or when `revision` moves (a rename or share from the title menu).
 */
export function InvoicePane({ id, revision, controls, onInfo, onDeleted }: {
  id: string
  revision: number
  controls: ReactNode
  onInfo: (info: ArtifactInfo) => void
  onDeleted: () => void
}) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [missing, setMissing] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const ownSaveUntil = useRef(0)
  const loaded = useRef(false)
  const info = useRef(onInfo)
  info.current = onInfo

  useEffect(() => {
    loaded.current = false
    return watchInvoice(
      id,
      (record, { local }) => {
        if (!record) { setMissing(true); return }
        setInvoice(record)
        info.current({ title: invoiceTitle(record), shareEnabled: Boolean(record.shareEnabled) })
        // A write from here shows first as local, then confirmed a moment later: skip both.
        if (local) ownSaveUntil.current = Date.now() + 5000
        else if (loaded.current && Date.now() > ownSaveUntil.current) setEditorKey((key) => key + 1)
        loaded.current = true
      },
      () => setMissing(true),
    )
  }, [id])

  if (missing) return <PaneMissing noun="invoice" />
  if (!invoice) return <PaneLoading />

  return (
    <div className="min-h-0 flex-1 lg:overflow-y-auto">
      <InvoiceBuilder
        key={`${editorKey}-${revision}`}
        invoice={invoice}
        hideBack
        flush
        autosave
        trailing={controls}
        onSaved={setInvoice}
        onDeleted={onDeleted}
      />
    </div>
  )
}
