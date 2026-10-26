"use client"

import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react"

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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

/**
 * What one card or row can do. Every card and row in the app takes this
 * instead of its own menu, and the menu is always drawn the same way:
 * Rename, Duplicate, Archive or Restore, the page's own actions, then Delete
 * last. Leave out what an item can't do. There is no Open item: clicking the
 * card opens it. Rename and Delete ask first, in dialogs drawn once by
 * ItemActionsProvider.
 */
export type ItemActions = {
  /** What the item is called in the menu and dialogs, e.g. "campaign". */
  noun: string
  /** The item's current name, for the rename field and the delete question. */
  name: string
  /** How the item opens. Not drawn in the menu, since clicking the card opens it. */
  onOpen?: () => void
  onRename?: (name: string) => Promise<void> | void
  onDuplicate?: () => Promise<void> | void
  /** Reversible visibility action, shown between Duplicate and Delete. */
  onArchive?: () => Promise<void> | void
  onRestore?: () => Promise<void> | void
  /** The page's own actions, as DropdownMenuItems, shown between Duplicate and Delete. */
  extra?: ReactNode
  onDelete?: () => Promise<void> | void
  /** What the delete question says happens, when it isn't simply "removed for good". */
  deleteMessage?: string
  /** The menu item's wording when "Delete" is wrong, e.g. "Remove from team". */
  deleteLabel?: string
}

/** True when the item has anything to put in its menu; no dots are drawn otherwise. */
export function hasItemActions(actions: ItemActions | undefined): actions is ItemActions {
  return Boolean(actions && (actions.onRename || actions.onDuplicate || actions.onArchive || actions.onRestore || actions.extra || actions.onDelete))
}

const ItemActionsContext = createContext<{ rename: (actions: ItemActions) => void; remove: (actions: ItemActions) => void } | null>(null)

/** Draws the Rename and Delete dialogs for every item menu inside it. Mounted once in each app shell. */
export function ItemActionsProvider({ children }: { children: ReactNode }) {
  const [renaming, setRenaming] = useState<{ actions: ItemActions; name: string } | null>(null)
  const [deleting, setDeleting] = useState<ItemActions | null>(null)
  const [busy, setBusy] = useState(false)

  async function submitRename(event: FormEvent) {
    event.preventDefault()
    const next = renaming?.name.trim()
    if (!renaming || !next || !renaming.actions.onRename) return
    setBusy(true)
    try {
      await renaming.actions.onRename(next)
      setRenaming(null)
    } catch (renameError) {
      console.error("Error renaming item:", renameError)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleting?.onDelete) return
    setBusy(true)
    try {
      await deleting.onDelete()
      setDeleting(null)
    } catch (deleteError) {
      console.error("Error deleting item:", deleteError)
    } finally {
      setBusy(false)
    }
  }

  const deleteWord = deleting?.deleteLabel ?? "Delete"

  return (
    <ItemActionsContext.Provider value={{ rename: (actions) => setRenaming({ actions, name: actions.name }), remove: setDeleting }}>
      {children}

      <Dialog open={renaming !== null} onOpenChange={(open) => { if (!open && !busy) setRenaming(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename {renaming?.actions.noun}</DialogTitle>
            <DialogDescription className="sr-only">Give this {renaming?.actions.noun} a new name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRename} className="space-y-4">
            <Input value={renaming?.name ?? ""} onChange={(event) => setRenaming((current) => current && { ...current, name: event.target.value })} aria-label="Name" autoFocus />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenaming(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy || !renaming?.name.trim()}>{busy ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open && !busy) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleting?.deleteLabel ? `${deleteWord}?` : `Delete this ${deleting?.noun}?`}</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.deleteMessage ?? `${deleting?.name || `This ${deleting?.noun}`} will be removed for good.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={busy} onClick={(event) => { event.preventDefault(); void confirmDelete() }}>
              {busy ? "Working…" : deleteWord}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ItemActionsContext.Provider>
  )
}

/** The menu items for one card or row, in the standard order. Drawn inside the card's own dropdown. */
export function ItemActionsMenu({ actions }: { actions: ItemActions }) {
  const dialogs = useContext(ItemActionsContext)
  // Rename and Delete need the shell's dialogs; without them they would do nothing, so they're left out.
  const canRename = Boolean(actions.onRename && dialogs)
  const canDelete = Boolean(actions.onDelete && dialogs)
  return (
    <>
      {canRename && <DropdownMenuItem onSelect={() => dialogs?.rename(actions)}>Rename</DropdownMenuItem>}
      {actions.onDuplicate && <DropdownMenuItem onSelect={() => void actions.onDuplicate?.()}>Duplicate</DropdownMenuItem>}
      {actions.onArchive && <DropdownMenuItem onSelect={() => void actions.onArchive?.()}>Archive</DropdownMenuItem>}
      {actions.onRestore && <DropdownMenuItem onSelect={() => void actions.onRestore?.()}>Restore</DropdownMenuItem>}
      {actions.extra}
      {canDelete && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => dialogs?.remove(actions)}>{actions.deleteLabel ?? "Delete"}</DropdownMenuItem>
        </>
      )}
    </>
  )
}
