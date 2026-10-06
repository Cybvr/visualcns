"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ListChecks, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useRecordTitle } from "@/components/dashboard/page-title-context"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { CompactListRow, CompactListSkeleton } from "@/components/dashboard/compact-list-row"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar } from "@/components/dashboard/filter-bar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { createNote, deleteNote, updateNote, watchNotes, type Note } from "@/lib/notes"
import { cn } from "@/lib/utils"

const SAVE_DELAY = 600

function noteTitle(note: Pick<Note, "title" | "body">) {
  const title = typeof note.title === "string" ? note.title : ""
  const body = typeof note.body === "string" ? note.body : ""
  return title.trim() || body.trim().split("\n")[0] || "New note"
}

function editedAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "No date"
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

function searchNote(note: Note) {
  return [
    noteTitle(note),
    typeof note.title === "string" ? note.title : "",
    typeof note.body === "string" ? note.body : "",
  ]
}

type ChecklistItem = { checked: boolean; text: string }

function parseChecklist(value: string): ChecklistItem[] {
  if (!value.trim()) return [{ checked: false, text: "" }]
  return value.split("\n").map((line) => {
    const match = line.match(/^\s*-\s*\[([ xX])\]\s?(.*)$/)
    return match
      ? { checked: match[1].toLowerCase() === "x", text: match[2] }
      : { checked: false, text: line }
  })
}

function serializeChecklist(items: ChecklistItem[]) {
  return items.map((item) => `- [${item.checked ? "x" : " "}] ${item.text}`).join("\n")
}

function isChecklist(value: string) {
  return value.trim().length > 0 && value.split("\n").every((line) => /^\s*-\s*\[[ xX]\]\s?.*$/.test(line))
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
  const [checklistMode, setChecklistMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const pending = useRef<{ id: string; title: string; body: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Which note the editor fields currently hold, so a note opened from the URL loads once.
  const loadedId = useRef("")

  useRecordTitle(openId ? noteTitle({ title, body }) : null)

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
    setChecklistMode(isChecklist(nextBody))
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
      setChecklistMode(false)
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
    setChecklistMode(false)
    try {
      await deleteNote(id)
    } catch {
      toast.error("Couldn't delete the note.")
    }
  }

  async function removeFromList(note: Note) {
    if (note.id === openId) {
      await remove()
      return
    }
    try {
      await deleteNote(note.id)
    } catch {
      toast.error("Couldn't delete the note.")
    }
  }

  function toggleChecklist() {
    if (checklistMode) {
      setChecklistMode(false)
      return
    }
    edit({ body: serializeChecklist(parseChecklist(body)) })
    setChecklistMode(true)
  }

  function updateChecklist(index: number, changes: Partial<ChecklistItem>) {
    const items = parseChecklist(body)
    items[index] = { ...items[index], ...changes }
    edit({ body: serializeChecklist(items) })
  }

  function addChecklistItem() {
    edit({ body: serializeChecklist([...parseChecklist(body), { checked: false, text: "" }]) })
  }

  function removeChecklistItem(index: number) {
    const items = parseChecklist(body).filter((_, itemIndex) => itemIndex !== index)
    edit({ body: items.length > 0 ? serializeChecklist(items) : "" })
  }

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
              <ul className="mt-1">
                {visibleNotes.map((note) => {
                  const shown = note.id === openId ? { title, body } : note
                  const active = note.id === openId
                  return (
                    <li key={note.id}>
                      <CompactListRow
                        title={noteTitle(shown)}
                        subtitle={`${editedAt(note.updatedAt)}${typeof shown.title === "string" && typeof shown.body === "string" && shown.title.trim() && shown.body.trim() ? ` · ${shown.body.trim().split("\n")[0]}` : ""}`}
                        active={active}
                        onClick={() => void open(note)}
                        menuLabel={`Options for ${noteTitle(shown)}`}
                        menu={<>
                          <DropdownMenuItem onSelect={() => void open(note)}>Open note</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => void removeFromList(note)}>Delete note</DropdownMenuItem>
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
                <div className="flex h-16 items-center gap-3 border-b border-border py-0">
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 shrink-0 sm:hidden" onClick={close}>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn("size-8 text-muted-foreground", checklistMode && "bg-muted text-foreground")}
                      onClick={toggleChecklist}
                      aria-label={checklistMode ? "Switch to note" : "Add checklist"}
                      title={checklistMode ? "Switch to note" : "Add checklist"}
                    >
                      <ListChecks className="size-4" aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => void remove()} aria-label="Delete note">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                {checklistMode ? (
                  <div className="min-h-0 flex-1 overflow-y-auto py-5">
                    <div className="space-y-1">
                      {parseChecklist(body).map((item, index) => (
                        <div key={index} className="group flex items-center gap-3 py-1">
                          <Checkbox
                            checked={item.checked}
                            onChange={(event) => updateChecklist(index, { checked: event.target.checked })}
                            aria-label={`Mark item ${index + 1} complete`}
                          />
                          <Input
                            value={item.text}
                            onChange={(event) => updateChecklist(index, { text: event.target.value })}
                            placeholder="Checklist item"
                            aria-label={`Checklist item ${index + 1}`}
                            className={cn("h-9 flex-1 border-border/60 text-base", item.checked && "text-muted-foreground line-through")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() => removeChecklistItem(index)}
                            aria-label={`Remove item ${index + 1}`}
                          >
                            <X className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="mt-3 px-1 text-muted-foreground" onClick={addChecklistItem}>
                      <Plus className="size-4" aria-hidden="true" /> Add item
                    </Button>
                  </div>
                ) : (
                  <textarea
                    value={body}
                    onChange={(event) => edit({ body: event.target.value })}
                    placeholder="Start writing"
                    aria-label="Note"
                    autoFocus
                    className="note-body min-h-0 flex-1 resize-none py-5 text-foreground outline-none placeholder:text-muted-foreground"
                  />
                )}
              </div>
            ) : (
              <div className="min-h-[34rem]" aria-hidden="true" />
            )}
          </section>
        </div>
      )}
    </main>
  )
}
