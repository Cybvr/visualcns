import { Archive, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileText, Forward, Inbox, Mail, MailOpen, Paperclip, Reply, Trash2, X } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CompactListSkeleton } from "@/components/dashboard/compact-list-row"
import { cn } from "@/lib/utils"
import type { EmailDraftRecord } from "@/lib/email-drafts"
import { EmailContentFrame } from "./email-content-frame"
import { EmailListRow } from "./email-list-row"
import { ReceivedAttachmentGallery } from "./received-attachment-gallery"
import type { ReceivedAttachment, ReceivedMessage, SentMessage } from "./types"

type MessageView = "list" | "reader"

/** One-line body snippet for the mobile list. */
function snippet(value?: string | null) {
  return value ? value.replace(/\s+/g, " ").trim().slice(0, 160) : undefined
}

function senderAddress(value: string) {
  return value.match(/<([^>]+)>/)?.[1] || value
}

// Mobile: rows sit in one rounded card, like a grouped list.
const MOBILE_LIST_CARD = "max-sm:overflow-hidden max-sm:rounded-2xl max-sm:border max-sm:border-border max-sm:bg-card max-sm:[&>[data-mobile-row]~[data-mobile-row]]:border-t max-sm:[&>[data-mobile-row]~[data-mobile-row]]:border-border"

export type EmailMessageSurfacesProps = {
  tab: "inbox" | "updates" | "drafts" | "messages"
  receivedMessages: ReceivedMessage[]
  visibleReceivedMessages: ReceivedMessage[]
  receivedLoading: boolean
  receivedError: string
  onRetryReceived: () => void
  selectedReceived: ReceivedMessage | null
  selectedReceivedId: string | null
  loadingReceivedId: string | null
  onOpenReceived: (message: ReceivedMessage) => void
  onClearReceived: () => void
  onDeleteReceived: (message: ReceivedMessage) => void
  onDownloadReceivedAttachment: (message: ReceivedMessage, file: ReceivedAttachment) => void
  downloadingAttachmentId: string | null
  onReplyReceived: (message: ReceivedMessage) => void
  onForwardReceived: (message: ReceivedMessage) => void
  selectedReceivedIds: string[]
  readReceivedIds: string[]
  onToggleAllReceived: (checked: boolean) => void
  onToggleReceived: (id: string, checked: boolean) => void
  onArchiveReceived: () => void
  onArchiveReceivedMessage: (message: ReceivedMessage) => void
  onMarkReceivedRead: () => void
  onMarkReceivedUnread: () => void
  onToggleReceivedRead: (message: ReceivedMessage) => void
  receivedSortControl?: ReactNode
  drafts: EmailDraftRecord[]
  visibleDrafts: EmailDraftRecord[]
  selectedDraftIds: string[]
  onToggleAllDrafts: (checked: boolean) => void
  onToggleDraft: (id: string, checked: boolean) => void
  onDeleteSelectedDrafts: () => void
  editingDraftId: string | null
  onLoadDraft: (draft: EmailDraftRecord) => void
  onRemoveDraft: (id: string) => void
  messages: SentMessage[]
  visibleMessages: SentMessage[]
  selectedMessageIds: string[]
  onToggleAllMessages: (checked: boolean) => void
  onToggleMessage: (id: string, checked: boolean) => void
  onDeleteSelectedMessages: () => void
  selectedSent: SentMessage | null
  selectedSentId: string | null
  onOpenSent: (message: SentMessage) => void
  onClearSent: () => void
  onDeleteSent: (message: SentMessage) => void
  mobileMessageView: MessageView
  setMobileMessageView: (view: MessageView) => void
  loadingMessageId: string | null
  messageViewError: string
  onRetrySent: (message: SentMessage) => void
  receivedMessagePreview: (message: ReceivedMessage) => string
  sentMessagePreview: (message: SentMessage) => string
  contactInitials: (name: string, email: string) => string
  contactAvatarTone: (value: string) => string
  resolveName: (raw: string, explicitName?: string) => string
  formatMessageDate: (value: string) => string
  formatListDate: (value: string) => string
  cleanSenderDisplay: (value: string) => string
  isScheduledPastDue: (message: SentMessage) => boolean
}

