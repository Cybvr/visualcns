"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronsUpDown,
  Clock,
  ChevronRight,
  Eye,
  FileText,
  Inbox,
  Loader2,
  List,
  Linkedin,
  Mail,
  Plus,
  Send,
  Trash2,
  Twitter,
  X,
} from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { deleteEmailList, getEmailLists, saveEmailList, type EmailContactList } from "@/lib/email-lists"
import { deleteEmailDraft, getEmailDrafts, saveEmailDraft, type EmailDraftRecord } from "@/lib/email-drafts"
import { deleteEmailMessage, getAllEmailMessages, getEmailMessages, saveEmailMessage, updateEmailMessageStatus, type EmailMessageRecord, type EmailRecipient } from "@/lib/email-messages"
import { getHiddenReceivedIds, hideReceivedEmail } from "@/lib/email-received-hidden"
import { contextualEmailBody, readEmailComposeContext, type EmailComposeContext } from "@/lib/email-composer"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { deleteEmailTemplate, getEmailTemplates, saveEmailTemplate } from "@/lib/email-templates-store"
import { markdownToHtml } from "@/lib/markdown"
import { getUsers } from "@/lib/users"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  escapeHtml,
  escapeHtmlAttribute,
  formatTemplateBody,
  receivedMessagePreview,
  sentMessagePreview,
  templatePreview,
  withMessageImage,
} from "@/components/dashboard/email/email-preview"
import type {
  ContactList,
  EmailContact,
  EmailMessageKind,
  EmailTab,
  EmailTemplate,
  ReceivedMessage,
  SentMessage,
} from "@/components/dashboard/email/types"
import { EmailComposer } from "@/components/dashboard/email/email-composer"
import { EmailLists } from "@/components/dashboard/email/email-lists"
import { EmailMessageSurfaces } from "@/components/dashboard/email/email-message-surfaces"
import { EmailTemplates } from "@/components/dashboard/email/email-templates"

type Notice = {
  tone: "success" | "error"
  text: string
} | null

type DraftStatus = "idle" | "saving" | "saved" | "error"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MESSAGE_SORTS: SortOption<SentMessage>[] = [
  { value: "createdAt", label: "Last sent", get: (message) => message.createdAt, ascLabel: "Oldest", descLabel: "Newest" },
  { value: "recipient", label: "Recipient", get: (message) => message.to, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "subject", label: "Subject", get: (message) => message.subject, ascLabel: "A–Z", descLabel: "Z–A" },
]
const DRAFT_SORTS: SortOption<EmailDraftRecord>[] = [
  { value: "updatedAt", label: "Last edited", get: (draft) => draft.updatedAt, ascLabel: "Oldest", descLabel: "Newest" },
  { value: "subject", label: "Subject", get: (draft) => draft.subject, ascLabel: "A–Z", descLabel: "Z–A" },
]

const RECEIVED_SORTS: SortOption<ReceivedMessage>[] = [
  { value: "createdAt", label: "Received", get: (message) => message.createdAt || "", ascLabel: "Oldest", descLabel: "Newest" },
  { value: "from", label: "Sender", get: (message) => message.from, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "subject", label: "Subject", get: (message) => message.subject, ascLabel: "A–Z", descLabel: "Z–A" },
]

function searchMessage(message: SentMessage) {
  return [message.to, message.subject, message.companyName, message.projectName, message.documentTitle, message.documentType, message.from, message.status]
}

function searchDraft(draft: EmailDraftRecord) {
  return [draft.to, draft.subject, draft.body]
}

function searchReceivedMessage(message: ReceivedMessage) {
  return [message.from, message.to.join(", "), message.subject, message.text || ""]
}

const LIST_SORTS: SortOption<ContactList>[] = [
  { value: "updatedAt", label: "Last updated", get: (list) => list.updatedAt, ascLabel: "Oldest", descLabel: "Newest" },
  { value: "name", label: "Name", get: (list) => list.name, ascLabel: "A–Z", descLabel: "Z–A" },
]

function searchList(list: ContactList) {
  return [list.name, list.contactEmails.length]
}

const TEMPLATE_SORTS: SortOption<EmailTemplate>[] = [
  { value: "updatedAt", label: "Last updated", get: (template) => template.updatedAt, ascLabel: "Oldest", descLabel: "Newest" },
  { value: "name", label: "Name", get: (template) => template.name, ascLabel: "A–Z", descLabel: "Z–A" },
]

function searchTemplate(template: EmailTemplate) {
  return [template.name, template.subject, template.body]
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readStoredList<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]")
    return Array.isArray(value) ? (value as T[]) : []
  } catch {
    return []
  }
}

function formatMessageDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return "Unknown date"
  }
}

/** Date only, no time—used in the list rows where a bare date reads cleaner. */
function formatListDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))
  } catch {
    return "Unknown date"
  }
}

