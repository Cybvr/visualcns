"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type TextareaHTMLAttributes } from "react"
import { ListChecks, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useRecordTitle, usePageHeaderActions, usePageHeaderBack, usePageHeaderTitle, usePageHeaderOverride } from "@/components/dashboard/page-title-context"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { CompactListRow, CompactListSkeleton, MOBILE_LIST_CARD } from "@/components/dashboard/compact-list-row"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar } from "@/components/dashboard/filter-bar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

/** Mobile second line: the body text the title does not already show. */
function notePreview(note: Pick<Note, "title" | "body">) {
  const body = typeof note.body === "string" ? note.body : ""
  if (isChecklist(body)) {
    const items = parseChecklist(body).filter((item) => !item.plain)
    return `${items.filter((item) => item.checked).length} of ${items.length} done`
  }
  const lines = body.split("\n").map((line) => line.trim()).filter(Boolean)
  const titled = typeof note.title === "string" && note.title.trim()
  return (titled ? lines : lines.slice(1)).join(" ") || "No additional text"
}

function searchNote(note: Note) {
  return [
    noteTitle(note),
    typeof note.title === "string" ? note.title : "",
    typeof note.body === "string" ? note.body : "",
  ]
}

// A plain item is a heading or paragraph line: shown without a checkbox, saved as-is.
type ChecklistItem = { checked: boolean; text: string; plain?: boolean }

const CHECK_LINE = /^\s*-\s*\[([ xX])\]\s?(.*)$/

// With convert, lines that aren't checklist items become items (used when turning a plain note into a checklist).
function parseChecklist(value: string, convert = false): ChecklistItem[] {
  if (!value.trim()) return [{ checked: false, text: "" }]
  return value.split("\n").map((line) => {
    const match = line.match(CHECK_LINE)
    return match
      ? { checked: match[1].toLowerCase() === "x", text: match[2] }
      : { checked: false, text: line, plain: !convert }
  })
}

function serializeChecklist(items: ChecklistItem[]) {
  return items.map((item) => (item.plain ? item.text : `- [${item.checked ? "x" : " "}] ${item.text}`)).join("\n")
}

// Any checklist line makes it a checklist note; other lines stay as plain text between the items.
function isChecklist(value: string) {
  return value.split("\n").some((line) => CHECK_LINE.test(line))
}

/** A text box that grows with its text, so long lines wrap instead of clipping. */
function GrowingText({ value, className, inputRef, ...props }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value"> & {
  value: string
  inputRef?: (node: HTMLTextAreaElement | null) => void
}) {
  const node = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = node.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      {...props}
      ref={(el) => { node.current = el; inputRef?.(el) }}
      rows={1}
      value={value}
      className={cn("block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-muted-foreground", className)}
    />
  )
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
  const itemInputs = useRef<Array<HTMLTextAreaElement | null>>([])

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
    edit({ body: serializeChecklist(parseChecklist(body, true)) })
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

  // Enter starts a new item below.
  function insertChecklistItem(index: number) {
    const items = parseChecklist(body)
    items.splice(index + 1, 0, { checked: false, text: "" })
    edit({ body: serializeChecklist(items) })
    requestAnimationFrame(() => itemInputs.current[index + 1]?.focus())
  }

  // Backspace in an empty item removes it and moves the cursor to the end of the item above.
  function onChecklistKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      insertChecklistItem(index)
      return
    }
    if (event.key !== "Backspace" || event.currentTarget.value !== "" || index === 0) return
    event.preventDefault()
    removeChecklistItem(index)
    requestAnimationFrame(() => {
      const previous = itemInputs.current[index - 1]
      if (!previous) return
      previous.focus()
      previous.setSelectionRange(previous.value.length, previous.value.length)
    })
  }

  // Header nodes are memoized (they go through context); handlers are read from a ref so they stay current.
  const latest = useRef({ edit, close, toggleChecklist, remove })
  latest.current = { edit, close, toggleChecklist, remove }

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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-10 text-muted-foreground [&_svg]:size-5", checklistMode && "bg-muted text-foreground")}
          onClick={() => latest.current.toggleChecklist()}
          aria-label={checklistMode ? "Switch to note" : "Add checklist"}
        >
          <ListChecks aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-10 text-muted-foreground hover:text-destructive [&_svg]:size-5" onClick={() => void latest.current.remove()} aria-label="Delete note">
          <Trash2 aria-hidden="true" />
        </Button>
      </>
    ) : null,
    [headerOpen, checklistMode],
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
                        subtitle={`${editedAt(note.updatedAt)}${typeof shown.title === "string" && typeof shown.body === "string" && shown.title.trim() && shown.body.trim() ? ` · ${shown.body.trim().split("\n")[0]}` : ""}`}
                        meta={editedAt(note.updatedAt)}
                        mobileSubtitle={notePreview(shown)}
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
                  <div className="min-h-0 flex-1 overflow-y-auto py-5 max-sm:min-h-[55svh] max-sm:flex-none max-sm:py-1">
                    <div className="space-y-1">
                      {parseChecklist(body).map((item, index) => (
                        <div key={index} className="group flex items-start gap-3 py-1">
                          {item.plain ? (
                            <span className="size-4 shrink-0" aria-hidden="true" />
                          ) : (
                            <Checkbox
                              className="mt-2.5"
                              checked={item.checked}
                              onChange={(event) => updateChecklist(index, { checked: event.target.checked })}
                              aria-label={`Mark item ${index + 1} complete`}
                            />
                          )}
                          <GrowingText
                            inputRef={(node) => {
                              itemInputs.current[index] = node
                            }}
                            value={item.text}
                            onChange={(event) => updateChecklist(index, { text: event.target.value.replace(/\n/g, " ") })}
                            onKeyDown={(event) => onChecklistKeyDown(event, index)}
                            placeholder={item.plain ? "Text" : "Checklist item"}
                            aria-label={`${item.plain ? "Text line" : "Checklist item"} ${index + 1}`}
                            className={cn("min-w-0 flex-1 py-1.5 text-base", item.checked && !item.plain && "text-muted-foreground line-through")}
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
                    className="note-body min-h-0 flex-1 resize-none py-5 text-foreground outline-none placeholder:text-muted-foreground max-sm:min-h-[55svh] max-sm:flex-none max-sm:py-1"
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
