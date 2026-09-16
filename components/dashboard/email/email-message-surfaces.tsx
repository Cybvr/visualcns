import { ArrowLeft, CheckCircle2, Clock, FileText, Inbox, Mail, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { EmailDraftRecord } from "@/lib/email-drafts"
import { EmailListHeader, EmailListRow } from "./email-list-row"
import type { ReceivedMessage, SentMessage } from "./types"

type MessageView = "list" | "reader"

export type EmailMessageSurfacesProps = {
  tab: "inbox" | "drafts" | "messages"
  receivedMessages: ReceivedMessage[]
  visibleReceivedMessages: ReceivedMessage[]
  receivedLoading: boolean
  receivedError: string
  selectedReceived: ReceivedMessage | null
  selectedReceivedId: string | null
  loadingReceivedId: string | null
  onOpenReceived: (message: ReceivedMessage) => void
  onClearReceived: () => void
  onDeleteReceived: (message: ReceivedMessage) => void
  drafts: EmailDraftRecord[]
  visibleDrafts: EmailDraftRecord[]
  editingDraftId: string | null
  onLoadDraft: (draft: EmailDraftRecord) => void
  onRemoveDraft: (id: string) => void
  messages: SentMessage[]
  visibleMessages: SentMessage[]
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
  selectedReceived,
  selectedReceivedId,
  loadingReceivedId,
  onOpenReceived,
  onClearReceived,
  onDeleteReceived,
  drafts,
  visibleDrafts,
  editingDraftId,
  onLoadDraft,
  onRemoveDraft,
  messages,
  visibleMessages,
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
  if (tab === "inbox") {
    return (
      <section className={cn(
        "flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 lg:gap-6",
        selectedReceived && mobileMessageView === "list" ? "lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden" : "lg:overflow-y-auto",
      )} role="tabpanel">
        <aside className={cn(
          "min-h-0 shrink-0 overflow-hidden rounded-lg border border-border bg-card",
          mobileMessageView === "list" ? "block" : "hidden",
        )}>
          {receivedError && <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-xs leading-5 text-destructive">{receivedError}</div>}
          {receivedLoading && receivedMessages.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto size-5 animate-spin" aria-hidden="true" /><p className="mt-3">Loading inbox…</p></div>
          ) : receivedMessages.length === 0 ? (
            <div className="px-4 py-10 text-center"><Inbox className="mx-auto size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">No received messages</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Messages sent to your Resend receiving address will appear here.</p></div>
          ) : visibleReceivedMessages.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No messages match your search.</div>
          ) : (
            <div>
              <EmailListHeader primaryLabel="From" dateLabel="Received" compact={Boolean(selectedReceived)} />
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
                  deleteLabel={`Delete message from ${message.from}`}
                  ariaLabel={`Open received email: ${message.subject}`}
                  compact={Boolean(selectedReceived)}
                />
              ))}
            </div>
          )}
        </aside>
        {selectedReceived && (
            <div className={cn("min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card", mobileMessageView === "reader" ? "flex" : "hidden")}>
            <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5">
              <div className="mb-2 flex items-center gap-2"><Button type="button" variant="ghost" size="icon" className="-ml-2 size-8" onClick={onClearReceived} aria-label="Back to inbox"><ArrowLeft aria-hidden="true" /></Button></div>
              <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-base font-semibold">{selectedReceived.subject}</h2><p className="mt-1 truncate text-sm text-muted-foreground">From {selectedReceived.from}</p><p className="truncate text-xs text-muted-foreground">To {selectedReceived.to.join(", ") || "hello@mail.visualcns.com"}</p></div>{selectedReceived.createdAt && <time dateTime={selectedReceived.createdAt} className="shrink-0 text-right text-xs text-muted-foreground">{formatMessageDate(selectedReceived.createdAt)}</time>}</div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden bg-white">{loadingReceivedId === selectedReceived.id ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />Loading message…</div> : <iframe title={`Received email: ${selectedReceived.subject}`} srcDoc={receivedMessagePreview(selectedReceived)} sandbox="" className="h-full min-h-[24rem] w-full border-0" />}</div>
          </div>
        )}
      </section>
    )
  }

  if (tab === "drafts") {
    return (
      <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 lg:gap-6 lg:overflow-hidden" role="tabpanel">
        <aside className="min-h-0 rounded-lg border border-border bg-card lg:flex-1 lg:overflow-y-auto">
          {drafts.length === 0 ? <div className="px-4 py-10 text-center"><FileText className="mx-auto size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">No drafts</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Saved drafts will appear here.</p></div> : visibleDrafts.length === 0 ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">No drafts match your search.</div> : (
            <div><EmailListHeader primaryLabel="To" dateLabel="Updated" />{visibleDrafts.map((draft) => {
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
      <aside className={cn("min-h-0 shrink-0 overflow-hidden rounded-lg border border-border bg-card", mobileMessageView === "list" ? "block" : "hidden")}>
        {messages.length === 0 ? <div className="px-4 py-10 text-center"><Inbox className="mx-auto size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">No sent messages</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Your sent emails will appear here.</p></div> : visibleMessages.length === 0 ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">No messages match your search.</div> : (
          <div><EmailListHeader primaryLabel="To" dateLabel="Sent" compact={Boolean(selectedSent)} />{visibleMessages.map((message) => (
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
              deleteLabel={`Delete message to ${message.to}`}
              ariaLabel={`Open sent email: ${message.subject}`}
              compact={Boolean(selectedSent)}
            />
          ))}</div>
        )}
      </aside>
      {selectedSent && <div className={cn("min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card", mobileMessageView === "reader" ? "flex" : "hidden")}>
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5"><div className="mb-2 flex items-center gap-2"><Button type="button" variant="ghost" size="icon" className="-ml-2 size-8" onClick={onClearSent} aria-label="Back to sent"><ArrowLeft aria-hidden="true" /></Button></div><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-base font-semibold">{selectedSent.subject}</h2><p className="mt-1 truncate text-sm text-muted-foreground">To {selectedSent.to}</p>{selectedSent.from && <p className="truncate text-xs text-muted-foreground">From {cleanSenderDisplay(selectedSent.from)}</p>}</div><div className="flex shrink-0 flex-col items-end gap-1 text-right"><time dateTime={selectedSent.createdAt} className="text-xs text-muted-foreground">{formatMessageDate(selectedSent.createdAt)}</time>{selectedSent.status === "scheduled" && !isScheduledPastDue(selectedSent) ? <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300"><Clock className="size-3" aria-hidden="true" />{selectedSent.scheduledAt ? `Scheduled · ${formatMessageDate(selectedSent.scheduledAt)}` : "Scheduled"}</span> : selectedSent.status === "failed" ? <span className="inline-flex items-center gap-1 text-[11px] text-destructive"><X className="size-3" aria-hidden="true" />Failed</span> : <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-3" aria-hidden="true" />Sent</span>}</div></div></div>
        <div className="min-h-0 flex-1 overflow-hidden bg-white">{loadingMessageId === selectedSent.id ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />Loading message…</div> : messageViewError ? <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"><p className="text-sm font-medium text-destructive">Couldn’t load this email</p><p className="text-xs leading-5 text-muted-foreground">{messageViewError}</p><Button type="button" variant="outline" size="sm" onClick={() => onRetrySent(selectedSent)}>Try again</Button></div> : !selectedSent.bodyHtml && !selectedSent.bodyText ? <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground"><Mail className="size-5" aria-hidden="true" /><p className="text-sm font-medium text-foreground">Message body unavailable</p><p className="text-xs leading-5">This email was sent before previews were saved.</p></div> : <iframe title={`Sent email: ${selectedSent.subject}`} srcDoc={sentMessagePreview(selectedSent)} sandbox="" className="h-full min-h-[24rem] w-full border-0" />}</div>
      </div>}
    </section>
  )
}
