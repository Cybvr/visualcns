"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, FileText, Pencil, Send, Trash2 } from "lucide-react"

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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

/**
 * The title of whatever sits beside Ngai (a document, an invoice, a company), with a
 * chevron that opens Rename, Share and Delete. It replaces the chat buttons there.
 * Rename edits the title in place and saves on Enter or when you click away.
 */
export function ArtifactTitleMenu({
  title,
  noun,
  onRename,
  onShare,
  onDelete,
  deleteDescription,
  confirmDelete = true,
  onOpen,
}: {
  /** Shown once the item is closed beside the chat, to bring it back. */
  onOpen?: () => void
  /** False when the page asks for confirmation itself. */
  confirmDelete?: boolean
  title: string
  /** "document", "invoice", "company": used in labels and the confirm. */
  noun: string
  onRename?: (title: string) => Promise<void> | void
  onShare?: () => void
  onDelete?: () => Promise<void> | void
  deleteDescription?: string
}) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(title)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!renaming) return
    // After the menu closes, so it doesn't take the focus back.
    const id = window.setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 50)
    return () => window.clearTimeout(id)
  }, [renaming])

  function finishRename(save: boolean) {
    setRenaming(false)
    const next = draft.trim()
    if (save && next && next !== title) void onRename?.(next)
  }

  async function remove() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
      setConfirming(false)
    } finally {
      setDeleting(false)
    }
  }

  // Nothing to do with it yet (a brand-new chat): just the title.
  if (!onRename && !onShare && !onDelete && !onOpen) return <span className="min-w-0 flex-1 truncate px-1.5 text-sm font-semibold">{title}</span>

  if (renaming) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finishRename(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); finishRename(true) }
          if (event.key === "Escape") { event.preventDefault(); finishRename(false) }
        }}
        aria-label={`${noun} name`}
        className="min-w-0 flex-1 rounded-md bg-muted px-1.5 py-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${title} options`}
            className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-1.5 py-1 text-left text-sm font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="min-w-0 truncate">{title}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-[110] w-48">
          {onOpen && <DropdownMenuItem onSelect={onOpen}><FileText aria-hidden="true" />Open {noun}</DropdownMenuItem>}
          {onRename && <DropdownMenuItem onSelect={() => { setDraft(title); setRenaming(true) }}><Pencil aria-hidden="true" />Rename</DropdownMenuItem>}
          {onShare && <DropdownMenuItem onSelect={onShare}><Send aria-hidden="true" />Share</DropdownMenuItem>}
          {onDelete && (
            <>
              {(onRename || onShare) && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => confirmDelete ? setConfirming(true) : void onDelete()} className="text-destructive focus:text-destructive"><Trash2 aria-hidden="true" />Delete</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={(open) => { if (!deleting) setConfirming(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {noun}?</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription ?? `"${title}" will be removed for good. This cannot be undone.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void remove() }} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
