"use client"

import { Inbox, RotateCcw, Trash2 } from "lucide-react"
import { useState } from "react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { EmailContentFrame } from "./email-content-frame"
import { EmailReaderMessageHeader, EmailReaderToolbar } from "./email-reader-header"
import { EmailFolderEmpty, EmailFolderList } from "./email-folder-list"
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
      <section className={cn("flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 lg:gap-6", selected ? "lg:overflow-hidden" : "lg:overflow-y-auto")} role="tabpanel" aria-label="Bin">
        {/* One panel: the list, or the email opened from it with Back to return. */}
        <aside className={cn("min-h-0 shrink-0 overflow-hidden", selected && "hidden")}>
          {error && <p role="alert" className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
          <EmailFolderList
            label={`${items.length} ${items.length === 1 ? "email" : "emails"} in Bin`}
            actions={items.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(items)} disabled={busy}><Trash2 className="size-4" aria-hidden="true" />Empty bin</Button>}
            empty={items.length === 0
              ? <EmailFolderEmpty icon={<Inbox className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />} title="Bin is empty" />
              : visibleItems.length === 0 ? <EmailFolderEmpty title="No emails match your search." /> : undefined}
          >
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
              />
            ))}
          </EmailFolderList>
        </aside>
        {selected && (
          <div className="flex min-h-[calc(100svh-8rem)] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card max-sm:min-h-0 max-sm:overflow-visible lg:min-h-0">
            <EmailReaderToolbar
              onBack={() => setSelectedKey(null)}
              backLabel="Back to bin"
              actions={(
                <>
                  <Button type="button" variant="ghost" size="icon" className="size-10 sm:size-9" onClick={() => void restore(selected)} disabled={busy} aria-label="Restore" title="Restore"><RotateCcw className="size-[18px]" aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-10 sm:size-9" onClick={() => setDeleteTarget([selected])} disabled={busy} aria-label="Delete permanently" title="Delete permanently"><Trash2 className="size-[18px]" aria-hidden="true" /></Button>
                </>
              )}
            />
            <div className="min-h-0 flex-1 overflow-y-auto bg-white max-sm:flex-none max-sm:overflow-visible">
              <EmailReaderMessageHeader
                subject={selected.subject}
                details={[`${selected.kind === "received" ? "From" : "To"} ${selected.title}`]}
                date={selected.deletedAt}
                formatDate={formatMessageDate}
                status={<span className="text-[11px] text-neutral-600">Deleted from {selected.kind === "sent" ? "Sent" : selected.kind === "draft" ? "Drafts" : "Inbox"}</span>}
              >
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              </EmailReaderMessageHeader>
              {loadingKey === selected.key ? <div className="space-y-4 p-6" role="status" aria-label="Loading email"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-32 w-full" /><Skeleton className="h-4 w-4/5" /></div> : selected.previewHtml ? <EmailContentFrame key={selected.key} title={`Deleted email: ${selected.subject}`} srcDoc={selected.previewHtml} autoHeight /> : selected.previewText ? <div className="whitespace-pre-wrap p-6 text-sm text-neutral-900">{selected.previewText}</div> : <div className="flex min-h-96 items-center justify-center px-6 text-center text-sm text-neutral-600">Message preview unavailable.</div>}
            </div>
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
