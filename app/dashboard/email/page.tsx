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
  RefreshCw,
  Send,
  Trash2,
  Twitter,
  X,
} from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import type { EmailTemplateRecord } from "@/lib/email-templates-store"
import { deleteEmailList, getEmailLists, saveEmailList, type EmailContactList } from "@/lib/email-lists"
import { deleteEmailDraft, getEmailDrafts, saveEmailDraft, type EmailDraftRecord } from "@/lib/email-drafts"
import { getAllEmailMessages, getEmailMessages, saveEmailMessage, updateEmailMessageStatus, type EmailMessageRecord, type EmailRecipient } from "@/lib/email-messages"
import { contextualEmailBody, readEmailComposeContext, type EmailComposeContext } from "@/lib/email-composer"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { deleteEmailTemplate, getEmailTemplates, saveEmailTemplate } from "@/lib/email-templates-store"
import { markdownToHtml } from "@/lib/markdown"
import { getUsers } from "@/lib/users"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

type EmailTab = "inbox" | "templates" | "messages" | "lists"
type EmailMessageKind = "transactional" | "marketing"

type EmailTemplate = Omit<EmailTemplateRecord, "companyId" | "createdBy">

type SentMessage = Omit<EmailMessageRecord, "companyId" | "createdBy"> & { companyId?: string }

type ReceivedMessage = {
  id: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  createdAt: string | null
  messageId?: string | null
  html?: string | null
  text?: string | null
  headers?: Record<string, string> | null
  attachments?: Array<Record<string, unknown>>
}

type EmailContact = {
  email: string
  label: string
  name: string
  companyId?: string
}

type ContactList = Omit<EmailContactList, "companyId" | "createdBy">

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

const RECEIVED_SORTS: SortOption<ReceivedMessage>[] = [
  { value: "createdAt", label: "Received", get: (message) => message.createdAt || "", ascLabel: "Oldest", descLabel: "Newest" },
  { value: "from", label: "Sender", get: (message) => message.from, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "subject", label: "Subject", get: (message) => message.subject, ascLabel: "A–Z", descLabel: "Z–A" },
]

function searchMessage(message: SentMessage) {
  return [message.to, message.subject, message.companyName, message.projectName, message.documentTitle, message.documentType, message.from, message.status]
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

function formatTemplateDate(value: string) {
  try {
    const date = new Date(value)
    const now = new Date()
    const dayStart = (input: Date) => new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime()
    const daysAgo = Math.round((dayStart(now) - dayStart(date)) / 86_400_000)

    if (daysAgo === 0) return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)
    if (daysAgo === 1) return "Yesterday"
    if (daysAgo > 1 && daysAgo < 7) return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date)
    return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" }).format(date)
  } catch {
    return "Unknown date"
  }
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

function escapeHtmlAttribute(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string)
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string)
}