/** Local time a few minutes ahead, formatted for a datetime-local input's min/value. */
function datetimeLocalMin() {
  const soon = new Date(Date.now() + 5 * 60_000)
  soon.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}`
}

/** A scheduled send whose time has passed—Resend has released it by now. */
function isScheduledPastDue(message: SentMessage) {
  return message.status === "scheduled" && !!message.scheduledAt && Date.parse(message.scheduledAt) <= Date.now()
}


function cleanSenderDisplay(value: string) {
  return value
    .replace(/(?:&nbsp;|&#(?:x0*a0|160|x0*20|32);)/gi, " ")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function contactInitials(name: string, email: string) {
  const source = name.trim() || email.trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : source.slice(0, 2)).toUpperCase()
}

function contactAvatarTone(value: string) {
  const tones = [
    "bg-cyan-200 text-cyan-950",
    "bg-sky-200 text-sky-950",
    "bg-rose-200 text-rose-950",
    "bg-slate-300 text-slate-900",
    "bg-amber-200 text-amber-950",
  ]
  const index = Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0) % tones.length
  return tones[index]
}

function htmlToText(value: string) {
  if (!value.includes("<")) return value
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function firstImageAttributes(value: string) {
  const image = value.match(/<img\b[^>]*>/i)?.[0]
  if (!image) return null
  const src = image.match(/\bsrc=["']([^"']+)["']/i)?.[1]
  if (!src) return null
  return {
    src,
    alt: image.match(/\balt=["']([^"']*)["']/i)?.[1] || undefined,
  }
}

function personalizeGreeting(value: string, name?: string) {
  const trimmedName = name?.trim()
  if (!trimmedName) return value
  return value
    .replace(/\[Customer Name\]|\[Name\]/gi, trimmedName)
    .replace(/(^|>|\n)(\s*(?:Dear|Hello)\s+)(Customer)(\s*,?)/i, `$1$2${trimmedName}$4`)
}

function recipientEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0].toLowerCase() || value.trim().toLowerCase()
}

export default function EmailPage() {
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  // An admin "viewing as" a client sees exactly what that client sees.
  const showOpsDetail = isAdmin && !isImpersonating
  const workspaceId = appUser?.companyId || user?.uid || "workspace"
  const templateStorageKey = `visualcns-email-templates:${workspaceId}`
  const messageStorageKey = `visualcns-email-messages:${workspaceId}`
  const listStorageKey = `visualcns-email-lists:${workspaceId}`

  const [tab, setTab] = useState<EmailTab>("inbox")
  const [composeOpen, setComposeOpen] = useState(false)
  const [composerPreviewOpen, setComposerPreviewOpen] = useState(false)
  const [composeMinimized, setComposeMinimized] = useState(false)
  const [selectedSentId, setSelectedSentId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [messages, setMessages] = useState<SentMessage[]>([])
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([])
  const [hiddenReceivedIds, setHiddenReceivedIds] = useState<Set<string>>(new Set())
  const [receivedLoading, setReceivedLoading] = useState(false)
  const [receivedError, setReceivedError] = useState("")
  const [selectedReceivedId, setSelectedReceivedId] = useState<string | null>(null)
  const [loadingReceivedId, setLoadingReceivedId] = useState<string | null>(null)
  const [senderConfigured, setSenderConfigured] = useState<boolean | null>(null)
  const [senderAddress, setSenderAddress] = useState<string | null>(null)
  const [replyToAddress, setReplyToAddress] = useState<string | null>(null)
  const [contacts, setContacts] = useState<EmailContact[]>([])
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [contactQuery, setContactQuery] = useState("")
  const [lists, setLists] = useState<ContactList[]>([])
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)

  const [to, setTo] = useState("")
  const [selectedListId, setSelectedListId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [messageKind, setMessageKind] = useState<EmailMessageKind>("transactional")
  const [composeContext, setComposeContext] = useState<EmailComposeContext | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleAt, setScheduleAt] = useState("")
  const [scheduleMin, setScheduleMin] = useState("")
  const [drafts, setDrafts] = useState<EmailDraftRecord[]>([])
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle")
  const draftIdRef = useRef<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendNotice, setSendNotice] = useState<Notice>(null)
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null)
  const [messageViewError, setMessageViewError] = useState("")
  const hydratingRef = useRef<Set<string>>(new Set())
  const reconciledRef = useRef<Set<string>>(new Set())

  const [preview, setPreview] = useState<string | null>(null)
  const [previewHeight, setPreviewHeight] = useState<number | null>(null)
  const [previewStage, setPreviewStage] = useState<{ w: number; h: number } | null>(null)
  const previewStageRef = useRef<HTMLDivElement>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [templateSubject, setTemplateSubject] = useState("")
  const [templateBody, setTemplateBody] = useState("")
  const [templateNotice, setTemplateNotice] = useState<Notice>(null)
  const [mobileMessageView, setMobileMessageView] = useState<"list" | "reader">("list")
  const [mobileTemplateView, setMobileTemplateView] = useState<"list" | "editor">("list")
  const [listName, setListName] = useState("")
  const [listContactEmails, setListContactEmails] = useState<string[]>([])
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [listNotice, setListNotice] = useState<Notice>(null)
  const [listContactQuery, setListContactQuery] = useState("")
  const [listShowSelectedOnly, setListShowSelectedOnly] = useState(false)
  const { results: visibleMessages, bar: messageFilterBar } = useFilterBar({
    items: messages,
    search: searchMessage,
    sorts: MESSAGE_SORTS,
    defaultSort: "createdAt",
    defaultDirection: "desc",
  })
  const { results: visibleDrafts, bar: draftFilterBar } = useFilterBar({
    items: drafts,
    search: searchDraft,
    sorts: DRAFT_SORTS,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })
  const activeReceivedMessages = useMemo(
    () => receivedMessages.filter((message) => !hiddenReceivedIds.has(message.id)),
    [receivedMessages, hiddenReceivedIds],
  )

  // The lists show a person's name, never a raw address: prefer an explicit name,
  // then a "Name <email>" display part, then a saved contact, then the local part.
  function resolveName(raw: string, explicitName?: string) {
    if (explicitName?.trim()) return explicitName.trim()
    const cleaned = cleanSenderDisplay(raw || "")
    const angle = cleaned.match(/^"?([^"<]*?)"?\s*<([^>]+)>$/)
    if (angle?.[1]?.trim()) return angle[1].trim()
    const email = (angle?.[2] || cleaned).trim()
    const contact = contacts.find((item) => item.email.toLowerCase() === email.toLowerCase())
    if (contact?.name?.trim()) return contact.name.trim()
    const local = email.includes("@") ? email.split("@")[0] : email
    return local ? local.replace(/[._-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()) : cleaned
  }
  const { results: visibleReceivedMessages, bar: receivedFilterBar } = useFilterBar({
    items: activeReceivedMessages,
    search: searchReceivedMessage,
    sorts: RECEIVED_SORTS,
    defaultSort: "createdAt",
    defaultDirection: "desc",
  })
  const { results: visibleTemplates, bar: templateFilterBar } = useFilterBar({
    items: templates,
    search: searchTemplate,
    sorts: TEMPLATE_SORTS,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })

  // Templates keep their own preview lightbox. Messages use the Gmail-style
  // reading panes above, so they never enter this preview flow.
  const previewList = visibleTemplates
  const previewIndex = preview ? previewList.findIndex((item) => item.id === preview) : -1
  const previewTemplate = previewIndex >= 0 ? previewList[previewIndex] : null
  const hasPrevPreview = previewIndex > 0
  const hasNextPreview = previewIndex >= 0 && previewIndex < previewList.length - 1
  const showPrevPreview = () => { if (hasPrevPreview) setPreview(previewList[previewIndex - 1].id) }
  const showNextPreview = () => { if (hasNextPreview) setPreview(previewList[previewIndex + 1].id) }

  // Render the email at a fixed natural width, then scale it down so the whole
  // thing fits the available box in both directions (never scaled up).
  const PREVIEW_WIDTH = 640
  const previewScale = previewHeight && previewStage
    ? Math.min(previewStage.w / PREVIEW_WIDTH, previewStage.h / previewHeight, 1)
    : 1

  // The server and browser must render the same initial markup. Calculate the
  // moving minimum only after hydration so Date.now() never changes SSR HTML.
  useEffect(() => {
    setScheduleMin(datetimeLocalMin())
  }, [])

  // Clear the page toast a few seconds after a send (the notice inside the open
  // composer is left alone).
  useEffect(() => {
    if (composeOpen || !sendNotice) return
    const timer = window.setTimeout(() => setSendNotice(null), 6000)
    return () => window.clearTimeout(timer)
  }, [composeOpen, sendNotice])

  // Keep a user-selected message valid without opening the first message on
  // page load. Gmail lands on the list; the reader opens only after a click.
  useEffect(() => {
    if (tab !== "messages") return
    setSelectedSentId((current) => current && visibleMessages.some((m) => m.id === current) ? current : null)
  }, [tab, messages])

  useEffect(() => {
    if (tab === "inbox" || tab === "messages") setMobileMessageView("list")
  }, [tab])

  // Settle any scheduled send whose time has passed so it stops reading
  // "Scheduled" everywhere (list, reader, and the stored record).
  useEffect(() => {
    messages.filter(isScheduledPastDue).forEach((message) => void reconcileScheduled(message))
  }, [messages])

  // A new item remounts the iframe, so drop the old measured height until the
  // new one reports its own on load, and clear any error from the last message.
  useEffect(() => { setPreviewHeight(null); setMessageViewError("") }, [preview])

  // Track the space available for the preview so the content can be scaled to
  // fit it with no inner scroll.
  useEffect(() => {
    if (!preview) return
    const measure = () => {
      const el = previewStageRef.current
      if (el) setPreviewStage({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [preview])

  useEffect(() => {
    if (previewIndex < 0 || !preview) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null)
      if (event.key === "ArrowLeft" && previewIndex > 0) setPreview(previewList[previewIndex - 1].id)
      if (event.key === "ArrowRight" && previewIndex < previewList.length - 1) setPreview(previewList[previewIndex + 1].id)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [previewIndex, previewList, preview])

  const { results: visibleLists, bar: listFilterBar } = useFilterBar({
    items: lists,
    search: searchList,
    sorts: LIST_SORTS,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })

  const activeFilterBar = tab === "inbox"
    ? receivedFilterBar
    : tab === "drafts"
      ? draftFilterBar
    : tab === "messages"
      ? messageFilterBar
      : tab === "templates"
        ? templateFilterBar
        : listFilterBar
  const EMAIL_FOLDERS: { key: EmailTab; label: string; icon: typeof Inbox; count: () => number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, count: () => receivedMessages.length },
    { key: "drafts", label: "Drafts", icon: FileText, count: () => drafts.length },
    { key: "messages", label: "Sent", icon: Send, count: () => messages.length },
    { key: "templates", label: "Templates", icon: FileText, count: () => templates.length },
    { key: "lists", label: "Lists", icon: List, count: () => lists.length },
  ]
  const selectedReceived = receivedMessages.find((message) => message.id === selectedReceivedId) || null
  const selectedSent = messages.find((message) => message.id === selectedSentId) || null
  const selectedContactName = contacts.find((contact) => recipientEmail(contact.email) === recipientEmail(to))?.name
  const composeRecipientName = selectedContactName || composeContext?.recipientName
  const selectedContact = contacts.find((contact) => recipientEmail(contact.email) === recipientEmail(to))
  const visibleContactOptions = useMemo(() => {
    const query = contactQuery.trim().toLowerCase()
    return [...contacts]
      .filter((contact) => !query || `${contact.name} ${contact.email}`.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [contactQuery, contacts])

  async function loadReceivedMessages() {
    if (!user) return
    setReceivedLoading(true)
    setReceivedError("")
    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/email/received", {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      })
      const result = (await response.json()) as { data?: ReceivedMessage[]; error?: string }
      if (!response.ok) throw new Error(result.error || "Received messages could not be loaded.")
      setReceivedMessages(Array.isArray(result.data) ? result.data : [])
      setSelectedReceivedId((current) => current && result.data?.some((message) => message.id === current) ? current : null)
    } catch (error) {
      setReceivedError(error instanceof Error ? error.message : "Received messages could not be loaded.")
    } finally {
      setReceivedLoading(false)
    }
  }

  async function hydrateReceivedMessage(message: ReceivedMessage) {
    if (message.html || message.text || !user) return
    setLoadingReceivedId(message.id)
    setReceivedError("")
    try {
      const idToken = await user.getIdToken()
      const response = await fetch(`/api/email/received?id=${encodeURIComponent(message.id)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      })
      const result = (await response.json()) as Partial<ReceivedMessage> & { error?: string }
      if (!response.ok) throw new Error(result.error || "The received email could not be loaded.")
      setReceivedMessages((current) => current.map((item) => item.id === message.id ? {
        ...item,
        ...result,
        id: item.id,
        from: result.from || item.from,
        to: result.to || item.to,
        subject: result.subject || item.subject,
      } : item))
    } catch (error) {
      setReceivedError(error instanceof Error ? error.message : "The received email could not be loaded.")
    } finally {
      setLoadingReceivedId(null)
    }
  }

  function previewReceivedMessageById(message: ReceivedMessage) {
    setSelectedReceivedId(message.id)
    setMobileMessageView("reader")
  }

  useEffect(() => {
    if (!selectedReceived || selectedReceived.html || selectedReceived.text) return
    void hydrateReceivedMessage(selectedReceived)
  }, [selectedReceivedId, receivedMessages])

  useEffect(() => {
    if (!selectedSent) return
    void hydrateMessageBody(selectedSent)
  }, [selectedSentId, messages])

  useEffect(() => {
    if (!user?.uid || tab !== "inbox") return
    void loadReceivedMessages()
  }, [tab, user?.uid])

  useEffect(() => {
    if (!user?.uid) return

    let active = true
    setMessages([])
    setLists([])

    void getEmailTemplates(workspaceId)
      .then((storedTemplates) => {
        if (!active) return
        setTemplates(storedTemplates)
        localStorage.removeItem(templateStorageKey)
      })
      .catch(() => {
        if (!active) return
        setTemplates([])
        setTemplateNotice({ tone: "error", text: "Templates could not be loaded from Firebase." })
      })

    return () => {
      active = false
    }
  }, [templateStorageKey, user?.uid, workspaceId])

  useEffect(() => {
    if (!user?.uid || !workspaceId) return
    let active = true
    const legacyMessages = readStoredList<SentMessage>(messageStorageKey)

    void (showOpsDetail ? getAllEmailMessages() : getEmailMessages(workspaceId))
      .then(async (storedMessages) => {
        const storedProviderIds = new Set(storedMessages.map((message) => message.providerId))
        const messagesToMigrate = legacyMessages.filter((message) => !storedProviderIds.has(message.providerId))

        if (messagesToMigrate.length > 0) {
          await Promise.all(messagesToMigrate.map((message) => saveEmailMessage({
            ...message,
            companyId: workspaceId,
            createdBy: user.uid,
          })))
        }

        if (!active) return
        setMessages([...storedMessages, ...messagesToMigrate].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
        localStorage.removeItem(messageStorageKey)
      })
      .catch(() => {
        if (active) setMessages(legacyMessages)
      })

    return () => {
      active = false
    }
  }, [messageStorageKey, showOpsDetail, user?.uid, workspaceId])

  useEffect(() => {
    if (!user?.uid || !workspaceId) return
    let active = true
    void getEmailDrafts(workspaceId)
      .then((storedDrafts) => { if (active) setDrafts(storedDrafts) })
      .catch(() => { if (active) setDrafts([]) })
    return () => { active = false }
  }, [user?.uid, workspaceId])

  useEffect(() => {
    if (!user?.uid || !workspaceId) return
    let active = true
    void getHiddenReceivedIds(workspaceId)
      .then((ids) => { if (active) setHiddenReceivedIds(new Set(ids)) })
      .catch(() => { if (active) setHiddenReceivedIds(new Set()) })
    return () => { active = false }
  }, [user?.uid, workspaceId])

  useEffect(() => {
    if (!user?.uid || !workspaceId) return
    let active = true
    const legacyLists = readStoredList<ContactList>(listStorageKey)

    void getEmailLists(workspaceId)
      .then(async (storedLists) => {
        let nextLists: EmailContactList[] = storedLists
        if (storedLists.length === 0 && legacyLists.length > 0) {
          nextLists = legacyLists.map((list) => ({
            ...list,
            companyId: workspaceId,
            createdBy: user.uid,
          }))
          await Promise.all(nextLists.map((list) => saveEmailList(list)))
        }

        if (!active) return
        setLists(nextLists)
        localStorage.removeItem(listStorageKey)
      })
      .catch(() => {
        if (active) setLists(legacyLists)
      })

    return () => {
      active = false
    }
  }, [listStorageKey, user?.uid, workspaceId])

  useEffect(() => {
    if (!showOpsDetail) {
      setContacts([])
      return
    }

    let active = true
    void getUsers()
      .then((users) => {
        if (!active) return
        const seen = new Set<string>()
        const nextContacts = users
          .filter((contact) => contact.role === "client" && contact.email?.trim())
          .map((contact) => ({
            email: contact.email.trim(),
            label: [contact.company, contact.displayName].filter(Boolean).join(" · ") || contact.email.trim(),
            name:
              contact.displayName?.trim() ||
              contact.company?.trim() ||
              contact.email.trim().split("@")[0],
            companyId: contact.companyId || contact.uid,
          }))
          .filter((contact) => {
            const key = contact.email.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
        setContacts(nextContacts)
      })
      .catch(() => {
        if (active) setContacts([])
      })

    return () => {
      active = false
    }
  }, [showOpsDetail])

  useEffect(() => {
    const nextContext = readEmailComposeContext(searchParams)
    if (!nextContext) return
    setComposeContext(nextContext)
    setComposeOpen(true)
    setComposeMinimized(false)
    setPreview(null)
    setTo(nextContext.recipientEmail || "")
    setSelectedListId("")
    setSubject(nextContext.subject || "")
    setBody(nextContext.body || contextualEmailBody(nextContext))
    setMessageKind(nextContext.messageKind === "marketing" ? "marketing" : "transactional")
    setSelectedTemplateId("")
    setSendNotice(null)
  }, [searchParams])

  useEffect(() => {
    let active = true

    fetch("/api/email/send", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as { configured?: boolean; from?: string | null; replyTo?: string | null }
        if (!active) return
        setSenderConfigured(Boolean(result.configured))
        setSenderAddress(result.from || null)
        setReplyToAddress(result.replyTo || result.from || null)
      })
      .catch(() => {
        if (active) setSenderConfigured(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void getBusinessProfile().then((profile) => {
      if (active) setBusinessProfile(profile)
    })
    return () => {
      active = false
    }
  }, [])

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates],
  )
  const selectedList = useMemo(
    () => lists.find((list) => list.id === selectedListId),
    [selectedListId, lists],
  )

  const visibleListContacts = useMemo(() => {
    const query = listContactQuery.trim().toLowerCase()
    return contacts.filter((contact) => {
      if (listShowSelectedOnly && !listContactEmails.includes(contact.email)) return false
      if (!query) return true
      return `${contact.name} ${contact.email}`.toLowerCase().includes(query)
    })
  }, [contacts, listContactQuery, listShowSelectedOnly, listContactEmails])

  function composerPreviewHtml() {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const logoUrl = businessProfile?.logoUrl || "/visualcns-email-logo.png"
    const absoluteLogoUrl = logoUrl.startsWith("/") ? `${origin}${logoUrl}` : logoUrl
    const content = formatTemplateBody(body || "<p>Your message preview will appear here.</p>")
      .replace(/(src=["'])\/([^"']*)/gi, `$1${origin}/$2`)
    const brandName = businessProfile?.name || "VisualCNS"
    const address = businessProfile?.address || "Lagos, Nigeria"
    const website = businessProfile?.website || "visualcns.com"
    const websiteUrl = website.startsWith("http") ? website : `https://${website}`
    const ctaUrl = composeContext?.ctaUrl || `${origin}/portal`
    const ctaText = composeContext?.ctaText || "Open your client portal"
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{margin:0;padding:0;background:#f3f4f7;color:#20232d;font-family:Arial,Helvetica,sans-serif}table{border-collapse:collapse}img{display:block;max-width:100%;height:auto;max-height:56px;object-fit:contain;object-position:left center}p{margin:0 0 1em}ul,ol{padding-left:1.5rem}a{color:#1649d8}</style></head><body><table role="presentation" width="100%" style="width:100%;background:#f3f4f7"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" style="width:100%;max-width:600px;background:#fff"><tr><td style="padding:22px 28px;height:56px;line-height:0"><img src="${escapeHtmlAttribute(absoluteLogoUrl)}" width="320" alt="${escapeHtmlAttribute(brandName)}" style="display:block;width:320px;max-width:100%;height:auto;max-height:56px;object-fit:contain;object-position:left center;border:0"></td></tr><tr><td style="padding:8px 28px 12px;font-size:15px;line-height:1.65;overflow-wrap:anywhere"><h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;color:#20232d">${escapeHtml(subject || "(No subject)")}</h1>${content}</td></tr><tr><td style="padding:0 28px 30px"><a href="${escapeHtmlAttribute(ctaUrl)}" style="display:inline-block;background:#111318;border-radius:999px;color:#fff;padding:12px 20px;font-size:14px;font-weight:700;line-height:20px;text-decoration:none">${escapeHtml(ctaText)}</a></td></tr><tr><td style="padding:20px 28px;background:#f8f8fa;border-top:1px solid #e7e8ec;font-size:12px;line-height:1.6;color:#6d7280"><strong style="color:#303440">${escapeHtml(brandName)}</strong><br>${escapeHtml(address)}<br><a href="${escapeHtmlAttribute(websiteUrl)}" style="color:#5f6472">${escapeHtml(website)}</a></td></tr></table></td></tr></table></body></html>`
  }

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId)
    const template = templates.find((item) => item.id === templateId)
    if (!template) return
    setSubject(template.subject)
    setBody(personalizeGreeting(withMessageImage(template.body, template.imageUrl, template.imageAlt), composeRecipientName))
    setSendNotice(null)
  }

  function handleRecipientChange(value: string) {
    setTo(value)
    const contact = contacts.find((item) => recipientEmail(item.email) === recipientEmail(value))
    if (contact) setBody((current) => personalizeGreeting(current, contact.name))
  }

  function clearComposer() {
    setComposerPreviewOpen(false)
    setLoadingMessageId(null)
    setMessageViewError("")
    setTo("")
    setSelectedListId("")
    setSubject("")
    setBody("")
    setMessageKind("transactional")
    setComposeContext(null)
    setSelectedTemplateId("")
    setScheduleEnabled(false)
    setScheduleAt("")
    setEditingDraftId(null)
    draftIdRef.current = null
    setDraftStatus("idle")
    setSendNotice(null)
  }

  // Open the docked compose window. Pass reset to start from a blank message.
  function openCompose(reset = false) {
    if (reset) clearComposer()
    setComposeOpen(true)
    setComposeMinimized(false)
  }

  function closeCompose() {
    setComposerPreviewOpen(false)
    setComposeOpen(false)
    setComposeMinimized(false)
  }

  async function saveDraft() {
    if (!user || savingDraft) return
    if (!subject.trim() && !htmlToText(body).trim() && !to.trim() && !selectedListId) {
      setDraftStatus("idle")
      return
    }
    setSavingDraft(true)
    setDraftStatus("saving")
    const id = draftIdRef.current || editingDraftId || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`)
    draftIdRef.current = id
    const draft: EmailDraftRecord = {
      id,
      companyId: workspaceId,
      createdBy: user.uid,
      to: to.trim() || undefined,
      listId: selectedListId || undefined,
      subject: subject.trim() || undefined,
      body: body || undefined,
      messageKind,
      context: composeContext ? { ...composeContext } : null,
      updatedAt: new Date().toISOString(),
    }
    try {
      await saveEmailDraft(draft)
      setDrafts((current) => [draft, ...current.filter((item) => item.id !== id)])
      setEditingDraftId(id)
      setDraftStatus("saved")
    } catch {
      setDraftStatus("error")
    } finally {
      setSavingDraft(false)
    }
  }

  useEffect(() => {
    if (!user?.uid || (!subject.trim() && !htmlToText(body).trim() && !to.trim() && !selectedListId)) {
      setDraftStatus("idle")
      return
    }

    setDraftStatus("saving")
    const timer = window.setTimeout(() => { void saveDraft() }, 800)
    return () => window.clearTimeout(timer)
  }, [body, composeContext, messageKind, selectedListId, subject, to, user?.uid])

  function loadDraft(draft: EmailDraftRecord) {
    setMessageViewError("")
    // Clear any open preview overlay so the composer opens as the only surface.
    setComposerPreviewOpen(false)
    setPreview(null)
    setTo(draft.to || "")
    setSelectedListId(draft.listId || "")
    setSubject(draft.subject || "")
    setBody(draft.body || "")
    setMessageKind(draft.messageKind === "marketing" ? "marketing" : "transactional")
    setComposeContext((draft.context as EmailComposeContext | null) ?? null)
    setSelectedTemplateId("")
    setScheduleEnabled(false)
    setScheduleAt("")
    setEditingDraftId(draft.id)
    draftIdRef.current = draft.id
    setDraftStatus("saved")
    setSendNotice(null)
    setComposeOpen(true)
    setComposeMinimized(false)
  }

  async function removeDraft(id: string) {
    setDrafts((current) => current.filter((item) => item.id !== id))
    if (editingDraftId === id) setEditingDraftId(null)
    if (draftIdRef.current === id) draftIdRef.current = null
    try {
      await deleteEmailDraft(id)
    } catch {
      setSendNotice({ tone: "error", text: "The draft could not be deleted." })
    }
  }

  async function deleteReceivedMessage(message: ReceivedMessage) {
    if (!user) return
    setHiddenReceivedIds((current) => new Set(current).add(message.id))
    if (selectedReceivedId === message.id) { setSelectedReceivedId(null); setMobileMessageView("list") }
    try {
      await hideReceivedEmail({ receivedId: message.id, companyId: workspaceId, createdBy: user.uid })
    } catch {
      setHiddenReceivedIds((current) => { const next = new Set(current); next.delete(message.id); return next })
      setReceivedError("The message could not be deleted.")
    }
  }

  async function deleteSentMessage(message: SentMessage) {
    setMessages((current) => current.filter((item) => item.id !== message.id))
    if (selectedSentId === message.id) { setSelectedSentId(null); setMobileMessageView("list") }
    try {
      await deleteEmailMessage(message.id)
    } catch {
      setSendNotice({ tone: "error", text: "The message could not be deleted." })
    }
  }

  // Sent emails store only their metadata; the full body is fetched from the
  // mail provider the first time one is previewed, then cached on the record.
  async function hydrateMessageBody(message: SentMessage) {
    if (message.bodyHtml || message.bodyText || !user) return
    if (hydratingRef.current.has(message.id)) return
    hydratingRef.current.add(message.id)
    setLoadingMessageId(message.id)
    setMessageViewError("")
    try {
      const idToken = await user.getIdToken()
      const response = await fetch(`/api/email/send?id=${encodeURIComponent(message.providerId)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      })
      const result = (await response.json()) as {
        error?: string
        to?: string[]
        from?: string | null
        replyTo?: string | null
        subject?: string
        createdAt?: string | null
        html?: string | null
        text?: string | null
      }
      if (!response.ok) throw new Error(result.error || "The sent email could not be loaded.")

      const hydratedMessage: SentMessage = {
        ...message,
        to: result.to?.join(", ") || message.to,
        from: result.from || message.from,
        replyTo: result.replyTo || message.replyTo,
        subject: result.subject || message.subject,
        createdAt: result.createdAt || message.createdAt,
        bodyHtml: result.html || undefined,
        bodyText: result.text || undefined,
      }
      setMessages((current) => current.map((item) => item.id === message.id ? hydratedMessage : item))
      try {
        await saveEmailMessage({
          ...hydratedMessage,
          companyId: workspaceId,
          createdBy: user.uid,
        })
      } catch {
        // The Resend copy can still be viewed even if refreshing the database record fails.
      }
    } catch (error) {
      setMessageViewError(error instanceof Error ? error.message : "The sent email could not be loaded.")
    } finally {
      setLoadingMessageId(null)
      hydratingRef.current.delete(message.id)
    }
  }

  // A scheduled send that has passed its time is checked against the mail
  // provider to confirm it actually went out, then relabelled here.
  async function reconcileScheduled(message: SentMessage) {
    if (message.status !== "scheduled" || !user) return
    if (reconciledRef.current.has(message.id)) return
    reconciledRef.current.add(message.id)
    // The scheduled time has passed, so the provider has released it. Confirm
    // the real delivery status, then default to "sent" if it can't be read.
    let nextStatus: EmailMessageRecord["status"] = "sent"
    try {
      const idToken = await user.getIdToken()
      const response = await fetch(`/api/email/send?id=${encodeURIComponent(message.providerId)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      })
      const result = (await response.json()) as { lastEvent?: string | null }
      if (response.ok) {
        const event = (result.lastEvent || "").toLowerCase()
        if (event === "scheduled") { reconciledRef.current.delete(message.id); return }
        if (["bounced", "complained", "canceled", "cancelled", "failed"].includes(event)) nextStatus = "failed"
      }
    } catch {
      // Fall back to "sent"—a past-due scheduled email has already been released.
    }
    setMessages((current) => current.map((item) => item.id === message.id ? { ...item, status: nextStatus } : item))
    void updateEmailMessageStatus(message.id, nextStatus === "failed" ? "failed" : "sent").catch(() => undefined)
  }

  // Show a sent message in the reading pane (and pull its body in if missing).
  function openSentMessage(message: SentMessage) {
    setMessageViewError("")
    setSelectedSentId(message.id)
    setMobileMessageView("reader")
    void hydrateMessageBody(message)
    if (isScheduledPastDue(message)) void reconcileScheduled(message)
  }

  async function sendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || sending || !senderConfigured) return

    setSendNotice(null)

    const trimmedSubject = subject.trim()
    const recipientEmails = selectedList ? selectedList.contactEmails : [to.trim()]
    if (EMAIL_PATTERN.test(trimmedSubject) || recipientEmails.some((email) => email.toLowerCase() === trimmedSubject.toLowerCase())) {
      setSendNotice({ tone: "error", text: "Add a message subject—the recipient email cannot be used as the subject." })
      return
    }

    let scheduledAtIso = ""
    if (scheduleEnabled) {
      const when = new Date(scheduleAt)
      if (!scheduleAt || Number.isNaN(when.getTime())) {
        setSendNotice({ tone: "error", text: "Pick a date and time to schedule this email." })
        return
      }
      if (when.getTime() < Date.now() + 60_000) {
        setSendNotice({ tone: "error", text: "Pick a scheduled time at least a minute from now." })
        return
      }
      scheduledAtIso = when.toISOString()
    }

    setSending(true)

    try {
      const sentBody = personalizeGreeting(body, composeRecipientName)
      const textBody = htmlToText(sentBody).trim()
      const bodyHtml = sentBody.includes("<") ? sentBody : markdownToHtml(sentBody)
      const recipientRecords: EmailRecipient[] = recipientEmails.map((email) => {
        const contact = contacts.find((item) => recipientEmail(item.email) === recipientEmail(email))
        return {
          email: recipientEmail(email),
          name: contact?.name || (recipientEmails.length === 1 ? composeRecipientName : undefined),
          companyId: contact?.companyId || composeContext?.companyId,
        }
      })
      const savedCompanyId = composeContext?.companyId || workspaceId
      const idToken = await user.getIdToken()
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: selectedList ? selectedList.contactEmails : to,
          type: messageKind,
          subject: trimmedSubject,
          text: textBody,
          html: bodyHtml,
          brand: businessProfile,
          cta: composeContext?.ctaUrl
            ? { text: composeContext.ctaText || "Open your client portal", url: composeContext.ctaUrl }
            : undefined,
          companyId: composeContext?.companyId,
          projectId: composeContext?.projectId,
          documentType: composeContext?.documentType,
          documentId: composeContext?.documentId,
          scheduledAt: scheduledAtIso || undefined,
        }),
      })
      const result = (await response.json()) as { id?: string; html?: string; text?: string; replyTo?: string | null; suppressedCount?: number; scheduledAt?: string | null; error?: string }

      if (!response.ok || !result.id) {
        throw new Error(result.error || "The message could not be sent.")
      }

      const sentMessage: SentMessage = {
        id: result.id as string,
        providerId: result.id as string,
        to: selectedList ? `${selectedList.name} (${selectedList.contactEmails.length})` : to.trim(),
        subject: trimmedSubject,
        createdAt: new Date().toISOString(),
        from: senderAddress || undefined,
        replyTo: result.replyTo || replyToAddress || senderAddress || undefined,
        bodyHtml: result.html || bodyHtml,
        bodyText: result.text || textBody,
        recipients: recipientRecords,
        companyName: composeContext?.companyName,
        projectId: composeContext?.projectId,
        projectName: composeContext?.projectName,
        documentType: composeContext?.documentType,
        documentId: composeContext?.documentId,
        documentTitle: composeContext?.documentTitle,
        messageKind,
        status: scheduledAtIso ? "scheduled" : "sent",
        scheduledAt: scheduledAtIso || undefined,
      }
      let historySaved = true
      try {
        await saveEmailMessage({
          ...sentMessage,
          companyId: savedCompanyId,
          createdBy: user.uid,
        })
      } catch {
        historySaved = false
      }
      setMessages((current) => [sentMessage, ...current])
      setTo("")
      setSelectedListId("")
      setSubject("")
      setBody("")
      setMessageKind("transactional")
      setComposeContext(null)
      setSelectedTemplateId("")
      setScheduleEnabled(false)
      setScheduleAt("")
      if (editingDraftId) {
        const sentDraftId = editingDraftId
        setDrafts((current) => current.filter((item) => item.id !== sentDraftId))
        setEditingDraftId(null)
        void deleteEmailDraft(sentDraftId).catch(() => undefined)
      }
      draftIdRef.current = null
      setDraftStatus("idle")
      const suppressionNotice = result.suppressedCount ? ` ${result.suppressedCount} unsubscribed contact${result.suppressedCount === 1 ? "" : "s"} skipped.` : ""
      const verb = scheduledAtIso ? `Scheduled for ${formatMessageDate(scheduledAtIso)}` : "Message sent"
      setSendNotice(historySaved
        ? { tone: "success", text: `${verb}.${suppressionNotice}` }
        : { tone: "error", text: `${verb}, but its shared history could not be saved.` })
      // Close the docked window on a successful send (Gmail-style); the notice
      // shows as a page toast.
      closeCompose()
    } catch (error) {
      setSendNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "The message could not be sent. Try again.",
      })
    } finally {
      setSending(false)
    }
  }

  function resetTemplateEditor() {
    setEditingTemplateId(null)
    setTemplateName("")
    setTemplateSubject("")
    setTemplateBody("")
    setTemplateNotice(null)
  }

  function editTemplate(template: EmailTemplate) {
    setEditingTemplateId(template.id)
    setTemplateName(template.name)
    setTemplateSubject(template.subject)
    setTemplateBody(withMessageImage(template.body, template.imageUrl, template.imageAlt))
    setTemplateNotice(null)
  }

  function useEditingTemplate() {
    if (!editingTemplateId || !templates.some((template) => template.id === editingTemplateId)) return
    applyTemplate(editingTemplateId)
    setComposeOpen(true)
    setComposeMinimized(false)
  }

  function previewEditingTemplate() {
    if (!templateBody.trim()) return
    setSubject(templateSubject)
    setBody(withMessageImage(templateBody))
    setSelectedTemplateId(editingTemplateId || "")
    setSendNotice(null)
    setComposeOpen(true)
    setComposeMinimized(false)
    setComposerPreviewOpen(true)
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = templateName.trim()
    const savedSubject = templateSubject.trim()
    const savedBody = templateBody.trim()
    const embeddedImage = firstImageAttributes(savedBody)

    if (!name || !savedSubject || !savedBody) {
      setTemplateNotice({ tone: "error", text: "Add a name, subject, and message before saving." })
      return
    }

    if (!user?.uid) {
      setTemplateNotice({ tone: "error", text: "Sign in before saving a template." })
      return
    }

    const now = new Date().toISOString()
    const existingTemplate = editingTemplateId ? templates.find((template) => template.id === editingTemplateId) : undefined
    const nextTemplate: EmailTemplate = {
      ...(existingTemplate || {}),
      id: editingTemplateId || makeId(),
      name,
      subject: savedSubject,
      body: savedBody,
      imageUrl: embeddedImage?.src,
      imageAlt: embeddedImage?.alt || undefined,
      updatedAt: now,
    }

    try {
      await saveEmailTemplate({ ...nextTemplate, companyId: workspaceId, createdBy: user.uid })
      setTemplates((current) => editingTemplateId
        ? current.map((template) => template.id === editingTemplateId ? nextTemplate : template)
        : [nextTemplate, ...current])
      setEditingTemplateId(nextTemplate.id)
      setTemplateNotice({ tone: "success", text: editingTemplateId ? "Template updated." : "Template saved." })
    } catch {
      setTemplateNotice({ tone: "error", text: "The template could not be saved. Try again." })
    }
  }

  async function addInsightsTemplate() {
    if (!user?.uid) {
      setTemplateNotice({ tone: "error", text: "Sign in before adding a template." })
      return
    }
    const insightsTemplate: EmailTemplate = {
      id: "announce-insights",
      name: "Announcement — Insights",
      subject: "Introducing Insights in your portal",
      body:
        "<p>Hi there,</p>" +
        "<p>We’ve added a new section to your portal called Insights.</p>" +
        "<p>It gives you practical suggestions for growing your business across four areas: your website, your social media, your brand and design, and your content and marketing. Each suggestion is based on your account and the work we’re already doing together, so they’re specific to you rather than generic advice.</p>" +
        "<p>You can open Insights any time from your portal, and refresh it whenever you’d like a fresh set of ideas.</p>" +
        "<p>Take a look when you have a moment, and let us know which suggestions you’d like us to take on. We’re happy to talk any of them through.</p>" +
        "<p><a href=\"/portal\" style=\"display:inline-block;background:#2856d9;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px\">Open your portal</a></p>" +
        "<p>Best regards,<br />The VisualCNS team</p>",
      updatedAt: new Date().toISOString(),
    }
    try {
      await saveEmailTemplate({ ...insightsTemplate, companyId: workspaceId, createdBy: user.uid })
      setTemplates((current) => {
        const rest = current.filter((template) => template.id !== insightsTemplate.id)
        return [insightsTemplate, ...rest]
      })
      setTemplateNotice({ tone: "success", text: "Insights announcement added to your templates." })
    } catch {
      setTemplateNotice({ tone: "error", text: "The template could not be added. Try again." })
    }
  }

  async function deleteTemplate(templateId: string) {
    try {
      await deleteEmailTemplate(templateId, workspaceId)
      setTemplates((current) => current.filter((template) => template.id !== templateId))
      if (selectedTemplateId === templateId) setSelectedTemplateId("")
      if (editingTemplateId === templateId) resetTemplateEditor()
    } catch {
      setTemplateNotice({ tone: "error", text: "The template could not be deleted. Try again." })
    }
  }

  function resetListEditor() {
    setEditingListId(null)
    setListName("")
    setListContactEmails([])
    setListNotice(null)
    setListContactQuery("")
    setListShowSelectedOnly(false)
  }

  function editList(list: ContactList) {
    setEditingListId(list.id)
    setListName(list.name)
    setListContactEmails(list.contactEmails)
    setListNotice(null)
    setListContactQuery("")
    // Open straight into the list's members so you can see who's in it.
    setListShowSelectedOnly(true)
  }

  async function saveList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = listName.trim()
    if (!name) {
      setListNotice({ tone: "error", text: "Add a name for this list." })
      return
    }

    const now = new Date().toISOString()
    const list: ContactList = {
      id: editingListId || makeId(),
      name,
      contactEmails: Array.from(new Set(listContactEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))),
      updatedAt: now,
    }

    if (editingListId) {
      const updatedList = { ...list, id: editingListId }
      setLists((current) => current.map((item) => item.id === editingListId ? updatedList : item))
      try {
        await saveEmailList({ ...updatedList, companyId: workspaceId, createdBy: user?.uid || "" })
      } catch {
        setListNotice({ tone: "error", text: "The list could not be saved to the workspace." })
        return
      }
      setListNotice({ tone: "success", text: "List updated." })
      return
    }

    setLists((current) => [list, ...current])
    try {
      await saveEmailList({ ...list, companyId: workspaceId, createdBy: user?.uid || "" })
    } catch {
      setLists((current) => current.filter((item) => item.id !== list.id))
      setListNotice({ tone: "error", text: "The list could not be saved to the workspace." })
      return
    }
    setEditingListId(list.id)
    setListNotice({ tone: "success", text: "List created." })
  }

  async function deleteList(listId: string) {
    setLists((current) => current.filter((list) => list.id !== listId))
    try {
      await deleteEmailList(listId)
      if (editingListId === listId) resetListEditor()
    } catch {
      setListNotice({ tone: "error", text: "The list could not be deleted from the workspace." })
    }
  }

  return (
    <main className="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col overflow-visible px-3 pt-3 pb-5 sm:px-6 sm:pt-4 sm:pb-6 lg:h-[calc(100svh-3.5rem)] lg:max-h-[calc(100svh-3.5rem)] lg:flex-none lg:flex-row lg:gap-6 lg:overflow-hidden">
      {/* Gmail-style folder rail */}
      <nav className="hidden shrink-0 lg:flex lg:w-52 lg:flex-col" aria-label="Email folders">
        <Button type="button" size="lg" className="mb-3 w-fit justify-start gap-2 rounded-sm px-4 shadow-sm" onClick={() => openCompose(true)}>
          <Plus aria-hidden="true" />Compose
        </Button>
        <div className="flex flex-col gap-0.5">
          {EMAIL_FOLDERS.map((folder) => (
            <button
              key={folder.key}
              type="button"
              onClick={() => setTab(folder.key)}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                tab === folder.key ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={tab === folder.key ? "page" : undefined}
            >
              <folder.icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-left">{folder.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{folder.count()}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <FilterBar
          {...activeFilterBar}
          className="mb-2"
          placeholder={tab === "inbox" ? "Search inbox" : tab === "messages" ? "Search sent" : tab === "templates" ? "Search templates" : "Search lists"}
          searchClassName={tab === "messages" || tab === "inbox" ? "sm:max-w-[16rem]" : undefined}
          leading={<SidebarTrigger className="-ml-1 shrink-0 lg:hidden" />}
        />
        <div className="mb-2 flex w-full items-center gap-1 rounded-md bg-muted/50 p-0.5 lg:hidden" role="tablist" aria-label="Email">
          {EMAIL_FOLDERS.map((folder) => (
            <button
              key={folder.key}
              type="button"
              role="tab"
              aria-selected={tab === folder.key}
              onClick={() => {
                setTab(folder.key)
                if (folder.key === "templates") setMobileTemplateView("list")
              }}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                tab === folder.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {folder.label}
            </button>
          ))}
        </div>

        {(tab === "inbox" || tab === "drafts" || tab === "messages") && (
          <EmailMessageSurfaces
            tab={tab}
            receivedMessages={activeReceivedMessages}
            visibleReceivedMessages={visibleReceivedMessages}
            receivedLoading={receivedLoading}
            receivedError={receivedError}
            selectedReceived={selectedReceived}
            selectedReceivedId={selectedReceivedId}
            loadingReceivedId={loadingReceivedId}
            onOpenReceived={previewReceivedMessageById}
            onClearReceived={() => { setSelectedReceivedId(null); setMobileMessageView("list") }}
            onDeleteReceived={(message) => void deleteReceivedMessage(message)}
            drafts={drafts}
            visibleDrafts={visibleDrafts}
            editingDraftId={editingDraftId}
            onLoadDraft={loadDraft}
            onRemoveDraft={removeDraft}
            messages={messages}
            visibleMessages={visibleMessages}
            selectedSent={selectedSent}
            selectedSentId={selectedSentId}
            onOpenSent={openSentMessage}
            onClearSent={() => { setSelectedSentId(null); setMobileMessageView("list") }}
            onDeleteSent={(message) => void deleteSentMessage(message)}
            mobileMessageView={mobileMessageView}
            setMobileMessageView={setMobileMessageView}
            loadingMessageId={loadingMessageId}
            messageViewError={messageViewError}
            onRetrySent={(message) => void hydrateMessageBody(message)}
            receivedMessagePreview={receivedMessagePreview}
            sentMessagePreview={sentMessagePreview}
            contactInitials={contactInitials}
            contactAvatarTone={contactAvatarTone}
            resolveName={resolveName}
            formatMessageDate={formatMessageDate}
            formatListDate={formatListDate}
            cleanSenderDisplay={cleanSenderDisplay}
            isScheduledPastDue={isScheduledPastDue}
          />
        )}

        {tab === "lists" && (
          <EmailLists
            lists={lists}
            visibleLists={visibleLists}
            editingListId={editingListId}
            editList={editList}
            deleteList={deleteList}
            resetListEditor={resetListEditor}
            listName={listName}
            setListName={setListName}
            listContactQuery={listContactQuery}
            setListContactQuery={setListContactQuery}
            listShowSelectedOnly={listShowSelectedOnly}
            setListShowSelectedOnly={setListShowSelectedOnly}
            listContactEmails={listContactEmails}
            setListContactEmails={setListContactEmails}
            contacts={contacts}
            visibleListContacts={visibleListContacts}
            saveList={saveList}
            listNotice={listNotice}
            contactInitials={contactInitials}
            contactAvatarTone={contactAvatarTone}
          />
        )}

        {tab === "templates" && (
          <EmailTemplates
            templates={templates}
            visibleTemplates={visibleTemplates}
            editingTemplateId={editingTemplateId}
            templateName={templateName}
            setTemplateName={setTemplateName}
            templateSubject={templateSubject}
            setTemplateSubject={setTemplateSubject}
            templateBody={templateBody}
            setTemplateBody={setTemplateBody}
            templateNotice={templateNotice}
            saveTemplate={saveTemplate}
            useEditingTemplate={useEditingTemplate}
            previewEditingTemplate={previewEditingTemplate}
            editTemplate={editTemplate}
            setMobileTemplateView={setMobileTemplateView}
            mobileTemplateView={mobileTemplateView}
            businessProfile={businessProfile}
            isAdmin={isAdmin}
            addInsightsTemplate={addInsightsTemplate}
            resetTemplateEditor={resetTemplateEditor}
            deleteTemplate={deleteTemplate}
            contactInitials={contactInitials}
            contactAvatarTone={contactAvatarTone}
            formatListDate={formatListDate}
          />
        )}

      </div>

      <Button
        type="button"
        size="icon"
        onClick={() => openCompose(true)}
        aria-label="Compose"
        title="Compose"
        className="fixed right-5 bottom-6 z-30 size-14 rounded-full shadow-lg lg:hidden"
      >
        <Plus className="size-6" aria-hidden="true" />
      </Button>

      <EmailComposer
        composeOpen={composeOpen}
        composeMinimized={composeMinimized}
        setComposeMinimized={setComposeMinimized}
        closeCompose={closeCompose}
        subject={subject}
        setSubject={setSubject}
        senderAddress={senderAddress || ""}
        showOpsDetail={showOpsDetail}
        cleanSenderDisplay={cleanSenderDisplay}
        messageKind={messageKind}
        setMessageKind={setMessageKind}
        contactPickerOpen={contactPickerOpen}
        setContactPickerOpen={setContactPickerOpen}
        setContactQuery={setContactQuery}
        contactQuery={contactQuery}
        selectedContact={selectedContact || null}
        selectedList={selectedList || null}
        handleRecipientChange={handleRecipientChange}
        visibleContactOptions={visibleContactOptions}
        contactInitials={contactInitials}
        contactAvatarTone={contactAvatarTone}
        to={to}
        recipientEmail={recipientEmail}
        selectedListId={selectedListId || ""}
        setSelectedListId={setSelectedListId}
        setTo={setTo}
        lists={lists}
        body={body}
        setBody={setBody}
        senderConfigured={Boolean(senderConfigured)}
        sending={sending}
        scheduleEnabled={Boolean(scheduleEnabled)}
        setScheduleEnabled={setScheduleEnabled}
        scheduleAt={scheduleAt}
        scheduleMin={scheduleMin}
        setScheduleAt={setScheduleAt}
        sendEmail={sendEmail}
        draftStatus={draftStatus}
        savingDraft={savingDraft}
        setComposerPreviewOpen={setComposerPreviewOpen}
        templates={templates}
        selectedTemplate={selectedTemplate || null}
        applyTemplate={applyTemplate}
        editingDraftId={editingDraftId}
        removeDraft={removeDraft}
        clearComposer={clearComposer}
        htmlToText={htmlToText}
        composerPreviewOpen={composerPreviewOpen}
        composerPreviewHtml={composerPreviewHtml}
        sendNotice={sendNotice}
      />

      {/* Send confirmation toast (shown once the composer closes) */}
      {!composeOpen && sendNotice && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 sm:left-6 sm:translate-x-0">
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm shadow-lg",
            sendNotice.tone === "success" ? "bg-neutral-800 text-white dark:bg-neutral-900" : "bg-destructive text-destructive-foreground",
          )}>
            {sendNotice.tone === "success" ? <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> : <X className="size-4 shrink-0" aria-hidden="true" />}
            <span>{sendNotice.text}</span>
          </div>
        </div>
      )}

      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview: ${previewTemplate.name}`}
          onClick={() => setPreview(null)}
        >
          <div className="flex shrink-0 items-center gap-3 px-4 py-3 text-white sm:px-6" onClick={(event) => event.stopPropagation()}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{previewTemplate.name}</p>
              <p className="truncate text-xs text-white/70">{previewTemplate.subject} · {previewIndex + 1} of {previewList.length}</p>
            </div>
            <button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="flex size-9 items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-2 pb-6 sm:gap-4 sm:px-6" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={showPrevPreview} disabled={!hasPrevPreview} aria-label="Previous" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-30">
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
            <div ref={previewStageRef} className="flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden">
              <div
                className="relative overflow-hidden rounded-xl bg-white shadow-2xl"
                style={{ width: PREVIEW_WIDTH * previewScale, height: (previewHeight ?? 0) * previewScale }}
              >
                <iframe
                  key={preview}
                  title={`Template preview: ${previewTemplate.name}`}
                  sandbox="allow-same-origin"
                  scrolling="no"
                  srcDoc={templatePreview(previewTemplate)}
                  onLoad={(event) => {
                    const doc = event.currentTarget.contentDocument
                    if (doc?.body) setPreviewHeight(doc.body.scrollHeight)
                  }}
                  style={{
                    width: PREVIEW_WIDTH,
                    height: previewHeight ?? "100%",
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                  className="absolute left-0 top-0 border-0 bg-white"
                />
              </div>
            </div>
            <button type="button" onClick={showNextPreview} disabled={!hasNextPreview} aria-label="Next" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-30">
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
