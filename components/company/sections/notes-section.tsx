"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Send, StickyNote, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import type { ExtraDocumentEntry } from "@/components/company/company-documents"
import { useCompanyPage } from "@/components/company/company-page-context"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { ShareLinkField } from "@/components/dashboard/share-link-field"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { formatMarkdownParagraphs } from "@/lib/markdown"
import { createNote, deleteNote, setNoteShared, updateNote, watchCompanyNotes, type Note } from "@/lib/notes"

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
  if (!body.trim()) return body
  // Notes saved with Markdown left as plain paragraphs (raw "| a | b |" tables) open formatted.
  if (/^\s*</.test(body)) return formatMarkdownParagraphs(body) ?? body
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

/**
 * The company's notes as cards for the Documents list, plus the "Note" entry for
 * its New menu and the editor, share and delete dialogs to render beside it.
 * Notes are for signed-in members only, so visitors get none.
 */
export function useCompanyNotes(): { entries: ExtraDocumentEntry[]; addItem: ReactNode; dialogs: ReactNode } {
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
  const [sharingNote, setSharingNote] = useState<Note | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareEnabled, setShareEnabled] = useState(false)
  const [shareSaving, setShareSaving] = useState(false)
  const pending = useRef<{ id: string; title: string; body: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedId = useRef("")

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

  async function duplicate(note: Note) {
    if (!user) return
    try {
      const id = await createNote(user.uid, company.id)
      await updateNote(id, { title: `${noteTitle(note)} (Copy)`, body: note.body })
    } catch {
      toast.error("Couldn't duplicate the note.")
    }
  }

  function close() {
    void flush()
    loadedId.current = ""
    select(null)
  }

  function openShare(note: Note) {
    setSharingNote(note)
    setShareEnabled(note.shareEnabled === true)
    setShareOpen(true)
  }

  async function saveSharing() {
    if (!sharingNote) return
    setShareSaving(true)
    try {
      const id = sharingNote.id
      await setNoteShared(id, shareEnabled)
      setShareOpen(false)
    } catch {
      toast.error("Couldn't update sharing for this note.")
    } finally {
      setShareSaving(false)
    }
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

  useEffect(() => {
    if (error) toast.error("Notes are unavailable. Refresh to try again.")
  }, [error])

  const open = (note: Note) => { void flush().then(() => load(note)) }
  const entries: ExtraDocumentEntry[] = (user ? notes ?? [] : []).map((note) => ({
    key: `note-${note.id}`,
    title: noteTitle(note),
    kindLabel: "Note",
    statusLabel: note.shareEnabled ? "Shared" : "Private",
    updatedMs: Date.parse(note.updatedAt) || 0,
    searchText: [notePreview(note)],
    icon: <StickyNote className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
    actions: {
      noun: "note",
      name: noteTitle(note),
      onOpen: () => open(note),
      onRename: async (nextTitle: string) => {
        try {
          await updateNote(note.id, { title: nextTitle, body: note.body })
        } catch {
          toast.error("Couldn't rename the note.")
        }
      },
      onDuplicate: () => duplicate(note),
      extra: <DropdownMenuItem onSelect={() => openShare(note)}>Share</DropdownMenuItem>,
      onDelete: () => remove(note),
    },
  }))
  const addItem = user ? <DropdownMenuItem onSelect={() => void add()}>Note</DropdownMenuItem> : null

  const dialogs = (
    <>
      <Sheet open={Boolean(openId)} onOpenChange={(open) => { if (!open) close() }}>
        <SheetContent side="right" showClose={false} className="w-full gap-0 overflow-hidden p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border px-5 py-3">
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
              <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => {
                const note = notes?.find((item) => item.id === openId)
                if (note) openShare(note)
              }} aria-label="Share note">
                <Send className="size-4" aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => {
                const note = notes?.find((item) => item.id === openId)
                if (note) setPendingDelete({ ...note, title, body })
              }} aria-label="Delete note">
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
              <SheetClose asChild>
                <Button type="button" variant="ghost" size="icon" className="-mr-2 size-8 text-muted-foreground" aria-label="Close">
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>
          <RichTextEditor
            key={loadedId.current}
            value={bodyHtml(body)}
            onChange={(html) => edit({ body: html })}
            placeholder="Start writing"
            scrollable
            borderless
            documentLayout
            showRuler
            className="min-h-0 flex-1"
          />
        </SheetContent>
      </Sheet>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share note</DialogTitle>
            <DialogDescription>Anyone with the public link can read this note. They cannot edit it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ShareLinkField enabled={shareEnabled} onEnabledChange={setShareEnabled} path={sharingNote ? `/share/notes/${encodeURIComponent(sharingNote.id)}` : undefined} />
            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={() => void saveSharing()} disabled={shareSaving}>
                {shareSaving ? "Saving" : "Save sharing"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  )

  return { entries, addItem, dialogs }
}
