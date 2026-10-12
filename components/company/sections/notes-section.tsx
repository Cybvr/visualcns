"use client"

import { useEffect, useRef, useState } from "react"
import { StickyNote, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { CompanyEmptyState } from "@/components/company/empty-state"
import { SectionAddButton } from "@/components/company/section-add-button"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ListSkeleton, ListToolbar, useListSearch, useListView } from "@/components/dashboard/list-search"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { createNote, deleteNote, updateNote, watchCompanyNotes, type Note } from "@/lib/notes"

const SAVE_DELAY = 600
const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }
const CHECK_LINE = /^\s*-\s*\[([ xX])\]\s?(.*)$/

function bodyLines(body: string) {
  return body
    .replace(/<\/(p|li|h[1-6]|blockquote|tr)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function bodyHtml(body: string) {
  if (!body.trim() || /^\s*</.test(body)) return body
  let html = ""
  let checklistOpen = false
  for (const line of body.split("\n")) {
    const match = line.match(CHECK_LINE)
    if (match) {
      if (!checklistOpen) html += '<ul data-type="taskList">'
      checklistOpen = true
      const checked = match[1].toLowerCase() === "x"
      html += `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox"${checked ? " checked" : ""}><span></span></label><div><p>${escapeHtml(match[2])}</p></div></li>`
      continue
    }
    if (checklistOpen) html += "</ul>"
    checklistOpen = false
    if (line.trim()) html += `<p>${escapeHtml(line)}</p>`
  }
  return checklistOpen ? `${html}</ul>` : html
}

function noteTitle(note: Pick<Note, "title" | "body">) {
  return note.title.trim() || bodyLines(note.body)[0] || "New note"
}

function notePreview(note: Pick<Note, "title" | "body">) {
  const lines = bodyLines(note.body)
  return (note.title.trim() ? lines : lines.slice(1)).join(" ") || "No additional text"
}

function editedAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "No date"
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

export function NotesSection() {
  const { user, loading: authLoading } = useAuth()
  const { company, visitorAgencyId } = useCompanyPage()
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [error, setError] = useState(false)
  const [selectedId, select] = useUrlSelection("note")
  const openId = selectedId ?? ""
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null)
  const pending = useRef<{ id: string; title: string; body: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedId = useRef("")
  const { query, setQuery, results } = useListSearch(notes ?? [], (note) => [noteTitle(note), notePreview(note)])
  const [view, setView] = useListView("company-notes")

  useEffect(() => {
    if (!user || !visitorAgencyId) {
      if (!authLoading) setNotes([])
      return
    }
    setNotes(null)
    return watchCompanyNotes(
      visitorAgencyId,
      company.id,
      (rows) => { setNotes(rows); setError(false) },
      (reason) => { console.error("Company notes subscription failed", reason); setError(true); setNotes([]) },
    )
  }, [authLoading, company.id, user, visitorAgencyId])

  async function flush() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const next = pending.current
    pending.current = null
    if (!next) return
    try {
      await updateNote(next.id, { title: next.title, body: next.body })
    } catch {
      toast.error("Couldn't save your note.")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => () => { void flush() }, [])

  function show(note: Note) {
    loadedId.current = note.id
    setTitle(note.title)
    setBody(note.body)
  }

  function load(note: Note) {
    show(note)
    select(note.id)
  }

  useEffect(() => {
    if (!notes || openId === loadedId.current) return
    void flush()
    if (!openId) { loadedId.current = ""; return }
    const note = notes.find((item) => item.id === openId)
    if (note) show(note)
    else select(null, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, openId])

  function edit(changes: { title?: string; body?: string }) {
    if (!openId) return
    const nextTitle = changes.title ?? title
    const nextBody = changes.body ?? body
    setTitle(nextTitle)
    setBody(nextBody)
    pending.current = { id: openId, title: nextTitle, body: nextBody }
    setSaving(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), SAVE_DELAY)
  }

  async function add() {
    if (!user) return
    await flush()
    try {
      const id = await createNote(user.uid, company.id)
      load({ id, agencyId: visitorAgencyId, companyId: company.id, createdBy: user.uid, title: "", body: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    } catch {
      toast.error("Couldn't create a note.")
    }
  }

  function close() {
    void flush()
    loadedId.current = ""
    select(null)
  }

  async function remove(note: Note) {
    if (note.id === openId) {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      pending.current = null
      setSaving(false)
      loadedId.current = ""
      select(null)
    }
    setPendingDelete(null)
    try {
      await deleteNote(note.id)
    } catch {
      toast.error("Couldn't delete the note.")
    }
  }

  if (authLoading || notes === null) return <ListSkeleton view={view} label="Loading notes" />
  if (!user) return <CompanyEmptyState icon={StickyNote} title="Sign in to view notes" description="Company notes are available to signed-in team members." />
  if (error) return <p className="mt-8 text-sm text-destructive" role="alert">Notes are unavailable. Refresh to try again.</p>

  return (
    <section className="mt-5">
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search notes"
        view={view}
        onViewChange={setView}
        actions={<SectionAddButton label="New note" onClick={() => void add()} />}
      />

      {notes.length === 0 ? (
        <CompanyEmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Keep shared ideas, reminders, and working details here."
          action={<SectionAddButton label="New note" onClick={() => void add()} />}
        />
      ) : results.length === 0 ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches your search.</p>
      ) : view === "card" ? (
        <div className="mt-4">
          <GridCardList>
            {results.map((note) => (
              <GridCard
                key={note.id}
                icon={<StickyNote className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                title={noteTitle(note)}
                subtitle={editedAt(note.updatedAt)}
                preview={<p className="line-clamp-6 size-full p-4 text-left text-sm leading-6 text-muted-foreground">{notePreview(note)}</p>}
                onClick={() => { void flush().then(() => load(note)) }}
                ariaLabel={`Open note: ${noteTitle(note)}`}
                menuLabel={`Options for ${noteTitle(note)}`}
                menu={<>
                  <DropdownMenuItem onSelect={() => { void flush().then(() => load(note)) }}>Open note</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(note)}>Delete note</DropdownMenuItem>
                </>}
              />
            ))}
          </GridCardList>
        </div>
      ) : (
        <div className="mt-4">
          {results.map((note) => (
            <MobileDataCard
              key={note.id}
              surface="list"
              variant="inline"
              iconShape="circle"
              icon={<StickyNote className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
              title={noteTitle(note)}
              subtitle={notePreview(note)}
              trailing={editedAt(note.updatedAt)}
              onClick={() => { void flush().then(() => load(note)) }}
              ariaLabel={`Open note: ${noteTitle(note)}`}
              menuLabel={`Options for ${noteTitle(note)}`}
              menu={<>
                <DropdownMenuItem onSelect={() => { void flush().then(() => load(note)) }}>Open note</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(note)}>Delete note</DropdownMenuItem>
              </>}
            />
          ))}
        </div>
      )}

      <Sheet open={Boolean(openId)} onOpenChange={(open) => { if (!open) close() }}>
        <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="sr-only">Edit note</SheetTitle>
            <SheetDescription className="sr-only">Edit this company note. Changes save automatically.</SheetDescription>
            <div className="flex items-center gap-3">
              <input
                value={title}
                onChange={(event) => edit({ title: event.target.value })}
                placeholder="New note"
                aria-label="Note title"
                className="min-w-0 flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-muted-foreground"
              />
              <span className="shrink-0 text-xs text-muted-foreground" aria-live="polite">{saving ? "Saving…" : "Saved"}</span>
              <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => {
                const note = notes.find((item) => item.id === openId)
                if (note) setPendingDelete({ ...note, title, body })
              }} aria-label="Delete note">
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </SheetHeader>
          <RichTextEditor
            key={loadedId.current}
            value={bodyHtml(body)}
            onChange={(html) => edit({ body: html })}
            placeholder="Start writing"
            scrollable
            borderless
            className="min-h-0 flex-1"
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>{pendingDelete ? noteTitle(pendingDelete) : "This note"} will be removed for good.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (pendingDelete) void remove(pendingDelete) }}>Delete note</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