function sentMessagePreview(message: SentMessage) {
  const content = message.bodyHtml || `<p>${escapeHtml(message.bodyText || "").replaceAll("\n", "<br />")}</p>`
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{box-sizing:border-box;margin:0;padding:24px;color:#20232d;background:#fff;font:15px/1.65 Arial,sans-serif;overflow-wrap:anywhere}img{display:block;max-width:100%;height:auto}p{margin:0 0 1em}ul,ol{padding-left:1.5rem}a{color:#1649d8}</style></head><body>${content}</body></html>`
}

function receivedMessagePreview(message: ReceivedMessage) {
  const content = message.html || `<p>${escapeHtml(message.text || "(This message has no text content.)").replaceAll("\n", "<br />")}</p>`
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{box-sizing:border-box;margin:0;padding:24px;color:#20232d;background:#fff;font:15px/1.65 Arial,sans-serif;overflow-wrap:anywhere}img{display:block;max-width:100%;height:auto}p{margin:0 0 1em}ul,ol{padding-left:1.5rem}a{color:#1649d8}</style></head><body>${content}</body></html>`
}

function templatePreview(template: EmailTemplate) {
  // The CTA now lives inside the body HTML, so the preview is just the body.
  const content = withMessageImage(template.body, template.imageUrl, template.imageAlt)
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{box-sizing:border-box;margin:0 auto;max-width:640px;padding:32px 28px;color:#20232d;background:#fff;font:15px/1.65 Arial,sans-serif;overflow-wrap:anywhere}img{display:block;max-width:100%;height:auto}p{margin:0 0 1em}ul,ol{padding-left:1.5rem}a{color:#1649d8}</style></head><body>${content}</body></html>`
}

function withMessageImage(value: string, imageUrl?: string, imageAlt?: string) {
  const content = formatTemplateBody(value)
  if (!imageUrl) return content
  const existingImage = content.match(/<img[^>]*>/i)?.[0]
  const withoutImage = existingImage ? content.replace(existingImage, "").replaceAll("<p></p>", "") : content
  const image = `<p><img src="${escapeHtmlAttribute(imageUrl)}" alt="${escapeHtmlAttribute(imageAlt || "Message image")}" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:12px;" /></p>`
  return `${image}${withoutImage}`
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

function formatTemplateBody(value: string) {
  const content = value.includes("<") ? value : markdownToHtml(value)
  return content.replace(/Best regards,\s*VisualCNS Team/gi, "Best regards,<br />VisualCNS Team")
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
  const [composeMinimized, setComposeMinimized] = useState(false)
  const [selectedSentId, setSelectedSentId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [messages, setMessages] = useState<SentMessage[]>([])
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([])
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

  const [preview, setPreview] = useState<{ kind: "template" | "message"; id: string } | null>(null)
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
  const { results: visibleReceivedMessages, bar: receivedFilterBar } = useFilterBar({
    items: receivedMessages,
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

  // The lightbox steps through whichever list is on screen (templates, or sent
  // messages) so back and forth respect the current search and sort.
  const previewList: { id: string }[] = preview?.kind === "message" ? visibleMessages : visibleTemplates
  const previewIndex = preview ? previewList.findIndex((item) => item.id === preview.id) : -1
  const previewTemplate = preview?.kind === "template" && previewIndex >= 0 ? visibleTemplates[previewIndex] : null
  const previewMessage = preview?.kind === "message" && previewIndex >= 0 ? visibleMessages[previewIndex] : null
  const hasPrevPreview = previewIndex > 0
  const hasNextPreview = previewIndex >= 0 && previewIndex < previewList.length - 1
  const showPrevPreview = () => { if (preview && hasPrevPreview) setPreview({ kind: preview.kind, id: previewList[previewIndex - 1].id }) }
  const showNextPreview = () => { if (preview && hasNextPreview) setPreview({ kind: preview.kind, id: previewList[previewIndex + 1].id }) }

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

  // Keep a valid selection in the Sent reading pane.
  useEffect(() => {
    if (tab !== "messages") return
    setSelectedSentId((current) => current && visibleMessages.some((m) => m.id === current) ? current : visibleMessages[0]?.id ?? null)
  }, [tab, messages])

  // Settle any scheduled send whose time has passed so it stops reading
  // "Scheduled" everywhere (list, reader, and the stored record).
  useEffect(() => {
    messages.filter(isScheduledPastDue).forEach((message) => void reconcileScheduled(message))
  }, [messages])

  // A new item remounts the iframe, so drop the old measured height until the
  // new one reports its own on load, and clear any error from the last message.
  useEffect(() => { setPreviewHeight(null); setMessageViewError("") }, [preview?.id])

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
    const kind = preview.kind
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null)
      if (event.key === "ArrowLeft" && previewIndex > 0) setPreview({ kind, id: previewList[previewIndex - 1].id })
      if (event.key === "ArrowRight" && previewIndex < previewList.length - 1) setPreview({ kind, id: previewList[previewIndex + 1].id })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [previewIndex, previewList, preview])

  // Whichever message the lightbox lands on (opened or stepped to) pulls its
  // body in if we don't already hold it.
  useEffect(() => {
    if (preview?.kind !== "message") return
    const message = messages.find((item) => item.id === preview.id)
    if (message) void hydrateMessageBody(message)
  }, [preview, messages])
  const { results: visibleLists, bar: listFilterBar } = useFilterBar({
    items: lists,
    search: searchList,
    sorts: LIST_SORTS,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })

  const activeFilterBar = tab === "inbox"
    ? receivedFilterBar
    : tab === "messages"
      ? messageFilterBar
      : tab === "templates"
        ? templateFilterBar
        : listFilterBar
  const EMAIL_FOLDERS: { key: EmailTab; label: string; icon: typeof Inbox; count: () => number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, count: () => receivedMessages.length },
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
      setSelectedReceivedId((current) => current && result.data?.some((message) => message.id === current) ? current : result.data?.[0]?.id || null)
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
    <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-visible px-3 pt-3 pb-5 sm:px-6 sm:pt-4 sm:pb-6 lg:h-[calc(100svh-3.5rem)] lg:max-h-[calc(100svh-3.5rem)] lg:flex-none lg:flex-row lg:gap-6 lg:overflow-hidden">
      {/* Gmail-style folder rail */}
      <nav className="hidden shrink-0 lg:flex lg:w-52 lg:flex-col" aria-label="Email folders">
        <Button type="button" className="mb-3 justify-start gap-2 rounded-full px-4 shadow-sm" onClick={() => openCompose(true)}>
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

      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        <FilterBar
          {...activeFilterBar}
          className="mb-2"
          placeholder={tab === "inbox" ? "Search inbox" : tab === "messages" ? "Search sent" : tab === "templates" ? "Search templates" : "Search lists"}
          searchClassName={tab === "messages" || tab === "inbox" ? "sm:max-w-[16rem]" : undefined}
          actions={
            <Button type="button" className="lg:hidden" onClick={() => openCompose(true)}>
              <Plus aria-hidden="true" />Compose
            </Button>
          }
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

        {tab === "inbox" && (
          <section className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6 lg:overflow-hidden" role="tabpanel">
            <aside className="min-h-0 shrink-0 overflow-hidden rounded-[14px] border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-3 sm:px-4 sm:py-3.5">
                <div className="flex min-w-0 items-center gap-2">
                  <Inbox className="size-4 text-muted-foreground" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">Inbox</h2>
                  <span className="text-xs tabular-nums text-muted-foreground">{receivedMessages.length}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => void loadReceivedMessages()}
                  disabled={receivedLoading}
                  aria-label="Refresh inbox"
                >
                  <RefreshCw className={cn("size-4", receivedLoading && "animate-spin")} aria-hidden="true" />
                </Button>
              </div>
              {receivedError && (
                <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-xs leading-5 text-destructive">
                  {receivedError}
                </div>
              )}
              {receivedLoading && receivedMessages.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" aria-hidden="true" />
                  <p className="mt-3">Loading inbox…</p>
                </div>
              ) : receivedMessages.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Inbox className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium">No received messages</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Messages sent to your Resend receiving address will appear here.</p>
                </div>
              ) : visibleReceivedMessages.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">No messages match your search.</div>
              ) : (
                <div className="divide-y divide-border">
                  {visibleReceivedMessages.map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => previewReceivedMessageById(message)}
                      className={cn(
                        "block w-full px-3.5 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-4",
                        selectedReceivedId === message.id && "bg-muted",
                      )}
                      aria-label={`Open received email: ${message.subject}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className={cn("size-10", contactAvatarTone(message.from))}>
                          <AvatarFallback className="bg-transparent text-sm font-medium">
                            {contactInitials(message.from, message.from)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-xs font-medium">{message.from}</span>
                            {message.createdAt && (
                              <time dateTime={message.createdAt} className="max-w-[42%] shrink-0 truncate text-right text-[11px] text-muted-foreground">
                                {formatMessageDate(message.createdAt)}
                              </time>
                            )}
                          </div>
                          <p className="truncate text-sm !font-bold">{message.subject}</p>
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                            <Mail className="size-3" aria-hidden="true" />Received
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-border bg-card">
              {selectedReceived ? (
                <>
                  <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">{selectedReceived.subject}</h2>
                        <p className="mt-1 truncate text-sm text-muted-foreground">From {selectedReceived.from}</p>
                        <p className="truncate text-xs text-muted-foreground">To {selectedReceived.to.join(", ") || "hello@mail.visualcns.com"}</p>
                      </div>
                      {selectedReceived.createdAt && (
                        <time dateTime={selectedReceived.createdAt} className="shrink-0 text-right text-xs text-muted-foreground">
                          {formatMessageDate(selectedReceived.createdAt)}
                        </time>
                      )}
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden bg-white">
                    {loadingReceivedId === selectedReceived.id ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />Loading message…
                      </div>
                    ) : (
                      <iframe
                        title={`Received email: ${selectedReceived.subject}`}
                        srcDoc={receivedMessagePreview(selectedReceived)}
                        sandbox=""
                        className="h-full min-h-[24rem] w-full border-0"
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[24rem] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Select a message to read it.
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "messages" && (
          <section className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6 lg:overflow-hidden" role="tabpanel">
            <aside className={cn(
              "min-h-0 shrink-0 overflow-hidden rounded-[14px] border border-border bg-card",
              mobileMessageView === "list" || !isMobile ? "block" : "hidden",
            )}>
              <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-3 sm:px-4 sm:py-3.5">
                <div className="flex min-w-0 items-center gap-2">
                  <Send className="size-4 text-muted-foreground" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">Sent</h2>
                  <span className="text-xs tabular-nums text-muted-foreground">{messages.length}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 lg:hidden" onClick={() => openCompose(true)}>
                  <Plus aria-hidden="true" />Compose
                </Button>
              </div>
              {drafts.length > 0 && (
                <div className="border-b border-border">
                  <div className="px-3.5 py-2 text-xs font-medium text-muted-foreground sm:px-4">Drafts</div>
                  <div className="divide-y divide-border">
                    {drafts.map((draft) => (
                      <div key={draft.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => loadDraft(draft)}
                          className={cn(
                            "block w-full px-3.5 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-4",
                            editingDraftId === draft.id && "bg-muted",
                          )}
                          aria-label={`Open draft email: ${draft.subject?.trim() || "No subject"}`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className={cn("size-10", contactAvatarTone(draft.to || "Contact list"))}>
                              <AvatarFallback className="bg-transparent text-sm font-medium">
                                {contactInitials(draft.to || (draft.listId ? "Contact list" : "No recipient"), draft.to || "Contact list")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="min-w-0 truncate text-xs font-medium">
                                  {draft.to || (draft.listId ? "Contact list" : "No recipient selected")}
                                </span>
                                <time dateTime={draft.updatedAt} className="max-w-[42%] shrink-0 truncate text-right text-[11px] text-muted-foreground">
                                  {formatMessageDate(draft.updatedAt)}
                                </time>
                              </div>
                              <p className="truncate text-sm !font-bold">{draft.subject?.trim() || "(No subject)"}</p>
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                                <FileText className="size-3" aria-hidden="true" />Draft
                              </span>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeDraft(draft.id)}
                          aria-label="Delete draft"
                          className="absolute bottom-2.5 right-2 flex size-8 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Inbox className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium">No sent messages</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Your sent emails will appear here.</p>
                </div>
              ) : visibleMessages.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No messages match your search.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {visibleMessages.map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => openSentMessage(message)}
                      className={cn(
                        "block w-full px-3.5 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-4",
                        selectedSentId === message.id && "bg-muted",
                      )}
                      aria-label={`Open sent email: ${message.subject}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className={cn("size-10", contactAvatarTone(message.to))}>
                          <AvatarFallback className="bg-transparent text-sm font-medium">
                            {contactInitials(message.recipients?.[0]?.name || message.to, message.recipients?.[0]?.email || message.to)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-xs font-medium">{message.to}</span>
                            <time dateTime={message.createdAt} className="max-w-[42%] shrink-0 truncate text-right text-[11px] text-muted-foreground">
                              {formatMessageDate(message.createdAt)}
                            </time>
                          </div>
                          <p className="truncate text-sm !font-bold">{message.subject}</p>
                          {message.status === "scheduled" && !isScheduledPastDue(message) ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                              <Clock className="size-3" aria-hidden="true" />
                              {message.scheduledAt ? `Scheduled · ${formatMessageDate(message.scheduledAt)}` : "Scheduled"}
                            </span>
                          ) : message.status === "failed" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
                              <X className="size-3" aria-hidden="true" />Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="size-3" aria-hidden="true" />Sent
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <div className={cn(
              "min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-border bg-card lg:flex",
              mobileMessageView === "reader" || !isMobile ? "flex" : "hidden",
            )}>
              {selectedSent ? (
                <>
                  <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5">
                    <div className="mb-2 flex items-center gap-2 lg:hidden">
                      <Button type="button" variant="ghost" size="icon" className="-ml-2 size-8" onClick={() => setMobileMessageView("list")} aria-label="Back to sent">
                        <ArrowLeft aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold">{selectedSent.subject}</h2>
                        <p className="mt-1 truncate text-sm text-muted-foreground">To {selectedSent.to}</p>
                        {selectedSent.from && <p className="truncate text-xs text-muted-foreground">From {cleanSenderDisplay(selectedSent.from)}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                        <time dateTime={selectedSent.createdAt} className="text-xs text-muted-foreground">{formatMessageDate(selectedSent.createdAt)}</time>
                        {selectedSent.status === "scheduled" && !isScheduledPastDue(selectedSent) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300"><Clock className="size-3" aria-hidden="true" />{selectedSent.scheduledAt ? `Scheduled · ${formatMessageDate(selectedSent.scheduledAt)}` : "Scheduled"}</span>
                        ) : selectedSent.status === "failed" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-destructive"><X className="size-3" aria-hidden="true" />Failed</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-3" aria-hidden="true" />Sent</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden bg-white">
                    {loadingMessageId === selectedSent.id ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />Loading message…</div>
                    ) : messageViewError ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                        <p className="text-sm font-medium text-destructive">Couldn’t load this email</p>
                        <p className="text-xs leading-5 text-muted-foreground">{messageViewError}</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => void hydrateMessageBody(selectedSent)}>Try again</Button>
                      </div>
                    ) : !selectedSent.bodyHtml && !selectedSent.bodyText ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
                        <Mail className="size-5" aria-hidden="true" />
                        <p className="text-sm font-medium text-foreground">Message body unavailable</p>
                        <p className="text-xs leading-5">This email was sent before previews were saved.</p>
                      </div>
                    ) : (
                      <iframe
                        title={`Sent email: ${selectedSent.subject}`}
                        srcDoc={sentMessagePreview(selectedSent)}
                        sandbox=""
                        className="h-full min-h-[24rem] w-full border-0"
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[24rem] items-center justify-center px-6 text-center text-sm text-muted-foreground">Select a message to read it.</div>
              )}
            </div>
          </section>
        )}

        {tab === "lists" && (
          <section className="grid min-h-0 flex-1 gap-4 overflow-visible pt-2 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden" role="tabpanel">
            <div className="min-h-0 overflow-visible rounded-[14px] border border-border bg-card lg:overflow-y-auto">
              <div className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-3 sm:px-4 sm:py-3.5">
                <h2 className="text-sm font-semibold">Contact lists <span className="font-normal tabular-nums text-muted-foreground">({lists.length})</span></h2>
                <Button type="button" variant="ghost" size="icon" onClick={resetListEditor} aria-label="New contact list" title="New contact list">
                  <Plus aria-hidden="true" />
                </Button>
              </div>
              {visibleLists.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <List className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium">No lists yet</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Create a list to group contacts for sending.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {visibleLists.map((list) => (
                    <div key={list.id} className={cn("flex items-start gap-2 px-3.5 py-3", editingListId === list.id && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                      <Avatar className={cn("size-10 shrink-0", contactAvatarTone(list.name), editingListId === list.id && "bg-sidebar-accent-foreground/10 text-sidebar-accent-foreground")} aria-hidden="true">
                        <AvatarFallback className="bg-transparent text-sm font-medium">
                          {contactInitials(list.name, list.name)}
                        </AvatarFallback>
                      </Avatar>
                      <button type="button" onClick={() => editList(list)} className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="block truncate text-sm font-medium">{list.name}</span>
                        <span className={cn("mt-1 block text-xs text-muted-foreground", editingListId === list.id && "text-sidebar-accent-foreground/70")}>{list.contactEmails.length} contact{list.contactEmails.length === 1 ? "" : "s"}</span>
                      </button>
                      <button type="button" onClick={() => deleteList(list.id)} aria-label={`Delete ${list.name}`} className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring">
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={saveList} className="min-h-0 rounded-[14px] border border-border bg-card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{editingListId ? "Edit list" : "New list"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Choose the contacts you want to group together.</p>
                </div>
                {editingListId && <Button type="button" variant="ghost" size="sm" onClick={resetListEditor}>New</Button>}
              </div>

              <div className="mt-4 space-y-4">
                <Input value={listName} onChange={(event) => setListName(event.target.value)} maxLength={80} placeholder="List name" aria-label="List name" required />
                <div className="rounded-md border border-border">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">Contacts</span>
                    <button
                      type="button"
                      onClick={() => setListShowSelectedOnly((value) => !value)}
                      className={cn("text-xs font-medium outline-none transition-colors hover:text-foreground", listShowSelectedOnly ? "text-foreground" : "text-muted-foreground")}
                      aria-pressed={listShowSelectedOnly}
                    >
                      {listShowSelectedOnly ? "Show all" : `In list (${listContactEmails.length})`}
                    </button>
                  </div>
                  {contacts.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">No client contacts available.</p>
                  ) : (
                    <>
                      <div className="border-b border-border p-2">
                        <Input
                          value={listContactQuery}
                          onChange={(event) => setListContactQuery(event.target.value)}
                          placeholder="Search contacts"
                          aria-label="Search contacts"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {visibleListContacts.length === 0 ? (
                          <p className="px-3 py-4 text-sm text-muted-foreground">
                            {listShowSelectedOnly ? "No contacts in this list yet." : "No contacts match your search."}
                          </p>
                        ) : (
                          visibleListContacts.map((contact) => (
                            <label key={contact.email} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                              <input
                                type="checkbox"
                                checked={listContactEmails.includes(contact.email)}
                                onChange={(event) => setListContactEmails((current) => event.target.checked ? [...current, contact.email] : current.filter((email) => email !== contact.email))}
                                className="size-4 accent-primary"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{contact.name}</span>
                                <span className="block truncate text-xs text-muted-foreground">{contact.email}</span>
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 z-10 mt-5 -mx-4 -mb-4 flex shrink-0 flex-col gap-3 border-t border-border bg-card px-4 pt-3 pb-4 sm:-mx-5 sm:-mb-5 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:static lg:mx-0 lg:mb-0 lg:bg-transparent lg:px-0 lg:pt-4">
                <div aria-live="polite" className="min-h-5 text-sm">
                  {listNotice && <span className={listNotice.tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>{listNotice.text}</span>}
                </div>
                <Button type="submit">{editingListId ? "Save changes" : "Create list"}</Button>
              </div>
            </form>
          </section>
        )}

        {tab === "templates" && (
          <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-visible pt-2 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden" role="tabpanel">
            <form
              onSubmit={saveTemplate}
              className={cn(
                "order-2 flex-none flex-col lg:order-2 lg:min-h-0 lg:flex-1",
                mobileTemplateView === "editor" || !isMobile ? "flex" : "hidden",
              )}
            >
              <div className="mb-1 flex items-center gap-2 lg:hidden">
                <Button type="button" variant="ghost" size="icon" onClick={() => setMobileTemplateView("list")} aria-label="Back to templates">
                  <ArrowLeft aria-hidden="true" />
                </Button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{editingTemplateId ? "Edit" : "New template"}</p>
                </div>
              </div>

              <div className="flex flex-none flex-col gap-3 lg:min-h-0 lg:flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Input id="template-name" aria-label="Template name" value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={80} placeholder="Template name" required />
                  </div>
                  <div className="space-y-2">
                    <Input id="template-subject" aria-label="Subject" value={templateSubject} onChange={(event) => setTemplateSubject(event.target.value)} maxLength={200} placeholder="Subject" required />
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-2">
                  <RichTextEditor
                    value={templateBody}
                    onChange={setTemplateBody}
                    placeholder="Write the reusable message"
                    scrollable
                    allowHtml
                    className="min-h-64 lg:min-h-0 lg:flex-1"
                    contentHeader={(
                      <div className="bg-white px-4 py-5 sm:px-6">
                        <img
                          src="/visualcns-email-logo.png"
                          alt={businessProfile?.name || "VisualCNS"}
                          className="h-auto w-56 max-w-full object-contain object-left"
                        />
                      </div>
                    )}
                    contentFooter={(
                      <>
                        <div className="flex items-start justify-between gap-4 border-t border-border bg-neutral-50 px-4 py-4 text-xs leading-5 text-neutral-500 sm:px-6">
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-neutral-700">{businessProfile?.name || "VisualCNS"}</p>
                            <p>{businessProfile?.address || "Lagos, Nigeria"}</p>
                            <a href={businessProfile?.website?.startsWith("http") ? businessProfile.website : `https://${businessProfile?.website || "visualcns.com"}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                              {businessProfile?.website || "visualcns.com"}
                            </a>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 pt-0.5">
                            <a href="https://x.com/visualcns" target="_blank" rel="noreferrer" aria-label="VisualCNS on X" className="text-neutral-700 hover:text-neutral-950">
                              <Twitter className="size-3.5" aria-hidden="true" />
                            </a>
                            <a href="https://www.linkedin.com/company/visualng" target="_blank" rel="noreferrer" aria-label="VisualCNS on LinkedIn" className="text-neutral-700 hover:text-neutral-950">
                              <Linkedin className="size-3.5" aria-hidden="true" />
                            </a>
                          </div>
                        </div>
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="sticky bottom-0 z-10 mt-5 flex shrink-0 flex-col gap-3 border-t border-border bg-background pt-3 pb-4 sm:flex-row sm:items-center sm:justify-between lg:static lg:bg-transparent lg:pt-4 lg:pb-0">
                <div aria-live="polite" className="min-h-5 text-sm">
                  {templateNotice && (
                    <span className={templateNotice.tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>
                      {templateNotice.text}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={useEditingTemplate} disabled={!editingTemplateId}>
                    Use template
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </div>
            </form>

            <div className={cn(
              "order-1 min-h-0 overflow-visible pr-1 lg:order-1 lg:overflow-y-auto",
              mobileTemplateView === "list" || !isMobile ? "block" : "hidden",
            )}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Saved templates <span className="text-sm font-normal tabular-nums text-muted-foreground">({templates.length})</span></h2>
                <div className="flex items-center gap-1">
                  {isAdmin && !templates.some((template) => template.id === "announce-insights") && (
                    <Button type="button" variant="outline" size="sm" onClick={addInsightsTemplate}>
                      Add Insights email
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" onClick={() => { resetTemplateEditor(); setMobileTemplateView("editor") }} aria-label="New template" title="New template">
                    <Plus aria-hidden="true" />
                  </Button>
                </div>
              </div>
              {templates.length === 0 ? (
                <div className="mt-3 rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
                  <FileText className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium">No templates yet</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Save the first one using the editor.</p>
                </div>
              ) : visibleTemplates.length === 0 ? (
                <div className="mt-3 rounded-[12px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No templates match your search.
                </div>
              ) : (
                <div className="mt-3">
                  {visibleTemplates.map((template) => (
                    <div key={template.id} className={cn("group flex items-start gap-2 rounded-md border-b border-border px-2.5 py-3.5 first:pt-3 last:border-b-0", editingTemplateId === template.id && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                      <Avatar className={cn("size-10", contactAvatarTone(template.name), editingTemplateId === template.id && "bg-sidebar-accent-foreground/10 text-sidebar-accent-foreground")} aria-hidden="true">
                        <AvatarFallback className="bg-transparent text-sm font-medium">
                          {contactInitials(template.name, template.subject)}
                        </AvatarFallback>
                      </Avatar>
                      <button type="button" onClick={() => { editTemplate(template); setMobileTemplateView("editor") }} className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="block truncate text-sm font-medium">{template.name}</span>
                        <span className={cn("mt-1 block truncate text-xs text-muted-foreground", editingTemplateId === template.id && "text-sidebar-accent-foreground/70")}>{template.subject}</span>
                      </button>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <time dateTime={template.updatedAt} className={cn("text-[11px] text-muted-foreground", editingTemplateId === template.id && "text-sidebar-accent-foreground/70")}>{formatTemplateDate(template.updatedAt)}</time>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setPreview({ kind: "template", id: template.id })} aria-label={`Preview ${template.name}`} className="flex size-8 items-center justify-center rounded-sm text-muted-foreground opacity-70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                            <Eye className="size-4" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => deleteTemplate(template.id)} aria-label={`Delete ${template.name}`} className="flex size-8 items-center justify-center rounded-sm text-muted-foreground opacity-70 outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

      </div>

      {/* Docked compose window (Gmail-style) */}
      {composeOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end">
          <div className={cn(
            "flex w-full flex-col overflow-hidden border border-border bg-card shadow-2xl sm:w-[512px] sm:max-w-[calc(100vw-3rem)] sm:rounded-t-xl",
            composeMinimized ? "h-auto" : "h-[85svh] sm:h-[560px] sm:max-h-[calc(100svh-2rem)]",
          )}>
            <div className="flex shrink-0 items-center justify-between gap-2 bg-neutral-800 px-4 py-2 text-white dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => setComposeMinimized((value) => !value)}
                className="min-w-0 flex-1 truncate text-left text-sm font-medium outline-none"
                title={composeMinimized ? "Expand" : "Minimize"}
              >
                {subject.trim() || "New message"}
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => setComposeMinimized((value) => !value)} aria-label={composeMinimized ? "Expand" : "Minimize"} className="flex size-7 items-center justify-center rounded text-white/80 outline-none transition-colors hover:bg-white/15 hover:text-white">
                  <ChevronDown className={cn("size-4 transition-transform", composeMinimized && "rotate-180")} aria-hidden="true" />
                </button>
                <button type="button" onClick={closeCompose} aria-label="Close" className="flex size-7 items-center justify-center rounded text-white/80 outline-none transition-colors hover:bg-white/15 hover:text-white">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {!composeMinimized && (
              <form autoComplete="off" onSubmit={sendEmail} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_9rem] items-center border-b border-border">
                  <div className="flex min-w-0 items-center gap-2 px-4 py-2">
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">From</span>
                    <p className="min-w-0 truncate text-sm">{cleanSenderDisplay(senderAddress || (showOpsDetail ? "Not configured" : "Not available yet"))}</p>
                  </div>
                  <div className="px-3 py-1">
                    <Select value={messageKind} onValueChange={(value) => setMessageKind(value as EmailMessageKind)}>
                      <SelectTrigger aria-label="Message type" className="h-7 w-full border-0 bg-transparent px-1 text-xs shadow-none hover:bg-transparent data-[state=open]:bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transactional">Service message</SelectItem>
                        <SelectItem value="marketing">Marketing email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-border px-4 py-2.5">
                  <Popover
                    open={contactPickerOpen}
                    onOpenChange={(open) => {
                      setContactPickerOpen(open)
                      if (!open) setContactQuery("")
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        id="email-to"
                        type="button"
                        role="combobox"
                        aria-expanded={contactPickerOpen}
                        aria-label="Select contact"
                        disabled={Boolean(selectedListId)}
                        className="flex h-8 w-full min-w-0 items-center gap-2 border-b border-input bg-transparent px-0 text-left text-sm outline-none transition-[border-color] hover:border-muted-foreground focus-visible:border-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {selectedContact?.name || (selectedList ? `Sending to ${selectedList.contactEmails.length} contacts` : "To")}
                        </span>
                        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0">
                      <Command>
                        <CommandInput autoFocus placeholder="Search contacts" value={contactQuery} onValueChange={setContactQuery} />
                        <CommandList>
                          <CommandEmpty className="px-3 py-6 text-center text-sm text-muted-foreground">No matching contacts.</CommandEmpty>
                          <CommandGroup>
                            {visibleContactOptions.map((contact) => {
                              const isSelected = recipientEmail(contact.email) === recipientEmail(to)
                              return (
                                <CommandItem
                                  key={contact.email}
                                  value={`${contact.name} ${contact.email}`}
                                  onSelect={() => {
                                    handleRecipientChange(contact.email)
                                    setContactPickerOpen(false)
                                    setContactQuery("")
                                  }}
                                  className="items-center gap-3 px-3 py-2.5"
                                >
                                  <Avatar className={cn("size-10", contactAvatarTone(contact.name || contact.email))}>
                                    <AvatarFallback className="bg-transparent text-sm font-medium">{contactInitials(contact.name, contact.email)}</AvatarFallback>
                                  </Avatar>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-foreground">{contact.name || "Unnamed contact"}</span>
                                    <span className="block truncate text-xs text-muted-foreground">{contact.email}</span>
                                  </span>
                                  <Check className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Select
                    value={selectedListId || "none"}
                    onValueChange={(value) => {
                      setSelectedListId(value === "none" ? "" : value)
                      if (value !== "none") setTo("")
                    }}
                  >
                    <SelectTrigger aria-label="Contact list" className="h-8">
                      <SelectValue placeholder="Select list" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No list</SelectItem>
                      {[...lists].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((list) => (
                        <SelectItem key={list.id} value={list.id}>{list.name} ({list.contactEmails.length})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="shrink-0 border-b border-border px-4 py-1.5">
                  <Input
                    id="email-subject"
                    name="message-subject"
                    aria-label="Subject"
                    autoComplete="off"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    maxLength={200}
                    placeholder="Subject"
                    className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
                    required
                  />
                </div>
                {messageKind === "marketing" && (
                  <p className="shrink-0 border-b border-border px-4 py-1.5 text-xs leading-5 text-muted-foreground">Only subscribed contacts will receive this. An unsubscribe link is added automatically.</p>
                )}

                <div className="min-h-0 flex-1 overflow-hidden px-2 py-2">
                  <RichTextEditor
                    value={body}
                    onChange={setBody}
                    placeholder="Write your message"
                    scrollable
                    compact
                    flat
                    allowHtml
                    className="h-full min-h-0"
                  />
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
                  <div className="flex items-center gap-1">
                    <div className="inline-flex items-stretch">
                      <Button
                        type="submit"
                        className="rounded-r-none"
                        disabled={!senderConfigured || sending || (!selectedListId && !to.trim()) || (selectedListId && !selectedList?.contactEmails.length) || !subject.trim() || !htmlToText(body).trim() || (scheduleEnabled && !scheduleAt)}
                      >
                        {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : scheduleEnabled ? <Clock aria-hidden="true" /> : <Send aria-hidden="true" />}
                        {sending ? (scheduleEnabled ? "Scheduling" : "Sending") : scheduleEnabled ? "Schedule" : "Send"}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" aria-label="Choose send action" title="Choose send action" className="rounded-l-none border-l border-primary-foreground/25 px-2" disabled={sending}>
                            <ChevronDown aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {scheduleEnabled ? (
                            <DropdownMenuItem onSelect={() => { setScheduleEnabled(false); setScheduleAt("") }}>
                              <Send aria-hidden="true" />Send now
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => setScheduleEnabled(true)}>
                              <Clock aria-hidden="true" />Schedule
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {scheduleEnabled && (
                      <Input
                        type="datetime-local"
                        aria-label="Schedule date and time"
                        value={scheduleAt}
                        min={scheduleMin || undefined}
                        onChange={(event) => setScheduleAt(event.target.value)}
                        className="h-9 w-auto"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {draftStatus !== "idle" && (
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {draftStatus === "saving" || savingDraft ? "Saving…" : draftStatus === "saved" ? "Saved" : "Not saved"}
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="max-w-40 justify-start px-2">
                          <FileText aria-hidden="true" />
                          <span className="truncate">{selectedTemplate?.name || "Template"}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72">
                        <DropdownMenuItem onSelect={() => applyTemplate("")}>Start without a template</DropdownMenuItem>
                        {[...templates].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((template) => (
                          <DropdownMenuItem key={template.id} onSelect={() => applyTemplate(template.id)}>
                            <span className="truncate">{template.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button type="button" onClick={() => { if (editingDraftId) void removeDraft(editingDraftId); clearComposer(); closeCompose() }} aria-label="Discard draft" title="Discard" className="flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {sendNotice && sendNotice.tone === "error" && (
                  <div className="shrink-0 border-t border-border px-4 py-2 text-sm text-destructive" aria-live="polite">{sendNotice.text}</div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

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

      {(previewTemplate || previewMessage) && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview: ${previewMessage ? previewMessage.subject : previewTemplate?.name}`}
          onClick={() => setPreview(null)}
        >
          <div className="flex shrink-0 items-center gap-3 px-4 py-3 text-white sm:px-6" onClick={(event) => event.stopPropagation()}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{previewMessage ? previewMessage.subject : previewTemplate?.name}</p>
              <p className="truncate text-xs text-white/70">{previewMessage ? previewMessage.to : previewTemplate?.subject} · {previewIndex + 1} of {previewList.length}</p>
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
              {previewMessage && loadingMessageId === previewMessage.id ? (
                <div className="flex items-center gap-2 rounded-xl bg-white px-6 py-10 text-sm text-neutral-500 shadow-2xl">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading email
                </div>
              ) : previewMessage && messageViewError ? (
                <div className="max-w-sm rounded-xl bg-white px-6 py-10 text-center shadow-2xl">
                  <p className="text-sm font-medium text-destructive">Couldn’t load this email</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">{messageViewError}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void hydrateMessageBody(previewMessage)}>Try again</Button>
                </div>
              ) : previewMessage && !previewMessage.bodyHtml && !previewMessage.bodyText ? (
                <div className="max-w-sm rounded-xl bg-white px-6 py-10 text-center shadow-2xl">
                  <Mail className="mx-auto size-5 text-neutral-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-neutral-700">Message body unavailable</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">This email was sent before message previews were saved. New sent emails include their full content here.</p>
                </div>
              ) : (
                <div
                  className="relative overflow-hidden rounded-xl bg-white shadow-2xl"
                  style={{ width: PREVIEW_WIDTH * previewScale, height: (previewHeight ?? 0) * previewScale }}
                >
                  <iframe
                    key={preview?.id}
                    title={previewMessage ? `Email preview: ${previewMessage.subject}` : `Template preview: ${previewTemplate?.name}`}
                    sandbox="allow-same-origin"
                    scrolling="no"
                    srcDoc={previewMessage ? sentMessagePreview(previewMessage) : templatePreview(previewTemplate!)}
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
              )}
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