export function EmailMessageSurfaces({
  tab,
  receivedMessages,
  visibleReceivedMessages,
  receivedLoading,
  receivedError,
  onRetryReceived,
  selectedReceived,
  selectedReceivedId,
  loadingReceivedId,
  onOpenReceived,
  onClearReceived,
  onDeleteReceived,
  onReplyReceived,
  onForwardReceived,
  selectedReceivedIds,
  onDownloadReceivedAttachment,
  downloadingAttachmentId,
  readReceivedIds,
  onToggleAllReceived,
  onToggleReceived,
  onArchiveReceived,
  onArchiveReceivedMessage,
  onMarkReceivedRead,
  onMarkReceivedUnread,
  onToggleReceivedRead,
  receivedSortControl,
  drafts,
  visibleDrafts,
  selectedDraftIds,
  onToggleAllDrafts,
  onToggleDraft,
  onDeleteSelectedDrafts,
  editingDraftId,
  onLoadDraft,
  onRemoveDraft,
  messages,
  visibleMessages,
  selectedMessageIds,
  onToggleAllMessages,
  onToggleMessage,
  onDeleteSelectedMessages,
  selectedSent,
  selectedSentId,
  onOpenSent,
  onClearSent,
  onDeleteSent,
  mobileMessageView,
  setMobileMessageView,
  loadingMessageId,
  messageViewError,
  onRetrySent,
  receivedMessagePreview,
  sentMessagePreview,
  contactInitials,
  contactAvatarTone,
  resolveName,
  formatMessageDate,
  formatListDate,
  cleanSenderDisplay,
  isScheduledPastDue,
}: EmailMessageSurfacesProps) {
  if (tab === "inbox" || tab === "updates") {
    const selectedReceivedIndex = selectedReceived ? visibleReceivedMessages.findIndex((message) => message.id === selectedReceived.id) : -1
    const selectedReceivedIsRead = selectedReceived ? readReceivedIds.includes(selectedReceived.id) : false
    return (
      <section className={cn(
        "flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 lg:gap-6",
        selectedReceived ? "lg:overflow-hidden" : "lg:overflow-y-auto",
      )} role="tabpanel">
        {receivedError && (
          <div role="alert" className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-xs leading-5 text-destructive">
            <span>{receivedError}</span>
            <Button type="button" variant="outline" size="sm" onClick={onRetryReceived} disabled={receivedLoading}>Try again</Button>
          </div>
        )}
        <aside className={cn(
          "min-h-0 shrink-0 overflow-hidden",
          mobileMessageView === "list" ? "block" : "hidden",
        )}>
          <div className={cn("flex min-h-12 items-center gap-1 border-b border-border px-2 py-1.5", selectedReceivedIds.length === 0 && "max-sm:hidden")}>
            <input
              type="checkbox"
              checked={visibleReceivedMessages.length > 0 && visibleReceivedMessages.every((message) => selectedReceivedIds.includes(message.id))}
              onChange={(event) => onToggleAllReceived(event.target.checked)}
              aria-label="Select all visible messages"
              className={cn("ml-1 size-4 shrink-0 accent-primary", selectedReceivedIds.length === 0 && "max-sm:hidden")}
            />
            <span className="mr-auto px-2 text-xs text-muted-foreground">
              {selectedReceivedIds.length > 0 ? `${selectedReceivedIds.length} selected` : `${receivedMessages.filter((message) => !readReceivedIds.includes(message.id)).length} unread`}
            </span>
            {receivedSortControl}
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onArchiveReceived} disabled={selectedReceivedIds.length === 0} aria-label="Archive selected messages" title="Archive selected messages"><Archive className="size-4" aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onMarkReceivedRead} disabled={selectedReceivedIds.length === 0} aria-label="Mark selected messages as read" title="Mark as read"><MailOpen className="size-4" aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onMarkReceivedUnread} disabled={selectedReceivedIds.length === 0} aria-label="Mark selected messages as unread" title="Mark as unread"><Mail className="size-4" aria-hidden="true" /></Button>
          </div>
          {receivedLoading && receivedMessages.length === 0 ? (
            <CompactListSkeleton rows={5} />
          ) : receivedMessages.length === 0 ? (
            <div className="px-4 py-10 text-center"><Inbox className="mx-auto size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">{tab === "updates" ? "No updates" : "No received messages"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{tab === "updates" ? "Visitor sign-ups and help requests appear here." : "Email sent to your connected inbox appears here."}</p></div>
          ) : visibleReceivedMessages.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No messages match your search.</div>
          ) : (
            <div className={MOBILE_LIST_CARD}>
              {visibleReceivedMessages.map((message) => (
                <EmailListRow
                  key={message.id}
                  title={resolveName(message.from)}
                  subject={message.subject}
                  date={message.createdAt}
                  formattedDate={message.createdAt ? formatListDate(message.createdAt) : undefined}
                  avatarInitials={contactInitials(resolveName(message.from), message.from)}
                  avatarTone={contactAvatarTone(message.from)}
                  selected={selectedReceivedId === message.id}
                  onOpen={() => onOpenReceived(message)}
                  onDelete={() => onDeleteReceived(message)}
                  selectable
                  selectionMode={selectedReceivedIds.length > 0}
                  checked={selectedReceivedIds.includes(message.id)}
                  onCheckedChange={(checked) => onToggleReceived(message.id, checked)}
                  unread={!readReceivedIds.includes(message.id)}
                  read={readReceivedIds.includes(message.id)}
                  preview={snippet(message.text)}
                  deleteLabel={`Delete message from ${message.from}`}
                  ariaLabel={`Open received email: ${message.subject}`}
                  compact={Boolean(selectedReceived)}
                />
              ))}
            </div>
          )}
        </aside>
        {selectedReceived && (
          <div className={cn("flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card max-lg:min-h-[calc(100svh-8rem)] max-sm:overflow-visible max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:pb-28 lg:min-h-0", mobileMessageView === "reader" ? "flex" : "hidden")}>
            <div className="hidden shrink-0 lg:block">
              <div className="flex min-h-14 items-center gap-1 border-b border-border px-4">
                <Button type="button" variant="ghost" size="icon" className="size-9" onClick={onClearReceived} aria-label="Back to inbox" title="Back to inbox"><ArrowLeft className="size-5" aria-hidden="true" /></Button>
                <span className="mx-2 h-6 w-px bg-border" aria-hidden="true" />
                <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => onArchiveReceivedMessage(selectedReceived)} aria-label="Archive message" title="Archive"><Archive className="size-5" aria-hidden="true" /></Button>
                <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => onDeleteReceived(selectedReceived)} aria-label="Delete message" title="Delete"><Trash2 className="size-5" aria-hidden="true" /></Button>
                <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => onToggleReceivedRead(selectedReceived)} aria-label={selectedReceivedIsRead ? "Mark as unread" : "Mark as read"} title={selectedReceivedIsRead ? "Mark as unread" : "Mark as read"}>{selectedReceivedIsRead ? <Mail className="size-5" aria-hidden="true" /> : <MailOpen className="size-5" aria-hidden="true" />}</Button>
                <div className="ml-auto flex items-center gap-1">
                  {selectedReceivedIndex >= 0 && <span className="mr-3 text-sm tabular-nums text-muted-foreground">{selectedReceivedIndex + 1} of {visibleReceivedMessages.length}</span>}
                  <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => onOpenReceived(visibleReceivedMessages[selectedReceivedIndex - 1])} disabled={selectedReceivedIndex <= 0} aria-label="Previous message" title="Previous message"><ChevronLeft className="size-5" aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => onOpenReceived(visibleReceivedMessages[selectedReceivedIndex + 1])} disabled={selectedReceivedIndex < 0 || selectedReceivedIndex >= visibleReceivedMessages.length - 1} aria-label="Next message" title="Next message"><ChevronRight className="size-5" aria-hidden="true" /></Button>
                </div>
              </div>
              <div className="px-8 pb-6 pt-7">
                <div className="flex items-center gap-3">
                  <h2 className="min-w-0 text-2xl font-normal leading-tight tracking-tight">{selectedReceived.subject || "(No subject)"}</h2>
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tab === "updates" ? "Updates" : "Inbox"}</span>
                </div>
                <div className="mt-7 flex items-start gap-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold", contactAvatarTone(selectedReceived.from))} aria-hidden="true">{contactInitials(resolveName(selectedReceived.from), selectedReceived.from).slice(0, 1)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm"><span className="font-semibold">{resolveName(selectedReceived.from)}</span> <span className="text-muted-foreground">&lt;{senderAddress(selectedReceived.from)}&gt;</span></p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">to {selectedReceived.to.join(", ") || "hello@mail.visualcns.com"}</p>
                  </div>
                  {selectedReceived.createdAt && <time dateTime={selectedReceived.createdAt} className="shrink-0 pt-0.5 text-xs text-muted-foreground">{formatMessageDate(selectedReceived.createdAt)}</time>}
                  <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => onReplyReceived(selectedReceived)} aria-label="Reply" title="Reply"><Reply className="size-5" aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => onForwardReceived(selectedReceived)} aria-label="Forward" title="Forward"><Forward className="size-5" aria-hidden="true" /></Button>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-b border-border px-4 py-4 max-sm:border-0 max-sm:px-1 max-sm:pt-1 sm:px-5 lg:hidden">
              <div className="mb-2 flex items-center gap-1 max-sm:mb-5">
                <Button type="button" variant="ghost" size="icon" className="-ml-2 size-10" onClick={onClearReceived} aria-label="Back to inbox"><ArrowLeft className="size-5" aria-hidden="true" /></Button>
                <span className="flex-1" />
                <Button type="button" variant="ghost" size="icon" className="size-10" onClick={() => onArchiveReceivedMessage(selectedReceived)} aria-label="Archive" title="Archive"><Archive className="size-5" aria-hidden="true" /></Button>
                <Button type="button" variant="ghost" size="icon" className="size-10" onClick={() => onDeleteReceived(selectedReceived)} aria-label="Delete" title="Delete"><Trash2 className="size-5" aria-hidden="true" /></Button>
              </div>
              <h2 className="text-[1.375rem] leading-snug tracking-tight sm:truncate sm:text-base sm:font-semibold sm:tracking-normal">{selectedReceived.subject || "(No subject)"}</h2>
              <div className="mt-4 flex items-center gap-3 sm:mt-2">
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-base font-semibold sm:hidden", contactAvatarTone(selectedReceived.from))} aria-hidden="true">
                  {contactInitials(resolveName(selectedReceived.from), selectedReceived.from).slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold sm:hidden">{resolveName(selectedReceived.from)}</p>
                  <p className="truncate text-sm text-muted-foreground max-sm:hidden">From {selectedReceived.from}</p>
                  {selectedReceived.createdAt && <time dateTime={selectedReceived.createdAt} className="block truncate text-sm text-muted-foreground sm:hidden">{formatMessageDate(selectedReceived.createdAt)}</time>}
                  <p className="truncate text-xs text-muted-foreground max-sm:hidden">To {selectedReceived.to.join(", ") || "hello@mail.visualcns.com"}</p>
                </div>
                {selectedReceived.createdAt && <time dateTime={selectedReceived.createdAt} className="shrink-0 self-start text-right text-xs text-muted-foreground max-sm:hidden">{formatMessageDate(selectedReceived.createdAt)}</time>}
              </div>
              <details className="mt-3 text-sm text-muted-foreground sm:hidden">
                <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">Details</summary>
                <p className="mt-2 break-all">From {selectedReceived.from}</p>
                <p className="break-all">To {selectedReceived.to.join(", ") || "hello@mail.visualcns.com"}</p>
              </details>
              <div className="mt-4 flex flex-wrap items-center gap-2 max-sm:hidden">
                <Button type="button" variant="outline" size="sm" onClick={() => onReplyReceived(selectedReceived)}><Reply className="size-4" aria-hidden="true" /> Reply</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onForwardReceived(selectedReceived)}><Forward className="size-4" aria-hidden="true" /> Forward</Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white max-sm:flex-none max-sm:overflow-visible max-sm:rounded-3xl max-sm:border max-sm:border-border">
              {loadingReceivedId === selectedReceived.id ? <div className="space-y-4 p-6" role="status" aria-label="Loading message"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-32 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/5" /></div> : (
                <>
                  <EmailContentFrame
                    key={selectedReceived.id}
                    title={`Received email: ${selectedReceived.subject}`}
                    srcDoc={receivedMessagePreview(selectedReceived)}
                    className={selectedReceived.attachments?.length ? "h-[42vh] min-h-80" : undefined}
                  />
                  <ReceivedAttachmentGallery key={selectedReceived.id} message={selectedReceived} onDownload={onDownloadReceivedAttachment} downloadingAttachmentId={downloadingAttachmentId} />
                </>
              )}
            </div>
            {/* Mobile: reply and forward stay in reach at the bottom of the screen. */}
            <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-lg sm:hidden">
              <Button type="button" size="lg" className="h-12 flex-1 rounded-full text-base" onClick={() => onReplyReceived(selectedReceived)}><Reply className="size-5" aria-hidden="true" /> Reply</Button>
              <Button type="button" variant="secondary" size="icon" className="size-12 rounded-full" onClick={() => onForwardReceived(selectedReceived)} aria-label="Forward" title="Forward"><Forward className="size-5" aria-hidden="true" /></Button>
            </div>
          </div>
        )}
      </section>
    )
  }

  if (tab === "drafts") {
    return (
      <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 lg:gap-6 lg:overflow-hidden" role="tabpanel">
        <aside className="min-h-0 max-lg:shrink-0 lg:flex-1 lg:overflow-y-auto">
          {drafts.length === 0 ? <div className="px-4 py-10 text-center"><FileText className="mx-auto size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">No drafts</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Saved drafts will appear here.</p></div> : visibleDrafts.length === 0 ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">No drafts match your search.</div> : (
            <div className={MOBILE_LIST_CARD}>
              <div className={cn("flex min-h-12 items-center gap-1 border-b border-border px-2 py-1.5", selectedDraftIds.length === 0 && "max-sm:hidden")}><input type="checkbox" checked={visibleDrafts.length > 0 && visibleDrafts.every((draft) => selectedDraftIds.includes(draft.id))} onChange={(event) => onToggleAllDrafts(event.target.checked)} aria-label="Select all visible drafts" className={cn("ml-1 size-4 shrink-0 accent-primary", selectedDraftIds.length === 0 && "max-sm:hidden")} /><span className="mr-auto px-2 text-xs text-muted-foreground">{selectedDraftIds.length ? `${selectedDraftIds.length} selected` : `${drafts.length} drafts`}</span><Button type="button" variant="ghost" size="icon" className="size-8" onClick={onDeleteSelectedDrafts} disabled={selectedDraftIds.length === 0} aria-label="Delete selected drafts" title="Delete selected drafts"><Trash2 className="size-4" aria-hidden="true" /></Button></div>
              {visibleDrafts.map((draft) => {
              const recipient = draft.to ? resolveName(draft.to) : (draft.listId ? "Contact list" : "No recipient selected")
              return (
                <EmailListRow
                  key={draft.id}
                  title={recipient}
                  subject={draft.subject?.trim() || "(No subject)"}
                  date={draft.updatedAt}
                  formattedDate={formatListDate(draft.updatedAt)}
                  avatarInitials={contactInitials(recipient, draft.to || "Contact list")}
                  avatarTone={contactAvatarTone(draft.to || "Contact list")}
                  selected={editingDraftId === draft.id}
                  onOpen={() => onLoadDraft(draft)}
                  onDelete={() => void onRemoveDraft(draft.id)}
                  selectable
                  selectionMode={selectedDraftIds.length > 0}
                  checked={selectedDraftIds.includes(draft.id)}
                  onCheckedChange={(checked) => onToggleDraft(draft.id, checked)}
                  deleteLabel="Delete draft"
                  ariaLabel={`Open draft email: ${draft.subject?.trim() || "No subject"}`}
                />
              )
            })}</div>
          )}
        </aside>
      </section>
    )
  }

  return (
    <section className={cn("flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 lg:gap-6", selectedSent && mobileMessageView === "list" ? "lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden" : "lg:overflow-y-auto")} role="tabpanel">
      <aside className={cn("min-h-0 shrink-0 overflow-hidden", mobileMessageView === "list" ? "block" : "hidden")}>
        {messages.length === 0 ? <div className="px-4 py-10 text-center"><Inbox className="mx-auto size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">No sent messages</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Your sent emails will appear here.</p></div> : visibleMessages.length === 0 ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">No messages match your search.</div> : (
          <div className={MOBILE_LIST_CARD}>
            <div className={cn("flex min-h-12 items-center gap-1 border-b border-border px-2 py-1.5", selectedMessageIds.length === 0 && "max-sm:hidden")}><input type="checkbox" checked={visibleMessages.length > 0 && visibleMessages.every((message) => selectedMessageIds.includes(message.id))} onChange={(event) => onToggleAllMessages(event.target.checked)} aria-label="Select all visible sent messages" className={cn("ml-1 size-4 shrink-0 accent-primary", selectedMessageIds.length === 0 && "max-sm:hidden")} /><span className="mr-auto px-2 text-xs text-muted-foreground">{selectedMessageIds.length ? `${selectedMessageIds.length} selected` : `${messages.length} sent`}</span><Button type="button" variant="ghost" size="icon" className="size-8" onClick={onDeleteSelectedMessages} disabled={selectedMessageIds.length === 0} aria-label="Delete selected sent messages" title="Delete selected sent messages"><Trash2 className="size-4" aria-hidden="true" /></Button></div>
            {visibleMessages.map((message) => (
            <EmailListRow
              key={message.id}
              title={resolveName(message.to, message.recipients?.[0]?.name)}
              subject={message.subject}
              date={message.createdAt}
              formattedDate={formatListDate(message.createdAt)}
              avatarInitials={contactInitials(resolveName(message.to, message.recipients?.[0]?.name), message.recipients?.[0]?.email || message.to)}
              avatarTone={contactAvatarTone(message.to)}
              selected={selectedSentId === message.id}
              onOpen={() => onOpenSent(message)}
              onDelete={() => onDeleteSent(message)}
              selectable
              selectionMode={selectedMessageIds.length > 0}
              checked={selectedMessageIds.includes(message.id)}
              onCheckedChange={(checked) => onToggleMessage(message.id, checked)}
              deleteLabel={`Delete message to ${message.to}`}
              ariaLabel={`Open sent email: ${message.subject}`}
              preview={snippet(message.bodyText)}
              compact={Boolean(selectedSent)}
            />
          ))}</div>
        )}
      </aside>
      {selectedSent && <div className={cn("flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card max-lg:min-h-[calc(100svh-8rem)] max-sm:min-h-0 max-sm:overflow-visible lg:min-h-0", mobileMessageView === "reader" ? "flex" : "hidden")}>
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5"><div className="mb-2 flex items-center gap-2"><Button type="button" variant="ghost" size="icon" className="-ml-2 size-10" onClick={onClearSent} aria-label="Back to sent"><ArrowLeft className="size-5" aria-hidden="true" /></Button><span className="flex-1" /><Button type="button" variant="ghost" size="icon" className="size-10" onClick={() => onDeleteSent(selectedSent)} aria-label="Delete" title="Delete"><Trash2 className="size-5" aria-hidden="true" /></Button></div><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-[1.375rem] leading-snug tracking-tight sm:truncate sm:text-base sm:font-semibold sm:tracking-normal">{selectedSent.subject}</h2><p className="mt-1 truncate text-sm text-muted-foreground">To {selectedSent.to}</p>{selectedSent.from && <p className="truncate text-xs text-muted-foreground">From {cleanSenderDisplay(selectedSent.from)}</p>}</div><div className="flex shrink-0 flex-col items-end gap-1 text-right"><time dateTime={selectedSent.createdAt} className="text-xs text-muted-foreground">{formatMessageDate(selectedSent.createdAt)}</time>{selectedSent.status === "scheduled" && !isScheduledPastDue(selectedSent) ? <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300"><Clock className="size-3" aria-hidden="true" />{selectedSent.scheduledAt ? `Scheduled · ${formatMessageDate(selectedSent.scheduledAt)}` : "Scheduled"}</span> : selectedSent.status === "failed" ? <span className="inline-flex items-center gap-1 text-[11px] text-destructive"><X className="size-3" aria-hidden="true" />Failed</span> : <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-3" aria-hidden="true" />Sent</span>}</div></div></div>
        {Boolean(selectedSent.attachments?.length) && <div className="flex shrink-0 flex-wrap gap-2 border-b border-border px-4 py-2 sm:px-5">{selectedSent.attachments?.map((file, index) => <span key={`${file.filename}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs" title={file.filename}><Paperclip className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{file.filename}</span></span>)}</div>}
        <div className="min-h-0 flex-1 overflow-hidden bg-white max-sm:flex-none max-sm:overflow-visible">{loadingMessageId === selectedSent.id ? <div className="space-y-4 p-6" role="status" aria-label="Loading message"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-32 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/5" /></div> : messageViewError ? <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"><p className="text-sm font-medium text-destructive">Couldn’t load this email</p><p className="text-xs leading-5 text-muted-foreground">{messageViewError}</p><Button type="button" variant="outline" size="sm" onClick={() => onRetrySent(selectedSent)}>Try again</Button></div> : !selectedSent.bodyHtml && !selectedSent.bodyText ? <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground"><Mail className="size-5" aria-hidden="true" /><p className="text-sm font-medium text-foreground">Message body unavailable</p><p className="text-xs leading-5">This email was sent before previews were saved.</p></div> : <EmailContentFrame key={selectedSent.id} title={`Sent email: ${selectedSent.subject}`} srcDoc={sentMessagePreview(selectedSent)} />}</div>
      </div>}
    </section>
  )
}
