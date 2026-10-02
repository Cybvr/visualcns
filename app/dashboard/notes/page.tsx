"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { Button } from "@/components/ui/button"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { createNote, deleteNote, updateNote, watchNotes, type Note } from "@/lib/notes"
import { cn } from "@/lib/utils"

const SAVE_DELAY = 600

function noteTitle(note: Pick<Note, "title" | "body">) {
  return note.title.trim() || note.body.trim().split("\n")[0] || "New note"
}

function editedAt(iso: string) {
  const date = new Date(iso)
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

const NOTE_SORTS: SortOption<Note>[] = [
  {
    value: "updatedAt",
    label: "Last modified",
    get: (note) => Date.parse(note.updatedAt),
    ascLabel: "Oldest",
    descLabel: "Newest",
  },
  { value: "title", label: "Title", get: noteTitle, ascLabel: "A–Z", descLabel: "Z–A" },
]

function searchNote(note: Note) {
  return [noteTitle(note), note.title, note.body]
}

/** Private notes for whoever is signed in: a list on the left, the open note on the right. */
export default function NotesPage() {
  const { user } = useAuth()
  const uid = user?.uid || ""
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [error, setError] = useState(false)
  const [openId, setOpenId] = useState("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const pending = useRef<{ id: string; title: string; body: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!uid) return
    let stop = () => {}
    let cancelled = false
    getCurrentAgencyId()
      .then((agencyId) => {
        if (cancelled) return
        stop = watchNotes(agencyId, uid, (rows) => { setNotes(rows); setError(false) }, (reason) => { console.error("Notes subscription failed", reason); setError(true) })
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

  async function open(note: Note) {
    if (note.id === openId) return
    await flush()
    setOpenId(note.id)
    setTitle(note.title)
    setBody(note.body)
  }

  async function add() {
    await flush()
    try {
      const id = await createNote(uid)
      setOpenId(id)
      setTitle("")
      setBody("")
    } catch {
      toast.error("Couldn't create a note.")
    }
  }

  async function remove() {
    const id = openId
    pending.current = null
    if (timer.current) clearTimeout(timer.current)
    setSaving(false)
    setOpenId("")
    try {
      await deleteNote(id)
    } catch {
      toast.error("Couldn't delete the note.")
    }
  }

  const { results: visibleNotes, bar } = useFilterBar({
    items: notes ?? [],
    search: searchNote,
    sorts: NOTE_SORTS,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })

  const noteFilter = (
    <FilterBar
      {...bar}
      className="mb-0 h-16 border-b border-border"
      placeholder="Search notes"
      actions={
        <Button variant="ghost" className="bg-transparent text-foreground hover:bg-transparent" onClick={() => void add()}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New
        </Button>
      }
    />
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      {error ? (
        <p role="alert" className="mt-10 text-sm text-destructive">Notes unavailable. Refresh to try again.</p>
      ) : notes === null ? (
        <DashboardPageSkeleton rows={6} />
      ) : notes.length === 0 ? (
        <>
          <div className="lg:max-w-[30rem]">{noteFilter}</div>
          <FirstRunState
            label="Note"
            title="Let's write your first note"
            description="Keep private notes here for ideas, reminders, and working details."
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
              <ul className="mt-1">
                {visibleNotes.map((note) => {
                  const shown = note.id === openId ? { title, body } : note
                  const active = note.id === openId
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => void open(note)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "w-full rounded-md border-b border-border/60 px-1 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/50",
                          active && "bg-muted/50",
                        )}
                      >
                        <span className={cn("sidebar-nav-label block truncate font-medium text-sidebar-foreground/70", active && "text-sidebar-accent-foreground")}>{noteTitle(shown)}</span>
                        <span className="block text-[10px] font-normal leading-tight text-muted-foreground">
                          {editedAt(note.updatedAt)}{shown.title.trim() && shown.body.trim() ? ` · ${shown.body.trim().split("\n")[0]}` : ""}
                        </span>
                      </button>
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
                <div className="flex h-16 items-center gap-3 border-b border-border py-0">
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 shrink-0 sm:hidden" onClick={() => { void flush(); setOpenId("") }}>
                    <ArrowLeft className="size-4" aria-hidden="true" /> Notes
                  </Button>
                  <input
                    value={title}
                    onChange={(event) => edit({ title: event.target.value })}
                    placeholder="New note"
                    aria-label="Note title"
                    className="sidebar-nav-label min-w-0 flex-1 bg-transparent font-medium text-sidebar-foreground/70 outline-none placeholder:text-muted-foreground"
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground" aria-live="polite">{saving ? "Saving…" : "Saved"}</span>
                    <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => void remove()} aria-label="Delete note">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <textarea
                  value={body}
                  onChange={(event) => edit({ body: event.target.value })}
                  placeholder="Start writing"
                  aria-label="Note"
                  autoFocus
                  className="min-h-0 flex-1 resize-none py-5 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            ) : (
              <div className="flex min-h-[34rem] items-center justify-center text-center text-sm text-muted-foreground">
                Select a note to open its content.
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
