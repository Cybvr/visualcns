"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Send, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useRecordTitle, usePageHeaderActions, usePageHeaderBack, usePageHeaderTitle, usePageHeaderOverride } from "@/components/dashboard/page-title-context"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { CompactListRow, CompactListSkeleton, MOBILE_LIST_CARD } from "@/components/dashboard/compact-list-row"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar } from "@/components/dashboard/filter-bar"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { ShareLinkField } from "@/components/dashboard/share-link-field"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { createNote, deleteNote, noteBodyHtml, setNoteShared, updateNote, watchNotes, type Note } from "@/lib/notes"
import { cn } from "@/lib/utils"

const SAVE_DELAY = 600

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }

/** The note's text, one entry per line, whether the body is saved HTML or older plain text. */
function bodyLines(body: string) {
  return body
    .replace(/<\/(p|li|h[1-6]|blockquote|tr)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function noteTitle(note: Pick<Note, "title" | "body">) {
  const title = typeof note.title === "string" ? note.title : ""
  const body = typeof note.body === "string" ? note.body : ""
  return title.trim() || bodyLines(body)[0] || "New note"
}

function editedAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "No date"
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

/** Mobile second line: the body text the title does not already show. */
function notePreview(note: Pick<Note, "title" | "body">) {
  const body = typeof note.body === "string" ? note.body : ""
  const items = body.match(/data-type="taskItem"|^\s*-\s*\[[ xX]\]/gm)?.length ?? 0
  if (items > 0) {
    const done = body.match(/data-checked="true"|^\s*-\s*\[[xX]\]/gm)?.length ?? 0
    return `${done} of ${items} done`
  }
  const lines = bodyLines(body)
  const titled = typeof note.title === "string" && note.title.trim()
  return (titled ? lines : lines.slice(1)).join(" ") || "No additional text"
}

function searchNote(note: Note) {
  return [
    noteTitle(note),
    typeof note.title === "string" ? note.title : "",
    typeof note.body === "string" ? bodyLines(note.body).join(" ") : "",
  ]
}

/** Shared agency notes: a list on the left, the open note on the right. */
export default function NotesPage() {
  const { user } = useAuth()
  const uid = user?.uid || ""
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [error, setError] = useState(false)
  const [selectedId, select] = useUrlSelection("note")
  const openId = selectedId ?? ""
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [sharingId, setSharingId] = useState("")
  const [shareEnabled, setShareEnabled] = useState(false)
  const [shareSaving, setShareSaving] = useState(false)
  const pending = useRef<{ id: string; title: string; body: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Which note the editor fields currently hold, so a note opened from the URL loads once.
  const loadedId = useRef("")

  useRecordTitle(openId ? noteTitle({ title, body }) : null)

  // On phones the open note's back button, title and actions live in the dashboard header.
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)")
    const sync = () => setPhone(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])
  const headerOpen = phone && Boolean(openId) && !error && notes !== null && notes.length > 0
  const { setReplacesMobileDefaults } = usePageHeaderOverride()
  useEffect(() => {
    setReplacesMobileDefaults(headerOpen)
    return () => setReplacesMobileDefaults(false)
  }, [headerOpen, setReplacesMobileDefaults])

  useEffect(() => {
    if (!uid) return
    let stop = () => {}
    let cancelled = false
    getCurrentAgencyId()
      .then((agencyId) => {
        if (cancelled) return
        stop = watchNotes(agencyId, (rows) => { setNotes(rows); setError(false) }, (reason) => { console.error("Notes subscription failed", reason); setError(true) })
      })
      .catch(() => setError(true))
    return () => { cancelled = true; stop() }
  }, [uid])

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

  function edit(changes: { title?: string; body?: string }) {
    const nextTitle = changes.title ?? title
    const nextBody = changes.body ?? body
    setTitle(nextTitle)
    setBody(nextBody)
    pending.current = { id: openId, title: nextTitle, body: nextBody }
    setSaving(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), SAVE_DELAY)
  }

  function load(note: Note) {
    const nextTitle = typeof note.title === "string" ? note.title : ""
    const nextBody = typeof note.body === "string" ? note.body : ""
    loadedId.current = note.id
    setTitle(nextTitle)
    setBody(nextBody)
  }

  // A note opened from the address bar, or by going back and forward, fills the editor once the list arrives.
  useEffect(() => {
    if (!notes || openId === loadedId.current) return
    void flush()
    if (!openId) { loadedId.current = ""; return }
    const note = notes.find((item) => item.id === openId)
    if (note) load(note)
    else select(null, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, openId])

  async function open(note: Note) {
    if (note.id === openId) return
    await flush()
    load(note)
    select(note.id)
  }

  async function add() {
    await flush()
    try {
      const id = await createNote(uid)
      loadedId.current = id
      setTitle("")
      setBody("")
      select(id)
    } catch {
      toast.error("Couldn't create a note.")
    }
  }

  function close() {
    void flush()
    select(null)
  }

  async function remove() {
    const id = openId
    pending.current = null
    if (timer.current) clearTimeout(timer.current)
    setSaving(false)
    loadedId.current = ""
    select(null)
    try {
      await deleteNote(id)
    } catch {
      toast.error("Couldn't delete the note.")
    }
  }

  function askDelete() {
    setPendingDelete({ id: openId, title: noteTitle({ title, body }) })
  }

  function openShare(noteId = openId) {
    setSharingId(noteId)
    setShareEnabled(Boolean(notes?.find((note) => note.id === noteId)?.shareEnabled))
    setShareOpen(true)
  }

  async function saveSharing() {
    setShareSaving(true)
    try {
      await setNoteShared(sharingId || openId, shareEnabled)
      setShareOpen(false)
    } catch {
      toast.error("Couldn't update sharing for this note.")
    } finally {
      setShareSaving(false)
    }
  }

  async function removeFromList(id: string) {
    if (id === openId) {
      await remove()
      return
    }
    try {
      await deleteNote(id)
    } catch {
      toast.error("Couldn't delete the note.")
    }
  }

  // Header nodes are memoized (they go through context); handlers are read from a ref so they stay current.
  const latest = useRef({ edit, close, askDelete, openShare })
  latest.current = { edit, close, askDelete, openShare }

  const headerBack = useMemo(
    () => (headerOpen ? { label: "Back to notes", onClick: () => latest.current.close() } : null),
    [headerOpen],
  )
  const headerTitle = useMemo(
    () => headerOpen ? (
      <input
        value={title}
        onChange={(event) => latest.current.edit({ title: event.target.value })}
        placeholder="New note"
        aria-label="Note title"
        className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    ) : null,
    [headerOpen, title],
  )
  const headerActions = useMemo(
    () => headerOpen ? (
      <>
        <Button type="button" variant="ghost" size="icon" className="size-10 text-muted-foreground [&_svg]:size-5" onClick={() => latest.current.openShare()} aria-label="Share note">
           <Send aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-10 text-muted-foreground hover:text-destructive [&_svg]:size-5" onClick={() => latest.current.askDelete()} aria-label="Delete note">
          <Trash2 aria-hidden="true" />
        </Button>
      </>
    ) : null,
    [headerOpen],
  )
  usePageHeaderBack(headerBack)
  usePageHeaderTitle(headerTitle)
  usePageHeaderActions(headerActions)

  const { results: visibleNotes, bar } = useFilterBar({
    items: notes ?? [],
    search: searchNote,
    sorts: [],
  })

  const noteFilter = (
    <TableFilterBar
      {...bar}
      placeholder="Search notes"
      createAction={{ label: "New note", onClick: () => void add() }}
    />
  )

  return (
    <main className="notes-page mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      {error ? (
        <p role="alert" className="mt-10 text-sm text-destructive">Notes unavailable. Refresh to try again.</p>
      ) : notes === null ? (
        <div className="lg:grid lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)] lg:items-start lg:gap-6">
          <div className="min-w-0">
            {noteFilter}
            <CompactListSkeleton />
          </div>
          <div className="hidden min-h-[34rem] sm:block" aria-hidden="true" />
        </div>
      ) : notes.length === 0 ? (
        <>
          <div className="lg:max-w-[30rem]">{noteFilter}</div>
          <FirstRunState
            label="Note"
            title="Let's write your first note"
            description="Keep shared notes here for ideas, reminders, and working details."
            action={<Button onClick={() => void add()}>New note</Button>}
          />
        </>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)] lg:items-start lg:gap-6">
          <div className={cn("min-w-0", openId && "hidden sm:block")}>
            {noteFilter}
            {visibleNotes.length === 0 ? (
              <EmptySearchState label="No notes match your search." />
            ) : (
              <ul className={cn("mt-1", MOBILE_LIST_CARD)}>
                {visibleNotes.map((note) => {
                  const shown = note.id === openId ? { title, body } : note
                  const active = note.id === openId
                  return (
                    <li key={note.id}>
                      <CompactListRow
                        title={noteTitle(shown)}
                        subtitle={`${editedAt(note.updatedAt)}${typeof shown.title === "string" && typeof shown.body === "string" && shown.title.trim() && shown.body.trim() ? ` · ${bodyLines(shown.body)[0] ?? ""}` : ""}`}
                        meta={editedAt(note.updatedAt)}
                        mobileSubtitle={notePreview(shown)}
                        active={active}
                        onClick={() => void open(note)}
                        menuLabel={`Options for ${noteTitle(shown)}`}
                        menu={<>
                          <DropdownMenuItem onSelect={() => void open(note)}>Open note</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openShare(note.id)}>Share note</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete({ id: note.id, title: noteTitle(note) })}>Delete note</DropdownMenuItem>
                        </>}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <section className={cn(
            "min-w-0 lg:sticky lg:top-16 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden",
            !openId && "hidden sm:block",
          )}>
            {openId ? (
              <div className="flex min-h-[70svh] flex-1 flex-col lg:min-h-0">
                <div className="flex h-16 items-center gap-3 border-b border-border py-0 max-sm:hidden">
                  <input
                    value={title}
                    onChange={(event) => edit({ title: event.target.value })}
                    placeholder="New note"
                    aria-label="Note title"
                    className="sidebar-nav-label min-w-0 flex-1 bg-transparent font-medium text-sidebar-foreground/70 outline-none placeholder:text-muted-foreground"
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground" aria-live="polite">{saving ? "Saving…" : "Saved"}</span>
                    <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => openShare()} aria-label="Share note">
                       <Send className="size-4" aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={askDelete} aria-label="Delete note">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <RichTextEditor
                  key={openId}
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
            ) : (
              <div className="min-h-[34rem]" aria-hidden="true" />
            )}
          </section>
        </div>
      )}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share note</DialogTitle>
            <DialogDescription>Anyone with the public link can read this note. They cannot edit it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ShareLinkField enabled={shareEnabled} onEnabledChange={setShareEnabled} path={(sharingId || openId) ? `/share/notes/${encodeURIComponent(sharingId || openId)}` : undefined} />
            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={() => void saveSharing()} disabled={shareSaving}>
                {shareSaving ? "Saving" : "Save sharing"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>{pendingDelete?.title || "This note"} will be removed for good.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && void removeFromList(pendingDelete.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
