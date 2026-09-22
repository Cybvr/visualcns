"use client"

import { ArrowLeft, Check, ChevronDown, ChevronsUpDown, Clock, Eye, FileText, MoreVertical, Trash2, X } from "lucide-react"
import type { FormEvent } from "react"
import { IoSend } from "react-icons/io5"

import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { ReactIcon } from "@/components/react-icon"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { EmailDraftRecord } from "@/lib/email-drafts"
import type { ContactList, EmailContact, EmailMessageKind, EmailTemplate } from "./types"

type Notice = { tone: "success" | "error"; text: string } | null

export type EmailComposerProps = {
  composeOpen: boolean
  /** Drafts open as a full page; new-mail compose stays a docked popup. */
  fullPage: boolean
  composeMinimized: boolean
  setComposeMinimized: (value: boolean | ((current: boolean) => boolean)) => void
  closeCompose: () => void
  subject: string
  setSubject: (value: string) => void
  senderAddress: string
  showOpsDetail: boolean
  cleanSenderDisplay: (value: string) => string
  messageKind: EmailMessageKind
  setMessageKind: (value: EmailMessageKind) => void
  contactPickerOpen: boolean
  setContactPickerOpen: (value: boolean) => void
  setContactQuery: (value: string) => void
  contactQuery: string
  selectedContact: EmailContact | null
  selectedList: ContactList | null
  handleRecipientChange: (value: string) => void
  visibleContactOptions: EmailContact[]
  contactInitials: (name: string, email: string) => string
  contactAvatarTone: (value: string) => string
  to: string
  recipientEmail: (value: string) => string
  selectedListId: string
  setSelectedListId: (value: string) => void
  setTo: (value: string) => void
  lists: ContactList[]
  body: string
  setBody: (value: string) => void
  senderConfigured: boolean
  sending: boolean
  scheduleEnabled: boolean
  setScheduleEnabled: (value: boolean) => void
  scheduleAt: string
  scheduleMin: string
  setScheduleAt: (value: string) => void
  sendEmail: (event: FormEvent<HTMLFormElement>) => void
  draftStatus: "idle" | "saving" | "saved" | "error"
  savingDraft: boolean
  setComposerPreviewOpen: (value: boolean) => void
  templates: EmailTemplate[]
  selectedTemplate: EmailTemplate | null
  applyTemplate: (id: string) => void
  editingDraftId: string | null
  removeDraft: (id: string) => void
  clearComposer: () => void
  htmlToText: (value: string) => string
  composerPreviewOpen: boolean
  composerPreviewHtml: () => string
  sendNotice: Notice
}

