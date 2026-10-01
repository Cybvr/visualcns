"use client"

import { ArrowLeft, Check, ChevronDown, ChevronsUpDown, Clock, Eye, FileText, MoreVertical, Trash2, X } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
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

function matchingContacts(contacts: EmailContact[], query: string): EmailContact[] {
  const search = query.trim().toLowerCase()
  if (!search) return []
  return contacts
    .filter((contact) => `${contact.name} ${contact.email} ${contact.label}`.toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .slice(0, 6)
}

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
  senderOptions: string[]
  setSenderAddress: (value: string) => void
  brandedEmail: boolean
  setBrandedEmail: (value: boolean) => void
  showOpsDetail: boolean
  cleanSenderDisplay: (value: string) => string
  messageKind: EmailMessageKind
  setMessageKind: (value: EmailMessageKind) => void
  contactPickerOpen: boolean
  setContactPickerOpen: (value: boolean) => void
  setContactQuery: (value: string) => void
  contactQuery: string
  selectedList: ContactList | null
  handleRecipientChange: (value: string) => void
  contacts: EmailContact[]
  visibleContactOptions: EmailContact[]
  contactInitials: (name: string, email: string) => string
  contactAvatarTone: (value: string) => string
  to: string
  /** Comma-separated addresses to copy. */
  cc: string
  setCc: (value: string) => void
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
  senderOptions,
  setSenderAddress,
  brandedEmail,
  setBrandedEmail,
  showOpsDetail,
  cleanSenderDisplay,
  messageKind,
  setMessageKind,
  contactPickerOpen,
  setContactPickerOpen,
  setContactQuery,
  contactQuery,
  selectedList,
  handleRecipientChange,
  contacts,
  visibleContactOptions,
  contactInitials,
  contactAvatarTone,
  to,
  cc,
  setCc,
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
  const [recipientSuggestionsOpen, setRecipientSuggestionsOpen] = useState(false)
  const [activeRecipientIndex, setActiveRecipientIndex] = useState(0)
  const [ccSuggestionsOpen, setCcSuggestionsOpen] = useState(false)
  const [activeCcIndex, setActiveCcIndex] = useState(0)
  const recipientMatches = useMemo(() => matchingContacts(contacts, to), [contacts, to])
  const ccQuery = cc.split(/[,;]/).at(-1)?.trim() ?? ""
  const ccMatches = useMemo(() => {
    const entered = new Set(cc.split(/[,;]/).slice(0, -1).map((email) => email.trim().toLowerCase()))
    return matchingContacts(contacts, ccQuery).filter((contact) => !entered.has(contact.email.toLowerCase()))
  }, [cc, ccQuery, contacts])

  function selectRecipient(contact: EmailContact) {
    handleRecipientChange(contact.email)
    setRecipientSuggestionsOpen(false)
  }

  function selectCc(contact: EmailContact) {
    const separator = Math.max(cc.lastIndexOf(","), cc.lastIndexOf(";"))
    const previous = separator < 0 ? "" : `${cc.slice(0, separator + 1).trimEnd()} `
    setCc(`${previous}${contact.email}, `)
    setCcSuggestionsOpen(false)
  }

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
              <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_9rem] items-center border-b border-border"><div className="flex min-w-0 items-center gap-2 px-4 py-2"><span className="shrink-0 text-xs font-medium text-muted-foreground">From</span>{senderOptions.length > 1 ? <Select value={senderAddress} onValueChange={setSenderAddress}><SelectTrigger aria-label="Sender address" className="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 text-left text-sm shadow-none hover:bg-transparent data-[state=open]:bg-transparent"><SelectValue /></SelectTrigger><SelectContent align="start" className="w-72">{senderOptions.map((sender) => <SelectItem key={sender} value={sender}>{cleanSenderDisplay(sender)}</SelectItem>)}</SelectContent></Select> : <p className="min-w-0 truncate text-sm">{cleanSenderDisplay(senderAddress || (showOpsDetail ? "Not configured" : "Not available yet"))}</p>}</div><div className="px-3 py-1"><Select value={messageKind} onValueChange={(value) => setMessageKind(value as EmailMessageKind)}><SelectTrigger aria-label="Message type" className="h-7 w-full border-0 bg-transparent px-1 text-xs shadow-none hover:bg-transparent data-[state=open]:bg-transparent"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="transactional">Service message</SelectItem><SelectItem value="marketing">Marketing email</SelectItem></SelectContent></Select></div></div>

              <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-border px-4 py-2.5">
                <div className="relative flex min-w-0 items-center gap-2 border-b border-input" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setRecipientSuggestionsOpen(false) }}>
                  <Input
                    id="email-to"
                    name="message-to"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    aria-label="Recipient email"
                    aria-autocomplete="list"
                    aria-expanded={recipientSuggestionsOpen && Boolean(to.trim()) && !selectedListId}
                    aria-controls="email-to-suggestions"
                    aria-activedescendant={recipientSuggestionsOpen && recipientMatches.length ? `email-to-option-${activeRecipientIndex}` : undefined}
                    value={selectedListId ? "" : to}
                    onFocus={() => setRecipientSuggestionsOpen(Boolean(to.trim()))}
                    onChange={(event) => { handleRecipientChange(event.target.value); setActiveRecipientIndex(0); setRecipientSuggestionsOpen(Boolean(event.target.value.trim())) }}
                    onKeyDown={(event) => {
                      if (!recipientSuggestionsOpen) return
                      if (event.key === "ArrowDown" && recipientMatches.length) { event.preventDefault(); setActiveRecipientIndex((index) => (index + 1) % recipientMatches.length) }
                      if (event.key === "ArrowUp" && recipientMatches.length) { event.preventDefault(); setActiveRecipientIndex((index) => (index - 1 + recipientMatches.length) % recipientMatches.length) }
                      if (event.key === "Enter") { event.preventDefault(); if (recipientMatches.length) selectRecipient(recipientMatches[activeRecipientIndex] ?? recipientMatches[0]); else setRecipientSuggestionsOpen(false) }
                      if (event.key === "Escape") { event.preventDefault(); setRecipientSuggestionsOpen(false) }
                    }}
                    placeholder={selectedList ? `Sending to ${selectedList.contactEmails.length} contacts` : "To"}
                    disabled={Boolean(selectedListId)}
                    className="h-8 min-w-0 flex-1 border-0 px-0 shadow-none focus-visible:ring-0 disabled:opacity-60"
                  />
                  <Popover open={contactPickerOpen} onOpenChange={(open) => { setContactPickerOpen(open); if (open) setRecipientSuggestionsOpen(false); else setContactQuery("") }}><PopoverTrigger asChild><button type="button" aria-label="Choose contact" disabled={Boolean(selectedListId)} className="flex size-8 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"><ChevronsUpDown className="size-4" aria-hidden="true" /></button></PopoverTrigger><PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"><Command><CommandInput autoFocus placeholder="Search contacts" value={contactQuery} onValueChange={setContactQuery} /><CommandList><CommandEmpty className="px-3 py-6 text-center text-sm text-muted-foreground">No matching contacts.</CommandEmpty><CommandGroup>{visibleContactOptions.map((contact) => { const isSelected = recipientEmail(contact.email) === recipientEmail(to); return <CommandItem key={contact.email} value={`${contact.name} ${contact.email}`} onSelect={() => { selectRecipient(contact); setContactPickerOpen(false); setContactQuery("") }} className="items-center gap-3 px-3 py-2.5"><Avatar className={cn("size-10", contactAvatarTone(contact.name || contact.email))}><AvatarFallback className="bg-transparent text-sm font-medium">{contactInitials(contact.name, contact.email)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{contact.name || "Unnamed contact"}</span><span className="block truncate text-xs text-muted-foreground">{contact.email}</span></span><Check className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} aria-hidden="true" /></CommandItem> })}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                  {recipientSuggestionsOpen && to.trim() && !selectedListId && (
                    <div id="email-to-suggestions" role="listbox" aria-label="Matching contacts" className="absolute left-0 top-full z-50 mt-1 max-h-64 w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                      {recipientMatches.length ? recipientMatches.map((contact, index) => (
                        <button
                          key={contact.email}
                          id={`email-to-option-${index}`}
                          type="button"
                          role="option"
                          aria-selected={index === activeRecipientIndex}
                          tabIndex={-1}
                          onClick={() => selectRecipient(contact)}
                          className={cn("flex w-full items-center gap-3 rounded px-2 py-2 text-left outline-none hover:bg-accent", index === activeRecipientIndex && "bg-accent")}
                        >
                          <Avatar className={cn("size-9 shrink-0", contactAvatarTone(contact.name || contact.email))}><AvatarFallback className="bg-transparent text-xs font-medium">{contactInitials(contact.name, contact.email)}</AvatarFallback></Avatar>
                          <span className="min-w-0"><span className="block truncate text-sm font-medium">{contact.name || "Unnamed contact"}</span><span className="block truncate text-xs text-muted-foreground">{contact.email}</span></span>
                        </button>
                      )) : <p className="px-3 py-2 text-xs text-muted-foreground">No saved contact matches. You can still use this email address.</p>}
                    </div>
                  )}
                </div>
                <Select value={selectedListId || "none"} onValueChange={(value) => { setSelectedListId(value === "none" ? "" : value); if (value !== "none") setTo("") }}><SelectTrigger aria-label="Contact list" className="h-8"><SelectValue placeholder="Select list" /></SelectTrigger><SelectContent><SelectItem value="none">No list</SelectItem>{[...lists].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((list) => <SelectItem key={list.id} value={list.id}>{list.name} ({list.contactEmails.length})</SelectItem>)}</SelectContent></Select>
              </div>

              {messageKind === "transactional" && (
                <div className="relative flex shrink-0 items-center gap-2 border-b border-border px-4 py-1.5" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setCcSuggestionsOpen(false) }}>
                  <label htmlFor="email-cc" className="shrink-0 text-xs font-medium text-muted-foreground">Cc</label>
                  <Input
                    id="email-cc"
                    name="message-cc"
                    type="text"
                    inputMode="email"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={ccSuggestionsOpen && Boolean(ccQuery)}
                    aria-controls="email-cc-suggestions"
                    aria-activedescendant={ccSuggestionsOpen && ccMatches.length ? `email-cc-option-${Math.min(activeCcIndex, ccMatches.length - 1)}` : undefined}
                    value={cc}
                    onFocus={() => setCcSuggestionsOpen(Boolean(ccQuery))}
                    onChange={(event) => { setCc(event.target.value); setActiveCcIndex(0); setCcSuggestionsOpen(Boolean(event.target.value.split(/[,;]/).at(-1)?.trim())) }}
                    onKeyDown={(event) => {
                      if (!ccSuggestionsOpen) return
                      if (event.key === "ArrowDown" && ccMatches.length) { event.preventDefault(); setActiveCcIndex((index) => (index + 1) % ccMatches.length) }
                      if (event.key === "ArrowUp" && ccMatches.length) { event.preventDefault(); setActiveCcIndex((index) => (index - 1 + ccMatches.length) % ccMatches.length) }
                      if (event.key === "Enter") { event.preventDefault(); if (ccMatches.length) selectCc(ccMatches[activeCcIndex] ?? ccMatches[0]); else setCcSuggestionsOpen(false) }
                      if (event.key === "Escape") { event.preventDefault(); setCcSuggestionsOpen(false) }
                    }}
                    placeholder="Add emails, separated by commas"
                    className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
                  />
                  {ccSuggestionsOpen && ccQuery && (
                    <div id="email-cc-suggestions" role="listbox" aria-label="Matching Cc contacts" className="absolute left-4 right-4 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                      {ccMatches.length ? ccMatches.map((contact, index) => (
                        <button
                          key={contact.email}
                          id={`email-cc-option-${index}`}
                          type="button"
                          role="option"
                          aria-selected={index === activeCcIndex}
                          tabIndex={-1}
                          onClick={() => selectCc(contact)}
                          className={cn("flex w-full items-center gap-3 rounded px-2 py-2 text-left outline-none hover:bg-accent", index === activeCcIndex && "bg-accent")}
                        >
                          <Avatar className={cn("size-9 shrink-0", contactAvatarTone(contact.name || contact.email))}><AvatarFallback className="bg-transparent text-xs font-medium">{contactInitials(contact.name, contact.email)}</AvatarFallback></Avatar>
                          <span className="min-w-0"><span className="block truncate text-sm font-medium">{contact.name || "Unnamed contact"}</span><span className="block truncate text-xs text-muted-foreground">{contact.email}</span></span>
                        </button>
                      )) : <p className="px-3 py-2 text-xs text-muted-foreground">No saved contact matches. You can still use this email address.</p>}
                    </div>
                  )}
                </div>
              )}
              <div className="shrink-0 border-b border-border px-4 py-1.5"><Input id="email-subject" name="message-subject" aria-label="Subject" autoComplete="off" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} placeholder="Subject" className="h-8 border-0 px-0 shadow-none focus-visible:ring-0" required /></div>
              {messageKind === "marketing" && <p className="shrink-0 border-b border-border px-4 py-1.5 text-xs leading-5 text-muted-foreground">Only subscribed contacts will receive this. An unsubscribe link is added automatically.</p>}
              <div className="min-h-0 flex-1 overflow-hidden px-2 py-2"><RichTextEditor value={body} onChange={setBody} placeholder="Write your message" scrollable compact flat allowHtml className="h-full min-h-0" /></div>

              {!fullPage && (
                <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-t border-border px-2 py-2 [scrollbar-width:none]">
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="inline-flex items-stretch">
                      <Button type="submit" className="rounded-r-none" disabled={!senderConfigured || sending || (!selectedListId && !to.trim()) || (selectedListId && !selectedList?.contactEmails.length) || !subject.trim() || !htmlToText(body).trim() || (scheduleEnabled && !scheduleAt)}>{sending ? <Skeleton className="mr-1 size-4 rounded-sm bg-primary-foreground/30" aria-hidden="true" /> : scheduleEnabled ? <Clock aria-hidden="true" /> : <ReactIcon icon={IoSend} aria-hidden="true" />}{sending ? (scheduleEnabled ? "Scheduling" : "Sending") : scheduleEnabled ? "Schedule" : "Send"}</Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button type="button" aria-label="Choose send action" title="Choose send action" className="rounded-l-none border-l border-primary-foreground/25 px-2" disabled={sending}><ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start">{scheduleEnabled ? <DropdownMenuItem onSelect={() => { setScheduleEnabled(false); setScheduleAt("") }}><ReactIcon icon={IoSend} aria-hidden="true" />Send now</DropdownMenuItem> : <DropdownMenuItem onSelect={() => setScheduleEnabled(true)}><Clock aria-hidden="true" />Schedule</DropdownMenuItem>}</DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {scheduleEnabled && <Input type="datetime-local" aria-label="Schedule date and time" value={scheduleAt} min={scheduleMin || undefined} onChange={(event) => setScheduleAt(event.target.value)} className="h-9 w-36 shrink-0" />}
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    {draftStatus !== "idle" && <span className="hidden whitespace-nowrap px-1 text-xs text-muted-foreground sm:inline">{draftStatus === "saving" || savingDraft ? "Saving…" : draftStatus === "saved" ? "Saved" : "Not saved"}</span>}
                    <label className="hidden items-center gap-1 whitespace-nowrap px-1 text-xs text-muted-foreground sm:flex" title="Add the VisualCNS header, footer and CTA">
                      <input type="checkbox" checked={brandedEmail} onChange={(event) => setBrandedEmail(event.target.checked)} className="size-3.5 accent-primary" />
                      Branded
                    </label>
                    <Button type="button" variant="outline" size="icon" aria-label="Preview email" title="Preview email" onClick={() => setComposerPreviewOpen(true)}><Eye aria-hidden="true" /></Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={selectedTemplate ? `Template: ${selectedTemplate.name}` : "Choose template"} title={selectedTemplate?.name || "Choose template"}><FileText aria-hidden="true" /></Button></DropdownMenuTrigger>
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
