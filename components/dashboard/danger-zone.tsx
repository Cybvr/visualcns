"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

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

/**
 * A destructive action isolated at the bottom of an edit form, away from the
 * save/cancel buttons at the top. Shared by the invoice, estimate, and
 * contract builders - only rendered once a record already exists.
 */
export function DangerZone({
  label,
  confirmTitle,
  confirmDescription,
  onDelete,
  compact = false,
  iconOnly = false,
}: {
  /** e.g. "invoice", used in "Delete invoice" */
  label: string
  confirmTitle: string
  confirmDescription: string
  onDelete: () => Promise<void>
  compact?: boolean
  iconOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={compact ? "flex justify-start" : "flex flex-col items-start justify-between gap-4 rounded-[14px] border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:p-6"}>
      {!compact && <div>
        <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">Delete this {label}. This cannot be undone.</p>
      </div>}
      <Button
        type="button"
        variant="outline"
        aria-label={`Delete ${label}`}
        title={`Delete ${label}`}
        className={iconOnly ? "size-8 shrink-0 border-destructive/40 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive" : "shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"}
        onClick={() => setOpen(true)}
      >
        {iconOnly ? <Trash2 className="size-4" aria-hidden="true" /> : compact ? "Delete" : `Delete ${label}`}
      </Button>

      <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