export function EmailComposer({
  composeOpen,
  fullPage,
  composeMinimized,
  setComposeMinimized,
  closeCompose,
  subject,
  setSubject,
  senderAddress,
  showOpsDetail,
  cleanSenderDisplay,
  messageKind,
  setMessageKind,
  contactPickerOpen,
  setContactPickerOpen,
  setContactQuery,
  contactQuery,
  selectedContact,
  selectedList,
  handleRecipientChange,
  visibleContactOptions,
  contactInitials,
  contactAvatarTone,
  to,
  recipientEmail,
  selectedListId,
  setSelectedListId,
  setTo,
  lists,
  body,
  setBody,
  senderConfigured,
  sending,
  scheduleEnabled,
  setScheduleEnabled,
  scheduleAt,
  scheduleMin,
  setScheduleAt,
  sendEmail,
  draftStatus,
  savingDraft,
  setComposerPreviewOpen,
  templates,
  selectedTemplate,
  applyTemplate,
  editingDraftId,
  removeDraft,
  clearComposer,
  htmlToText,
  composerPreviewOpen,
  composerPreviewHtml,
  sendNotice,
}: EmailComposerProps) {
  if (!composeOpen) return null

  return (
    <>
      <div className={fullPage ? "fixed inset-0 z-40 flex" : "fixed inset-x-0 bottom-0 z-40 flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end"}>
        <div className={fullPage
          ? "flex h-full w-full flex-col overflow-hidden bg-background"
          : cn("flex w-full flex-col overflow-hidden border border-border bg-card shadow-2xl sm:w-[512px] sm:max-w-[calc(100vw-3rem)] sm:rounded-t-xl", composeMinimized ? "h-auto" : "h-[100svh] sm:h-[560px] sm:max-h-[calc(100svh-2rem)]")}>
          {fullPage ? (
            /* Drafts: a full-page surface with a back arrow — not a popup. */
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-3 py-2.5 text-foreground">
              <button type="button" onClick={closeCompose} aria-label="Back" className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded outline-none transition-colors hover:bg-muted"><ArrowLeft className="size-5" aria-hidden="true" /></button>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="submit" form="email-compose-form" size="icon" variant="ghost" aria-label={scheduleEnabled ? "Schedule email" : "Send email"} title={scheduleEnabled ? "Schedule email" : "Send email"} disabled={!senderConfigured || sending || (!selectedListId && !to.trim()) || (selectedListId && !selectedList?.contactEmails.length) || !subject.trim() || !htmlToText(body).trim() || (scheduleEnabled && !scheduleAt)}>
                  {sending ? <Skeleton className="size-4 rounded-sm" aria-hidden="true" /> : scheduleEnabled ? <Clock className="size-4" aria-hidden="true" /> : <ReactIcon icon={IoSend} className="size-4" aria-hidden="true" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="More email actions" title="More email actions"><MoreVertical className="size-5" aria-hidden="true" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={() => setComposerPreviewOpen(true)}><Eye aria-hidden="true" />Preview</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Templates</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => applyTemplate("")}><FileText aria-hidden="true" />Start without a template</DropdownMenuItem>
                    {[...templates].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((template) => (
                      <DropdownMenuItem key={template.id} onSelect={() => applyTemplate(template.id)}><FileText aria-hidden="true" /><span className="truncate">{template.name}</span></DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => { if (editingDraftId) void removeDraft(editingDraftId); clearComposer(); closeCompose() }}><Trash2 aria-hidden="true" />Delete draft</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            /* New mail: the docked compose popup. */
            <div className="flex shrink-0 items-center justify-between gap-2 bg-neutral-800 px-4 py-2 text-white dark:bg-neutral-900">
              <button type="button" onClick={() => setComposeMinimized(!composeMinimized)} className="min-w-0 flex-1 truncate text-left text-sm font-medium outline-none" title={composeMinimized ? "Expand" : "Minimize"}>{subject.trim() || "New message"}</button>
              <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => setComposeMinimized(!composeMinimized)} aria-label={composeMinimized ? "Expand" : "Minimize"} className="flex size-7 items-center justify-center rounded text-white/80 outline-none transition-colors hover:bg-white/15 hover:text-white"><ChevronDown className={cn("size-4 transition-transform", composeMinimized && "rotate-180")} aria-hidden="true" /></button><button type="button" onClick={closeCompose} aria-label="Close" className="flex size-7 items-center justify-center rounded text-white/80 outline-none transition-colors hover:bg-white/15 hover:text-white"><X className="size-4" aria-hidden="true" /></button></div>
            </div>
          )}

          {(fullPage || !composeMinimized) && (
            <form id="email-compose-form" autoComplete="off" onSubmit={sendEmail} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_9rem] items-center border-b border-border"><div className="flex min-w-0 items-center gap-2 px-4 py-2"><span className="shrink-0 text-xs font-medium text-muted-foreground">From</span><p className="min-w-0 truncate text-sm">{cleanSenderDisplay(senderAddress || (showOpsDetail ? "Not configured" : "Not available yet"))}</p></div><div className="px-3 py-1"><Select value={messageKind} onValueChange={(value) => setMessageKind(value as EmailMessageKind)}><SelectTrigger aria-label="Message type" className="h-7 w-full border-0 bg-transparent px-1 text-xs shadow-none hover:bg-transparent data-[state=open]:bg-transparent"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="transactional">Service message</SelectItem><SelectItem value="marketing">Marketing email</SelectItem></SelectContent></Select></div></div>

              <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-border px-4 py-2.5">
                <Popover open={contactPickerOpen} onOpenChange={(open) => { setContactPickerOpen(open); if (!open) setContactQuery("") }}><PopoverTrigger asChild><button id="email-to" type="button" role="combobox" aria-expanded={contactPickerOpen} aria-label="Select contact" disabled={Boolean(selectedListId)} className="flex h-8 w-full min-w-0 items-center gap-2 border-b border-input bg-transparent px-0 text-left text-sm outline-none transition-[border-color] hover:border-muted-foreground focus-visible:border-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"><span className="min-w-0 flex-1 truncate">{selectedContact?.name || (selectedList ? `Sending to ${selectedList.contactEmails.length} contacts` : "To")}</span><ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></button></PopoverTrigger><PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"><Command><CommandInput autoFocus placeholder="Search contacts" value={contactQuery} onValueChange={setContactQuery} /><CommandList><CommandEmpty className="px-3 py-6 text-center text-sm text-muted-foreground">No matching contacts.</CommandEmpty><CommandGroup>{visibleContactOptions.map((contact) => { const isSelected = recipientEmail(contact.email) === recipientEmail(to); return <CommandItem key={contact.email} value={`${contact.name} ${contact.email}`} onSelect={() => { handleRecipientChange(contact.email); setContactPickerOpen(false); setContactQuery("") }} className="items-center gap-3 px-3 py-2.5"><Avatar className={cn("size-10", contactAvatarTone(contact.name || contact.email))}><AvatarFallback className="bg-transparent text-sm font-medium">{contactInitials(contact.name, contact.email)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{contact.name || "Unnamed contact"}</span><span className="block truncate text-xs text-muted-foreground">{contact.email}</span></span><Check className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} aria-hidden="true" /></CommandItem> })}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                <Select value={selectedListId || "none"} onValueChange={(value) => { setSelectedListId(value === "none" ? "" : value); if (value !== "none") setTo("") }}><SelectTrigger aria-label="Contact list" className="h-8"><SelectValue placeholder="Select list" /></SelectTrigger><SelectContent><SelectItem value="none">No list</SelectItem>{[...lists].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((list) => <SelectItem key={list.id} value={list.id}>{list.name} ({list.contactEmails.length})</SelectItem>)}</SelectContent></Select>
              </div>

              <div className="shrink-0 border-b border-border px-4 py-1.5"><Input id="email-subject" name="message-subject" aria-label="Subject" autoComplete="off" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} placeholder="Subject" className="h-8 border-0 px-0 shadow-none focus-visible:ring-0" required /></div>
              {messageKind === "marketing" && <p className="shrink-0 border-b border-border px-4 py-1.5 text-xs leading-5 text-muted-foreground">Only subscribed contacts will receive this. An unsubscribe link is added automatically.</p>}
              <div className="min-h-0 flex-1 overflow-hidden px-2 py-2"><RichTextEditor value={body} onChange={setBody} placeholder="Write your message" scrollable compact flat allowHtml className="h-full min-h-0" /></div>

              {!fullPage && (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
                  <div className="flex items-center gap-1">
                    <div className="inline-flex items-stretch">
                      <Button type="submit" className="rounded-r-none" disabled={!senderConfigured || sending || (!selectedListId && !to.trim()) || (selectedListId && !selectedList?.contactEmails.length) || !subject.trim() || !htmlToText(body).trim() || (scheduleEnabled && !scheduleAt)}>{sending ? <Skeleton className="mr-1 size-4 rounded-sm bg-primary-foreground/30" aria-hidden="true" /> : scheduleEnabled ? <Clock aria-hidden="true" /> : <ReactIcon icon={IoSend} aria-hidden="true" />}{sending ? (scheduleEnabled ? "Scheduling" : "Sending") : scheduleEnabled ? "Schedule" : "Send"}</Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button type="button" aria-label="Choose send action" title="Choose send action" className="rounded-l-none border-l border-primary-foreground/25 px-2" disabled={sending}><ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start">{scheduleEnabled ? <DropdownMenuItem onSelect={() => { setScheduleEnabled(false); setScheduleAt("") }}><ReactIcon icon={IoSend} aria-hidden="true" />Send now</DropdownMenuItem> : <DropdownMenuItem onSelect={() => setScheduleEnabled(true)}><Clock aria-hidden="true" />Schedule</DropdownMenuItem>}</DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {scheduleEnabled && <Input type="datetime-local" aria-label="Schedule date and time" value={scheduleAt} min={scheduleMin || undefined} onChange={(event) => setScheduleAt(event.target.value)} className="h-9 w-auto" />}
                  </div>
                  <div className="flex items-center gap-2">
                    {draftStatus !== "idle" && <span className="hidden text-xs text-muted-foreground sm:inline">{draftStatus === "saving" || savingDraft ? "Saving…" : draftStatus === "saved" ? "Saved" : "Not saved"}</span>}
                    <Button type="button" variant="outline" size="sm" onClick={() => setComposerPreviewOpen(true)}><Eye aria-hidden="true" />Preview</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="sm" className="max-w-40 justify-start px-2"><FileText aria-hidden="true" /><span className="truncate">{selectedTemplate?.name || "Template"}</span></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72"><DropdownMenuItem onSelect={() => applyTemplate("")}>Start without a template</DropdownMenuItem>{[...templates].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((template) => <DropdownMenuItem key={template.id} onSelect={() => applyTemplate(template.id)}><span className="truncate">{template.name}</span></DropdownMenuItem>)}</DropdownMenuContent>
                    </DropdownMenu>
                    <button type="button" onClick={() => { if (editingDraftId) void removeDraft(editingDraftId); clearComposer(); closeCompose() }} aria-label="Discard draft" title="Discard" className="flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" aria-hidden="true" /></button>
                  </div>
                </div>
              )}
              {sendNotice && sendNotice.tone === "error" && <div className="shrink-0 border-t border-border px-4 py-2 text-sm text-destructive" aria-live="polite">{sendNotice.text}</div>}
            </form>
          )}
        </div>
      </div>

      {composerPreviewOpen && <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Email preview" onClick={() => setComposerPreviewOpen(false)}><div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white sm:px-6" onClick={(event) => event.stopPropagation()}><div className="min-w-0"><p className="text-sm font-semibold">Email preview</p><p className="truncate text-xs text-white/70">{subject || "(No subject)"}</p></div><button type="button" onClick={() => setComposerPreviewOpen(false)} aria-label="Close email preview" className="flex size-9 items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"><X className="size-5" aria-hidden="true" /></button></div><div className="min-h-0 flex-1 overflow-hidden px-2 pb-6 sm:px-6" onClick={(event) => event.stopPropagation()}><iframe title="Email preview" srcDoc={composerPreviewHtml()} sandbox="allow-same-origin" className="h-full w-full border-0 bg-[#f3f4f7]" /></div></div>}
    </>
  )
}
