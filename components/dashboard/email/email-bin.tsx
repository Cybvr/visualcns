"use client"

import { ArrowLeft, Inbox, RotateCcw, Trash2 } from "lucide-react"
import { useState } from "react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { EmailListRow } from "./email-list-row"

export type EmailBinItem = {
  key: string
  id: string
  kind: "received" | "draft" | "sent"
  title: string
  subject: string
  deletedAt: string
  previewHtml?: string | null
  previewText?: string | null
}

export function EmailBin({
  items,
  visibleItems,
  onRestore,
  onPermanentDelete,
  onOpen,
  loadingKey,
  contactInitials,
  contactAvatarTone,
  formatListDate,
  formatMessageDate,
}: {
  items: EmailBinItem[]
  visibleItems: EmailBinItem[]
  onRestore: (item: EmailBinItem) => Promise<void>
  onPermanentDelete: (items: EmailBinItem[]) => Promise<void>
  onOpen: (item: EmailBinItem) => void
  loadingKey: string | null
  contactInitials: (name: string, email: string) => string
  contactAvatarTone: (value: string) => string
  formatListDate: (value: string) => string
  formatMessageDate: (value: string) => string
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmailBinItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const selected = items.find((item) => item.key === selectedKey) || null

  async function restore(item: EmailBinItem) {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      await onRestore(item)
      if (selectedKey === item.key) setSelectedKey(null)
    } catch {
      setError("This email could not be restored. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget?.length || busy) return
    setBusy(true)
    setError("")
    try {
      await onPermanentDelete(deleteTarget)
      if (deleteTarget.some((item) => item.key === selectedKey)) setSelectedKey(null)
      setDeleteTarget(null)
    } catch {
      setError("The email could not be permanently deleted. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className={cn("flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 lg:gap-6", selected ? "lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden" : "lg:overflow-y-auto")} role="tabpanel" aria-label="Bin">
        <aside className={cn("min-h-0 shrink-0 overflow-hidden", selected ? "max-lg:hidden" : "block")}>
          {error && <p role="alert" className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-1.5">
            <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "email" : "emails"} in Bin</span>
            {items.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(items)} disabled={busy}><Trash2 className="size-4" aria-hidden="true" />Empty bin</Button>}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center"><Inbox className="mx-auto size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">Bin is empty</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Deleted emails will appear here.</p></div>
          ) : visibleItems.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No emails match your search.</div>
          ) : (
            <div>
              {visibleItems.map((item) => (
                <EmailListRow
                  key={item.key}
                  title={item.title}
                  subject={item.subject}
                  date={item.deletedAt}
                  formattedDate={formatListDate(item.deletedAt)}
                  avatarInitials={contactInitials(item.title, item.title)}
                  avatarTone={contactAvatarTone(item.title)}
                  selected={selectedKey === item.key}
                  onOpen={() => { setSelectedKey(item.key); onOpen(item) }}
                  onDelete={() => setDeleteTarget([item])}
                  deleteLabel={`Permanently delete ${item.subject}`}
                  deleteText="Delete permanently"
                  ariaLabel={`Open deleted ${item.kind} email: ${item.subject}`}
                  compact={Boolean(selected)}
                />
              ))}
            </div>
          )}
        </aside>
        {selected && (
          <div className="flex min-h-[calc(100svh-8rem)] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card lg:min-h-0">
            <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5">
              <Button type="button" variant="ghost" size="icon" className="-ml-2 mb-2 size-8" onClick={() => setSelectedKey(null)} aria-label="Back to bin"><ArrowLeft aria-hidden="true" /></Button>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-base font-semibold">{selected.subject}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.kind === "received" ? "From" : "To"} {selected.title}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{selected.kind === "sent" ? "Sent" : selected.kind === "draft" ? "Draft" : "Inbox"}</p></div><time dateTime={selected.deletedAt} className="shrink-0 text-right text-xs text-muted-foreground">Deleted {formatMessageDate(selected.deletedAt)}</time></div>
              {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
              <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => void restore(selected)} disabled={busy}><RotateCcw className="size-4" aria-hidden="true" />Restore</Button><Button type="button" variant="destructive" size="sm" onClick={() => setDeleteTarget([selected])} disabled={busy}><Trash2 className="size-4" aria-hidden="true" />Delete permanently</Button></div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden bg-white">{loadingKey === selected.key ? <div className="space-y-4 p-6" role="status" aria-label="Loading email"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-32 w-full" /><Skeleton className="h-4 w-4/5" /></div> : selected.previewHtml ? <iframe title={`Deleted email: ${selected.subject}`} srcDoc={selected.previewHtml} sandbox="" className="h-full min-h-[24rem] w-full border-0" /> : selected.previewText ? <div className="h-full overflow-y-auto whitespace-pre-wrap p-6 text-sm text-neutral-900">{selected.previewText}</div> : <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">Message preview unavailable.</div>}</div>
          </div>
        )}
      </section>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !busy) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{deleteTarget?.length === 1 ? "Delete this email permanently?" : "Empty the bin?"}</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.length === 1 ? "This email will be removed from VisualCNS and cannot be restored." : `${deleteTarget?.length || 0} emails will be removed from VisualCNS and cannot be restored.`}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={busy} onClick={(event) => { event.preventDefault(); void confirmDelete() }}>{busy ? "Deleting…" : "Delete permanently"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
