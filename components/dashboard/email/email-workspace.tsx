"use client"

import { useEffect, useMemo, useRef, useState, type ComponentProps, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowDownUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronsUpDown,
  Clock,
  ChevronRight,
  Eye,
  FileText,
  Forward,
  Inbox,
  List,
  Linkedin,
  Mail,
  Plus,
  Reply,
  Search,
  Send,
  Trash2,
  Twitter,
  X,
} from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FilterBar, MOBILE_CREATE_BUTTON_CLASS, MobileSearchBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { deleteEmailList, getEmailLists, saveEmailList, type EmailContactList } from "@/lib/email-lists"
import { deleteEmailDraft, getEmailDrafts, setEmailDraftTrashed, type EmailDraftRecord } from "@/lib/email-drafts"
import { deleteEmailMessage, getAllEmailMessages, getEmailMessages, saveEmailMessage, setEmailMessageTrashed, updateEmailMessageStatus, type EmailMessageRecord } from "@/lib/email-messages"
import { getHiddenReceivedEmails, hideReceivedEmail, permanentlyHideReceivedEmail, restoreReceivedEmail, trashReceivedEmail, type HiddenReceivedEmail } from "@/lib/email-received-hidden"
import { EMAIL_INBOX_REFRESH_EVENT, publishUnreadEmailCount } from "@/components/dashboard/email/use-unread-email-count"
import { contextualEmailBody, plainTextToEditorHtml, readEmailComposeContext } from "@/lib/email-composer"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { deleteEmailTemplate, getEmailTemplates, saveEmailTemplate } from "@/lib/email-templates-store"
import { getUsers } from "@/lib/users"
import { TRIAL_DAYS } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { useSidebarTakeover } from "@/components/company/sidebar-takeover"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  cleanSenderDisplay,
  composedEmailPreview,
  contactAvatarTone,
  contactInitials,
  formatTemplateBody,
  htmlToText,
  receivedMessagePreview,
  recipientEmail,
  sentMessagePreview,
  templatePreview,
  withMessageImage,
} from "@/components/dashboard/email/email-preview"
import type {
  ContactList,
  EmailContact,
  EmailTab,
  EmailTemplate,
  ReceivedAttachment,
  ReceivedMessage,
  SentMessage,
} from "@/components/dashboard/email/types"
import { QuickEmailComposer } from "@/components/dashboard/email/quick-email-composer"
import { usePageHeaderSearch, useRecordTitle } from "@/components/dashboard/page-title-context"
import { EmailListPicker, EmailLists } from "@/components/dashboard/email/email-lists"
import { EmailMessageSurfaces } from "@/components/dashboard/email/email-message-surfaces"
import { EmailBin, type EmailBinItem } from "@/components/dashboard/email/email-bin"
import { EmailTemplates } from "@/components/dashboard/email/email-templates"

type ComposeStart = Omit<ComponentProps<typeof QuickEmailComposer>, "open" | "onOpenChange" | "onSent" | "onDraftSaved" | "onDraftTrashed">

type Notice = {
  tone: "success" | "error"
  text: string
} | null

function uniqueReceivedMessages(messages: ReceivedMessage[]) {
  return [...new Map(messages.map((message) => [message.id, message])).values()]
}

function messageIds(value: string | undefined) {
  return value?.match(/<[^>\s]+>/g) || []
}

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

const BIN_SORTS: SortOption<EmailBinItem>[] = [
  { value: "deletedAt", label: "Deleted", get: (item) => item.deletedAt, ascLabel: "Oldest", descLabel: "Newest" },
  { value: "subject", label: "Subject", get: (item) => item.subject, ascLabel: "A–Z", descLabel: "Z–A" },
]

function searchBinItem(item: EmailBinItem) {
  return [item.title, item.subject, item.kind]
}

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

/** A scheduled send whose time has passed—Resend has released it by now. */
function isScheduledPastDue(message: SentMessage) {
  return message.status === "scheduled" && !!message.scheduledAt && Date.parse(message.scheduledAt) <= Date.now()
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

export function EmailWorkspace({ initialTab, initialMessageId }: { initialTab: EmailTab; initialMessageId?: string }) {
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobile = useIsMobile()
  // An admin "viewing as" a client sees exactly what that client sees.
  const showOpsDetail = isAdmin && !isImpersonating
  const workspaceId = appUser?.companyId || user?.uid || "workspace"
  const templateStorageKey = `visualcns-email-templates:${workspaceId}`
  const messageStorageKey = `visualcns-email-messages:${workspaceId}`
  const listStorageKey = `visualcns-email-lists:${workspaceId}`
  const receivedReadStorageKey = `visualcns-email-received-read:${workspaceId}`

  const [tab, setTab] = useState<EmailTab>(initialTab)
  // What the composer opens with; null while it's closed. The key remounts it for each new message.
  const [compose, setCompose] = useState<ComposeStart | null>(null)
  const [composeKey, setComposeKey] = useState(0)
  const [openDraftId, setOpenDraftId] = useState<string | null>(null)
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false)
  const [selectedSentId, setSelectedSentId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [messages, setMessages] = useState<SentMessage[]>([])
  const [trashedMessages, setTrashedMessages] = useState<SentMessage[]>([])
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([])
  const [inboxSource, setInboxSource] = useState<"gmail" | "other">("other")
  const [hiddenReceivedIds, setHiddenReceivedIds] = useState<Set<string>>(new Set())
  const [trashedReceived, setTrashedReceived] = useState<HiddenReceivedEmail[]>([])
  const [readReceivedIds, setReadReceivedIds] = useState<Set<string>>(new Set())
  const [readStateHydrated, setReadStateHydrated] = useState(false)
  const [selectedReceivedIds, setSelectedReceivedIds] = useState<Set<string>>(new Set())
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set())
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set())
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set())
  // Templates and lists are only deleted after the person confirms.
  const [pendingDelete, setPendingDelete] = useState<{ kind: "template" | "list"; ids: string[] } | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [receivedLoading, setReceivedLoading] = useState(false)
  const [receivedError, setReceivedError] = useState("")
  const [receivedReconnectRequired, setReceivedReconnectRequired] = useState(false)
  const successfulInboxRefreshRef = useRef(0)
  const [selectedReceivedId, setSelectedReceivedId] = useState<string | null>(initialMessageId ?? null)

  const folderHref = (folder: EmailTab) => `/dashboard/email/${folder === "messages" ? "sent" : folder}`
  const openFolder = (folder: EmailTab) => {
    setTab(folder)
    setSelectedReceivedId(null)
    setMobileMessageView("list")
    router.push(folderHref(folder))
  }
  const messageHref = (message: ReceivedMessage) => `${folderHref(tab)}/${encodeURIComponent(message.id)}`

  // The URL decides the folder and open message, so Back and Forward move between them too.
  useEffect(() => {
    setTab(initialTab)
    setSelectedReceivedId(initialMessageId ?? null)
    setMobileMessageView(initialMessageId ? "reader" : "list")
  }, [initialMessageId, initialTab])
  const [loadingReceivedId, setLoadingReceivedId] = useState<string | null>(null)
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<EmailContact[]>([])
  const [lists, setLists] = useState<ContactList[]>([])
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)

  const [drafts, setDrafts] = useState<EmailDraftRecord[]>([])
  const [trashedDrafts, setTrashedDrafts] = useState<EmailDraftRecord[]>([])
  const [sendNotice, setSendNotice] = useState<Notice>(null)
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null)
  const [messageViewError, setMessageViewError] = useState("")
  const hydratingRef = useRef<Set<string>>(new Set())
  const inlinedReceivedRef = useRef<Set<string>>(new Set())
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
  const [mobileMessageView, setMobileMessageView] = useState<"list" | "reader">(initialMessageId ? "reader" : "list")
  const [mobileTemplateView, setMobileTemplateView] = useState<"list" | "editor">("list")
  const [listName, setListName] = useState("")
  const [listContactEmails, setListContactEmails] = useState<string[]>([])
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [listPickerOpen, setListPickerOpen] = useState(false)
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
  const inboxReceivedMessages = useMemo(
    () => receivedMessages.filter((message) => inboxSource === "gmail"
      ? message.id.startsWith("gmail:")
      : !hiddenReceivedIds.has(message.id)),
    [receivedMessages, hiddenReceivedIds, inboxSource],
  )
  const updateMessages = useMemo(
    () => inboxSource === "gmail" ? receivedMessages.filter((message) => message.id.startsWith("local:") && !hiddenReceivedIds.has(message.id)) : [],
    [receivedMessages, hiddenReceivedIds, inboxSource],
  )
  const activeReceivedMessages = tab === "updates" ? updateMessages : inboxReceivedMessages
  const isReceivedRead = (message: ReceivedMessage) => inboxSource === "gmail" && message.id.startsWith("gmail:")
    ? !message.unread
    : readReceivedIds.has(message.id)
  const unreadReceivedCount = inboxReceivedMessages.filter((message) => !isReceivedRead(message)).length
  const unreadUpdateCount = updateMessages.filter((message) => !readReceivedIds.has(message.id)).length
  const displayedReadIds = new Set(readReceivedIds)
  if (inboxSource === "gmail") {
    for (const message of inboxReceivedMessages) {
      if (message.unread) displayedReadIds.delete(message.id)
      else displayedReadIds.add(message.id)
    }
  }

  useEffect(() => {
    successfulInboxRefreshRef.current = 0
    setReceivedMessages([])
    setInboxSource("other")
    setReceivedError("")
  }, [workspaceId])

  useEffect(() => {
    if (user?.uid && readStateHydrated) publishUnreadEmailCount(workspaceId, unreadReceivedCount)
  }, [user?.uid, readStateHydrated, workspaceId, unreadReceivedCount])

  useEffect(() => {
    function onInboxRefresh(event: Event) {
      const detail = (event as CustomEvent<{ workspaceId: string; messages: ReceivedMessage[]; source?: string }>).detail
      if (detail?.workspaceId !== workspaceId) return
      successfulInboxRefreshRef.current += 1
      setReceivedError("")
      setInboxSource(detail.source === "gmail" ? "gmail" : "other")
      setReceivedMessages((current) => {
        const existing = new Map(current.map((message) => [message.id, message]))
        return uniqueReceivedMessages(detail.messages).map((message) => ({
          ...message,
          html: message.html ?? existing.get(message.id)?.html,
          text: message.text ?? existing.get(message.id)?.text,
        }))
      })
    }
    window.addEventListener(EMAIL_INBOX_REFRESH_EVENT, onInboxRefresh)
    return () => window.removeEventListener(EMAIL_INBOX_REFRESH_EVENT, onInboxRefresh)
  }, [workspaceId])

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
  const binItems: EmailBinItem[] = [
    ...trashedReceived.flatMap((entry): EmailBinItem[] => {
      const message = receivedMessages.find((item) => item.id === entry.receivedId) || entry.message
      if (!entry.trashedAt || !message) return []
      if (inboxSource === "gmail" && entry.receivedId.startsWith("gmail:") && inboxReceivedMessages.some((item) => item.id === entry.receivedId)) return []
      return [{ key: `received:${entry.receivedId}`, id: entry.receivedId, kind: "received", title: resolveName(message.from), subject: message.subject || "(No subject)", deletedAt: entry.trashedAt, previewHtml: message.html || message.text ? receivedMessagePreview(message) : null }]
    }),
    ...trashedDrafts.flatMap((draft): EmailBinItem[] => draft.trashedAt ? [{ key: `draft:${draft.id}`, id: draft.id, kind: "draft", title: draft.to ? resolveName(draft.to) : "No recipient", subject: draft.subject?.trim() || "(No subject)", deletedAt: draft.trashedAt, previewHtml: draft.body ? formatTemplateBody(draft.body) : null }] : []),
    ...trashedMessages.flatMap((message): EmailBinItem[] => message.trashedAt ? [{ key: `sent:${message.id}`, id: message.id, kind: "sent", title: resolveName(message.to, message.recipients?.[0]?.name), subject: message.subject || "(No subject)", deletedAt: message.trashedAt, previewHtml: message.bodyHtml || message.bodyText ? sentMessagePreview(message) : null }] : []),
  ].sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt))
  const { results: visibleBinItems, bar: binFilterBar } = useFilterBar({
    items: binItems,
    search: searchBinItem,
    sorts: BIN_SORTS,
    defaultSort: "deletedAt",
    defaultDirection: "desc",
  })
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

  // Clear the page toast a few seconds after it appears.
  useEffect(() => {
    if (!sendNotice) return
    const timer = window.setTimeout(() => setSendNotice(null), 6000)
    return () => window.clearTimeout(timer)
  }, [sendNotice])

  // Keep a user-selected message valid without opening the first message on
  // page load. Gmail lands on the list; the reader opens only after a click.
  useEffect(() => {
    if (tab !== "messages") return
    setSelectedSentId((current) => current && visibleMessages.some((m) => m.id === current) ? current : null)
  }, [tab, messages])

  // Ticked messages don't carry over between folders. The open message is left alone: openFolder
  // closes it, and on a message's own page it is the one in the URL.
  useEffect(() => {
    setSelectedReceivedIds(new Set())
  }, [tab])

  useEffect(() => {
    if (!user?.uid || !workspaceId) return
    setReadStateHydrated(false)
    try {
      const stored = JSON.parse(localStorage.getItem(receivedReadStorageKey) || "[]")
      setReadReceivedIds(new Set(Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : []))
    } catch {
      setReadReceivedIds(new Set())
    }
    setSelectedReceivedIds(new Set())
    setReadStateHydrated(true)
  }, [receivedReadStorageKey, user?.uid, workspaceId])

  useEffect(() => {
    if (!user?.uid || !workspaceId || !readStateHydrated) return
    localStorage.setItem(receivedReadStorageKey, JSON.stringify([...readReceivedIds]))
  }, [readReceivedIds, readStateHydrated, receivedReadStorageKey, user?.uid, workspaceId])

  useEffect(() => {
    const visibleIds = new Set(visibleReceivedMessages.map((message) => message.id))
    setSelectedReceivedIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [visibleReceivedMessages])

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

  const activeFilterBar = tab === "inbox" || tab === "updates"
    ? receivedFilterBar
    : tab === "drafts"
      ? draftFilterBar
    : tab === "messages"
      ? messageFilterBar
      : tab === "bin"
        ? binFilterBar
      : tab === "templates"
        ? templateFilterBar
        : listFilterBar
  const EMAIL_FOLDERS: { key: EmailTab; label: string; icon: typeof Inbox; count: () => number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, count: () => unreadReceivedCount },
    ...(inboxSource === "gmail" ? [{ key: "updates" as EmailTab, label: "Updates", icon: Mail, count: () => unreadUpdateCount }] : []),
    { key: "drafts", label: "Drafts", icon: FileText, count: () => drafts.length },
    { key: "messages", label: "Sent", icon: Send, count: () => messages.length },
    { key: "templates", label: "Templates", icon: FileText, count: () => templates.length },
    { key: "lists", label: "Lists", icon: List, count: () => lists.length },
    { key: "bin", label: "Bin", icon: Trash2, count: () => binItems.length },
  ]
  // The folders replace the dashboard sidebar links while Email is open; Back shows the main menu.
  const inSidebar = useSidebarTakeover({
    title: "Email",
    backLabel: "Back",
    items: EMAIL_FOLDERS.map((folder) => ({ key: folder.key, label: folder.label, icon: folder.icon, count: folder.count() })),
    active: tab,
    onSelect: (key) => openFolder(key as EmailTab),
  })
  const selectedReceived = activeReceivedMessages.find((message) => message.id === selectedReceivedId) || null
  const selectedSent = messages.find((message) => message.id === selectedSentId) || null
  useRecordTitle(
    tab === "inbox" || tab === "updates"
      ? selectedReceived ? selectedReceived.subject || "(No subject)" : null
      : tab === "messages"
        ? selectedSent ? selectedSent.subject || "(No subject)" : null
        : null,
  )

  async function loadReceivedMessages() {
    if (!user) return
    const successfulRefreshAtStart = successfulInboxRefreshRef.current
    setReceivedLoading(true)
    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/email/received", {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      })
      const result = (await response.json()) as { data?: ReceivedMessage[]; source?: string; error?: string; partial?: boolean; warning?: string; reconnectRequired?: boolean }
      if (!response.ok) throw new Error(result.error || "Received messages could not be loaded.")
      const data = Array.isArray(result.data) ? result.data : []
      setInboxSource(result.source === "gmail" ? "gmail" : "other")
      setReceivedReconnectRequired(Boolean(result.reconnectRequired))
      // Gmail didn't answer this time: keep the Gmail messages already on screen.
      setReceivedMessages((current) => result.partial
        ? [...new Map([...current.filter((message) => message.id.startsWith("gmail:")), ...data].map((message) => [message.id, message])).values()]
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        : uniqueReceivedMessages(data))
      if (result.partial) setReceivedError(result.warning || "Google inbox could not be loaded. Try again in a moment.")
      if (!result.partial) {
        successfulInboxRefreshRef.current += 1
        setReceivedError("")
        setSelectedReceivedId((current) => current && data.some((message) => message.id === current) ? current : null)
      }
    } catch (error) {
      if (successfulInboxRefreshRef.current === successfulRefreshAtStart) {
        setReceivedReconnectRequired(false)
        setReceivedError(error instanceof Error ? error.message : "Received messages could not be loaded.")
      }
    } finally {
      setReceivedLoading(false)
    }
  }

  async function downloadReceivedAttachment(message: ReceivedMessage, file: ReceivedAttachment) {
    if (!user) return
    setDownloadingAttachmentId(file.id)
    setReceivedError("")
    try {
      const idToken = await user.getIdToken()
      const params = new URLSearchParams({ id: message.id, attachment: file.id, filename: file.filename, type: file.contentType })
      const response = await fetch(`/api/email/received?${params}`, {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      })
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(result.error || "The attachment could not be downloaded.")
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement("a")
      link.href = url
      link.download = file.filename
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setReceivedError(error instanceof Error ? error.message : "The attachment could not be downloaded.")
    } finally {
      setDownloadingAttachmentId(null)
    }
  }

  function needsReceivedHydration(message: ReceivedMessage) {
    if (!message.html && !message.text) return true
    // Inline images arrive as cid: links; the single-message fetch swaps them for the image data.
    return Boolean(message.html?.includes("cid:")) && !inlinedReceivedRef.current.has(message.id)
  }

  async function hydrateReceivedMessage(message: ReceivedMessage) {
    if (!needsReceivedHydration(message) || !user) return
    inlinedReceivedRef.current.add(message.id)
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
      setTrashedReceived((current) => current.map((entry) => entry.receivedId === message.id ? {
        ...entry,
        message: { ...message, ...result, id: message.id, from: result.from || message.from, to: result.to || message.to, subject: result.subject || message.subject },
      } : entry))
    } catch (error) {
      setReceivedError(error instanceof Error ? error.message : "The received email could not be loaded.")
    } finally {
      setLoadingReceivedId(null)
    }
  }

  function previewReceivedMessageById(message: ReceivedMessage) {
    if (inboxSource === "gmail" && message.id.startsWith("gmail:") && message.unread) void changeReceivedGmailMessage(message.id, "read")
    setReadReceivedIds((current) => {
      if (current.has(message.id)) return current
      const next = new Set(current)
      next.add(message.id)
      return next
    })
    setSelectedReceivedId(message.id)
    setMobileMessageView("reader")
  }

  useEffect(() => {
    if (!selectedReceived || !needsReceivedHydration(selectedReceived)) return
    void hydrateReceivedMessage(selectedReceived)
  }, [selectedReceivedId, receivedMessages])

  useEffect(() => {
    if (!selectedSent) return
    void hydrateMessageBody(selectedSent)
  }, [selectedSentId, messages])

  useEffect(() => {
    if (!user?.uid || (tab !== "inbox" && tab !== "updates")) return
    void loadReceivedMessages()
  }, [tab, user?.uid])

  useEffect(() => {
    if (!user?.uid) return

    let active = true
    setMessages([])
    setTrashedMessages([])
    setLists([])

    void getEmailTemplates(workspaceId, showOpsDetail)
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
  }, [showOpsDetail, templateStorageKey, user?.uid, workspaceId])

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
        const allMessages = [...storedMessages, ...messagesToMigrate].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        setMessages(allMessages.filter((message) => !message.trashedAt))
        setTrashedMessages(allMessages.filter((message) => Boolean(message.trashedAt)))
        localStorage.removeItem(messageStorageKey)
      })
      .catch(() => {
        if (active) {
          setMessages(legacyMessages.filter((message) => !message.trashedAt))
          setTrashedMessages(legacyMessages.filter((message) => Boolean(message.trashedAt)))
        }
      })

    return () => {
      active = false
    }
  }, [messageStorageKey, showOpsDetail, user?.uid, workspaceId])

  useEffect(() => {
    if (!user?.uid || !workspaceId) return
    let active = true
    void getEmailDrafts(workspaceId, showOpsDetail)
      .then((storedDrafts) => { if (active) { setDrafts(storedDrafts.filter((draft) => !draft.trashedAt)); setTrashedDrafts(storedDrafts.filter((draft) => Boolean(draft.trashedAt))) } })
      .catch(() => { if (active) { setDrafts([]); setTrashedDrafts([]) } })
    return () => { active = false }
  }, [showOpsDetail, user?.uid, workspaceId])

  useEffect(() => {
    if (!user?.uid || !workspaceId) return
    let active = true
    void getHiddenReceivedEmails(workspaceId)
      .then((records) => { if (active) { setHiddenReceivedIds(new Set(records.map((record) => record.receivedId))); setTrashedReceived(records.filter((record) => Boolean(record.trashedAt))) } })
      .catch(() => { if (active) { setHiddenReceivedIds(new Set()); setTrashedReceived([]) } })
    return () => { active = false }
  }, [user?.uid, workspaceId])

  useEffect(() => {
    if (!user?.uid || !workspaceId) return
    let active = true
    const legacyLists = readStoredList<ContactList>(listStorageKey)

    void getEmailLists(workspaceId, showOpsDetail)
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
  }, [listStorageKey, showOpsDetail, user?.uid, workspaceId])

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
          .filter((contact) => contact.email?.trim())
          .map((contact) => ({
            // Lists store emails lowercased, so match that here or saved
            // members show as unticked when the list is reopened.
            email: contact.email.trim().toLowerCase(),
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
    openCompose({
      email: nextContext.recipientEmail || "",
      name: nextContext.recipientName,
      initialCc: nextContext.cc || "",
      initialSubject: nextContext.subject || "",
      // Messages written for a record are plain text; the editor needs paragraphs and real links.
      initialBody: plainTextToEditorHtml(nextContext.body || contextualEmailBody(nextContext)),
      initialMessageKind: nextContext.messageKind === "marketing" ? "marketing" : "transactional",
      // A message we write for them carries the link in its text, so it gets no button as well.
      context: nextContext.body ? nextContext : { ...nextContext, ctaText: undefined, ctaUrl: undefined },
    })
    // The request to compose is used once. Left in the URL, every refresh,
    // Back, or re-read of the URL would open the composer again.
    router.replace(folderHref(tab), { scroll: false })
  }, [router, searchParams])

  useEffect(() => {
    let active = true
    void getBusinessProfile().then((profile) => {
      if (active) setBusinessProfile(profile)
    })
    return () => {
      active = false
    }
  }, [])

  const visibleListContacts = useMemo(() => {
    const query = listContactQuery.trim().toLowerCase()
    return contacts.filter((contact) => {
      if (listShowSelectedOnly && !listContactEmails.includes(contact.email)) return false
      if (!query) return true
      return `${contact.name} ${contact.email}`.toLowerCase().includes(query)
    })
  }, [contacts, listContactQuery, listShowSelectedOnly, listContactEmails])

  /** Opens the composer with a fresh start; the key makes it begin again rather than reuse the last message. */
  function openCompose(start: ComposeStart = {}) {
    setMessageViewError("")
    setPreview(null)
    setOpenDraftId(start.draft?.id ?? null)
    setCompose(start)
    setComposeKey((key) => key + 1)
  }

  function composeReceivedMessage(message: ReceivedMessage, mode: "reply" | "forward") {
    const originalBody = (message.text || htmlToText(message.html || "")).trim()
    openCompose({
      email: mode === "reply" ? recipientEmail(message.from) : "",
      initialSubject: `${mode === "reply" ? "Re" : "Fwd"}: ${message.subject.replace(/^(re|fwd):\s*/i, "")}`,
      initialBody: plainTextToEditorHtml(originalBody ? `\n\n--- Original message ---\n${originalBody}` : ""),
      threading: mode === "reply" && message.messageId ? {
        threadId: message.threadId || undefined,
        inReplyTo: message.messageId,
        references: Array.from(new Set([...messageIds(message.headers?.references), message.messageId])),
      } : undefined,
    })
  }

  function loadDraft(draft: EmailDraftRecord) {
    openCompose({ draft })
  }

  /** Keeps the lists on this page in step with what the composer did. */
  function handleSent(message: SentMessage) {
    setMessages((current) => [message, ...current])
    if (openDraftId) setDrafts((current) => current.filter((item) => item.id !== openDraftId))
    setOpenDraftId(null)
  }

  function handleDraftSaved(draft: EmailDraftRecord) {
    setOpenDraftId(draft.id)
    setDrafts((current) => [draft, ...current.filter((item) => item.id !== draft.id)])
  }

  function handleDraftTrashed(draft: EmailDraftRecord) {
    const saved = drafts.find((item) => item.id === draft.id)
    setDrafts((current) => current.filter((item) => item.id !== draft.id))
    setTrashedDrafts((current) => [{ ...(saved || draft), trashedAt: draft.trashedAt }, ...current])
    setOpenDraftId(null)
  }
  async function removeDraft(id: string) {
    const draft = drafts.find((item) => item.id === id)
    if (!draft) return
    const trashedAt = new Date().toISOString()
    try {
      await setEmailDraftTrashed(id, trashedAt)
    } catch {
      setSendNotice({ tone: "error", text: "The draft could not be moved to Bin." })
      return
    }
    setDrafts((current) => current.filter((item) => item.id !== id))
    setTrashedDrafts((current) => [{ ...draft, trashedAt }, ...current])
    setSelectedDraftIds((current) => { const next = new Set(current); next.delete(id); return next })
    if (openDraftId === id) { setCompose(null); setOpenDraftId(null) }
  }

  async function deleteReceivedMessage(message: ReceivedMessage) {
    if (!user) return
    if (message.id.startsWith("gmail:")) {
      if (!await changeReceivedGmailMessage(message.id, "trash")) return
      setReceivedMessages((current) => current.filter((item) => item.id !== message.id))
    }
    const trashedAt = new Date().toISOString()
    try {
      await trashReceivedEmail({ message, companyId: workspaceId, createdBy: user.uid, trashedAt })
    } catch {
      setReceivedError("The message could not be moved to Bin.")
      return
    }
    setHiddenReceivedIds((current) => new Set(current).add(message.id))
    setTrashedReceived((current) => [{ receivedId: message.id, companyId: workspaceId, createdBy: user.uid, hiddenAt: trashedAt, trashedAt, message }, ...current.filter((item) => item.receivedId !== message.id)])
    if (selectedReceivedId === message.id) { setSelectedReceivedId(null); setMobileMessageView("list") }
  }

  function toggleDraftSelection(id: string, checked: boolean) {
    setSelectedDraftIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAllDrafts(checked: boolean) {
    setSelectedDraftIds(checked ? new Set(visibleDrafts.map((draft) => draft.id)) : new Set())
  }

  async function deleteSelectedDrafts() {
    const ids = [...selectedDraftIds]
    if (!ids.length) return
    setSelectedDraftIds(new Set())
    await Promise.all(ids.map((id) => removeDraft(id)))
  }

  function toggleReceivedSelection(id: string, checked: boolean) {
    setSelectedReceivedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAllReceivedSelection(checked: boolean) {
    setSelectedReceivedIds(checked ? new Set(visibleReceivedMessages.map((message) => message.id)) : new Set())
  }

  async function changeReceivedGmailMessage(id: string, action: "read" | "unread" | "archive" | "trash" | "restore") {
    if (!user) return false
    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/email/received", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(result.error || "Google message could not be updated.")
      if (action === "read" || action === "unread") {
        setReceivedMessages((current) => current.map((message) => message.id === id ? { ...message, unread: action === "unread" } : message))
      }
      return true
    } catch (error) {
      setReceivedError(error instanceof Error ? error.message : "Google message could not be updated.")
      return false
    }
  }

  async function markSelectedReceived(read: boolean) {
    if (selectedReceivedIds.size === 0) return
    await Promise.all([...selectedReceivedIds].filter((id) => id.startsWith("gmail:"))
      .map((id) => changeReceivedGmailMessage(id, read ? "read" : "unread")))
    setReadReceivedIds((current) => {
      const next = new Set(current)
      selectedReceivedIds.forEach((id) => {
        if (read) next.add(id)
        else next.delete(id)
      })
      return next
    })
    setSelectedReceivedIds(new Set())
  }

  async function archiveSelectedReceived() {
    await archiveReceivedIds([...selectedReceivedIds])
  }

  async function archiveReceivedIds(ids: string[]) {
    if (!user || ids.length === 0) return
    const gmailIds = ids.filter((id) => id.startsWith("gmail:"))
    const localIds = ids.filter((id) => !gmailIds.includes(id))
    const gmailResults = await Promise.all(gmailIds.map((id) => changeReceivedGmailMessage(id, "archive")))
    const archivedIds = [...localIds, ...gmailIds.filter((_, index) => gmailResults[index])]
    if (gmailIds.length > 0) setReceivedMessages((current) => current.filter((message) => !archivedIds.includes(message.id)))
    setHiddenReceivedIds((current) => new Set([...current, ...localIds]))
    setSelectedReceivedIds((current) => {
      const next = new Set(current)
      archivedIds.forEach((id) => next.delete(id))
      return next
    })
    if (selectedReceivedId && archivedIds.includes(selectedReceivedId)) {
      setSelectedReceivedId(null)
      setMobileMessageView("list")
    }
    try {
      await Promise.all(localIds.map((id) => hideReceivedEmail({ receivedId: id, companyId: workspaceId, createdBy: user.uid })))
    } catch {
      setHiddenReceivedIds((current) => {
        const next = new Set(current)
        localIds.forEach((id) => next.delete(id))
        return next
      })
      setReceivedError("Some messages could not be archived.")
    }
  }

  async function deleteSentMessage(message: SentMessage) {
    const trashedAt = new Date().toISOString()
    try {
      await setEmailMessageTrashed(message.id, trashedAt)
    } catch {
      setSendNotice({ tone: "error", text: "The message could not be moved to Bin." })
      return
    }
    setMessages((current) => current.filter((item) => item.id !== message.id))
    setTrashedMessages((current) => [{ ...message, trashedAt }, ...current])
    setSelectedMessageIds((current) => { const next = new Set(current); next.delete(message.id); return next })
    if (selectedSentId === message.id) { setSelectedSentId(null); setMobileMessageView("list") }
  }

  function toggleMessageSelection(id: string, checked: boolean) {
    setSelectedMessageIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAllMessages(checked: boolean) {
    setSelectedMessageIds(checked ? new Set(visibleMessages.map((message) => message.id)) : new Set())
  }

  async function deleteSelectedMessages() {
    const ids = [...selectedMessageIds]
    if (!ids.length) return
    setSelectedMessageIds(new Set())
    await Promise.all(ids.map((id) => {
      const message = messages.find((item) => item.id === id)
      return message ? deleteSentMessage(message) : Promise.resolve()
    }))
  }

  async function restoreBinItem(item: EmailBinItem) {
    if (item.kind === "draft") {
      const draft = trashedDrafts.find((entry) => entry.id === item.id)
      if (!draft) throw new Error("Draft not found")
      await setEmailDraftTrashed(item.id, null)
      setTrashedDrafts((current) => current.filter((entry) => entry.id !== item.id))
      setDrafts((current) => [{ ...draft, trashedAt: null }, ...current])
    } else if (item.kind === "sent") {
      const message = trashedMessages.find((entry) => entry.id === item.id)
      if (!message) throw new Error("Message not found")
      await setEmailMessageTrashed(item.id, null)
      setTrashedMessages((current) => current.filter((entry) => entry.id !== item.id))
      setMessages((current) => [{ ...message, trashedAt: null }, ...current])
    } else {
      if (item.id.startsWith("gmail:") && !await changeReceivedGmailMessage(item.id, "restore")) return
      await restoreReceivedEmail(workspaceId, item.id)
      setTrashedReceived((current) => current.filter((entry) => entry.receivedId !== item.id))
      setHiddenReceivedIds((current) => { const next = new Set(current); next.delete(item.id); return next })
      if (item.id.startsWith("gmail:")) await loadReceivedMessages()
    }
  }

  async function permanentlyDeleteBinItems(items: EmailBinItem[]) {
    for (const item of items) {
      if (item.kind === "draft") {
        await deleteEmailDraft(item.id)
        setTrashedDrafts((current) => current.filter((entry) => entry.id !== item.id))
      } else if (item.kind === "sent") {
        await deleteEmailMessage(item.id)
        setTrashedMessages((current) => current.filter((entry) => entry.id !== item.id))
      } else {
        await permanentlyHideReceivedEmail(workspaceId, item.id)
        setTrashedReceived((current) => current.filter((entry) => entry.receivedId !== item.id))
      }
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
      setTrashedMessages((current) => current.map((item) => item.id === message.id ? hydratedMessage : item))
      try {
        await saveEmailMessage({
          ...hydratedMessage,
          companyId: message.companyId || workspaceId,
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
    useTemplateInComposer(editingTemplateId)
  }

  function useTemplateInComposer(templateId: string) {
    if (!templates.some((template) => template.id === templateId)) return
    openCompose({ templateId })
  }

  /** Shows the template being edited as an email, without opening the composer. */
  function previewEditingTemplate() {
    if (templateBody.trim()) setTemplatePreviewOpen(true)
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
    const companyId = existingTemplate?.companyId || workspaceId
    const templateId = existingTemplate?.templateId || (existingTemplate ? existingTemplate.id : makeId())
    const nextTemplate: EmailTemplate = {
      ...(existingTemplate || {}),
      id: existingTemplate?.id || `${companyId}__${templateId}`,
      templateId,
      companyId,
      createdBy: existingTemplate?.createdBy || user.uid,
      name,
      subject: savedSubject,
      body: savedBody,
      imageUrl: embeddedImage?.src,
      imageAlt: embeddedImage?.alt || undefined,
      updatedAt: now,
    }

    try {
      await saveEmailTemplate(nextTemplate as EmailTemplate & { companyId: string; createdBy: string })
      setTemplates((current) => editingTemplateId
        ? current.map((template) => template.id === editingTemplateId ? nextTemplate : template)
        : [nextTemplate, ...current])
      setEditingTemplateId(nextTemplate.id)
      setTemplateNotice({ tone: "success", text: editingTemplateId ? "Template updated." : "Template saved." })
    } catch (error) {
      console.error("Error saving email template:", error)
      setTemplateNotice({ tone: "error", text: "The template could not be saved. Try again." })
    }
  }

  async function addVisitorSalesTemplate() {
    if (!user?.uid) {
      setTemplateNotice({ tone: "error", text: "Sign in before adding a template." })
      return
    }
    const salesTemplate: EmailTemplate = {
      id: "visitor-signin-introduction",
      name: "Visitor Sign-in introduction",
      subject: "A simpler way to manage visitors at reception",
      body:
        "<p>Hi there,</p>" +
        "<p>How do visitors sign in at your office today, and how does the person they’re visiting know they’ve arrived?</p>" +
        "<p>VisualCNS Visitor Sign-in gives your reception a simple sign-in page for a tablet. Visitors enter their details and choose their host. The host gets an email, while your team can see who is in the building and review past visits.</p>" +
        `<p>You can try it free for ${TRIAL_DAYS} days, with no card needed.</p>` +
        "<p><a href=\"https://www.visualcns.com/visitors/demo\">Try the visitor sign-in demo</a></p>" +
        "<p>Would a short walkthrough be useful? Just reply to this email and we’ll arrange one.</p>" +
        "<p>Best,<br />The VisualCNS team</p>",
      updatedAt: new Date().toISOString(),
    }
    try {
      const storedTemplate: EmailTemplate = {
        ...salesTemplate,
        id: `${workspaceId}__${salesTemplate.id}`,
        templateId: salesTemplate.id,
        companyId: workspaceId,
        createdBy: user.uid,
      }
      await saveEmailTemplate(storedTemplate as EmailTemplate & { companyId: string; createdBy: string })
      setTemplates((current) => [storedTemplate, ...current.filter((template) => template.id !== storedTemplate.id)])
      editTemplate(storedTemplate)
      setMobileTemplateView("editor")
      setTemplateNotice({ tone: "success", text: "Visitor introduction email added. Review it, then use the template to send." })
    } catch {
      setTemplateNotice({ tone: "error", text: "The template could not be added. Try again." })
    }
  }

  async function deleteTemplate(templateId: string) {
    try {
      await deleteEmailTemplate(templateId)
      setTemplates((current) => current.filter((template) => template.id !== templateId))
      setSelectedTemplateIds((current) => { const next = new Set(current); next.delete(templateId); return next })
      // Deleting the template that's open leaves nothing to edit, so go back to the list.
      if (editingTemplateId === templateId) {
        resetTemplateEditor()
        setMobileTemplateView("list")
      }
    } catch {
      setTemplateNotice({ tone: "error", text: "The template could not be deleted. Try again." })
    }
  }

  function toggleTemplateSelection(id: string, checked: boolean) {
    setSelectedTemplateIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAllTemplates(checked: boolean) {
    setSelectedTemplateIds(checked ? new Set(visibleTemplates.map((template) => template.id)) : new Set())
  }

  /** Runs the delete the person confirmed in the dialog. */
  async function confirmPendingDelete() {
    if (!pendingDelete || confirmingDelete) return
    setConfirmingDelete(true)
    try {
      if (pendingDelete.kind === "template") {
        setSelectedTemplateIds((current) => { const next = new Set(current); pendingDelete.ids.forEach((id) => next.delete(id)); return next })
        await Promise.all(pendingDelete.ids.map((id) => deleteTemplate(id)))
      } else {
        await Promise.all(pendingDelete.ids.map((id) => deleteList(id)))
      }
      setPendingDelete(null)
    } finally {
      setConfirmingDelete(false)
    }
  }

  function resetListEditor() {
    setListPickerOpen(false)
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
    setListContactEmails(list.contactEmails.map((email) => email.trim().toLowerCase()))
    setListNotice(null)
    setListContactQuery("")
    // Open the picker with every contact visible and this list's members checked.
    setListShowSelectedOnly(false)
    setListPickerOpen(true)
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
      const existingList = lists.find((item) => item.id === editingListId)
      const updatedList: ContactList = {
        ...list,
        id: editingListId,
        companyId: existingList?.companyId,
        createdBy: existingList?.createdBy,
      }
      setLists((current) => current.map((item) => item.id === editingListId ? updatedList : item))
      try {
        await saveEmailList({
          ...updatedList,
          companyId: existingList?.companyId || workspaceId,
          createdBy: existingList?.createdBy || user?.uid || "",
        })
      } catch {
        setListNotice({ tone: "error", text: "The list could not be saved to the agency." })
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
      setListNotice({ tone: "error", text: "The list could not be saved to the agency." })
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
      setListNotice({ tone: "error", text: "The list could not be deleted from the agency." })
    }
  }

  const mobileReaderOpen = mobileMessageView === "reader" && (((tab === "inbox" || tab === "updates") && Boolean(selectedReceived)) || (tab === "messages" && Boolean(selectedSent)))
  const searchPlaceholder = tab === "inbox" ? "Search inbox" : tab === "updates" ? "Search updates" : tab === "drafts" ? "Search drafts" : tab === "messages" ? "Search sent" : tab === "bin" ? "Search bin" : tab === "templates" ? "Search templates" : "Search lists"
  const headerSearch = useMemo(() => ({
    query: activeFilterBar.query,
    onQueryChange: activeFilterBar.onQueryChange,
    placeholder: searchPlaceholder,
  }), [activeFilterBar.query, activeFilterBar.onQueryChange, searchPlaceholder])
  usePageHeaderSearch(headerSearch)
  const activeReceivedSort = receivedFilterBar.sorts.find((option) => option.value === receivedFilterBar.sortKey)
  const receivedSortDirectionLabel = receivedFilterBar.direction === "asc" ? activeReceivedSort?.ascLabel ?? "Ascending" : activeReceivedSort?.descLabel ?? "Descending"
  const receivedSortControl = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Sort by ${activeReceivedSort?.label ?? "received date"}, ${receivedSortDirectionLabel}`} title="Sort messages">
          <ArrowDownUp className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={receivedFilterBar.sortKey} onValueChange={receivedFilterBar.onSortKeyChange}>
          {receivedFilterBar.sorts.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={receivedFilterBar.direction} onValueChange={(value) => receivedFilterBar.onDirectionChange(value as "asc" | "desc")}>
          <DropdownMenuRadioItem value="asc">{activeReceivedSort?.ascLabel ?? "Ascending"}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">{activeReceivedSort?.descLabel ?? "Descending"}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <main className="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col overflow-visible px-3 pt-3 pb-5 sm:px-6 sm:pt-4 sm:pb-6 lg:flex-row lg:gap-6 lg:overflow-hidden">
      <nav className={cn("dashboard-sidebar hidden shrink-0 text-foreground lg:w-52 lg:flex-col", !inSidebar && "lg:flex")} aria-label="Email folders">
        {!initialMessageId && !selectedReceived && <Button type="button" size="lg" className="mb-3 w-fit justify-start gap-2 rounded-full px-4 shadow-none" onClick={() => openCompose()}>
          <Plus aria-hidden="true" />Compose
        </Button>}
        <SidebarMenu className="gap-0.5">
          {EMAIL_FOLDERS.map((folder) => (
            <SidebarMenuItem key={folder.key}>
              <SidebarMenuButton
                type="button"
                isActive={tab === folder.key}
                onClick={() => openFolder(folder.key)}
                className="h-9 gap-2 px-2 [&>svg]:size-[18px]"
                aria-current={tab === folder.key ? "page" : undefined}
              >
                <folder.icon className="h-4 w-4" aria-hidden="true" />
                <span className="sidebar-nav-label min-w-0 flex-1 truncate">{folder.label}</span>
                <span className="shrink-0 text-xs tabular-nums opacity-70">{folder.count()}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </nav>

      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        {/* With the folders in the sidebar, Compose remains available from the list. */}
        {inSidebar && !initialMessageId && !selectedReceived && (
          <Button type="button" size="lg" className="mb-3 hidden w-fit justify-start gap-2 rounded-full px-4 shadow-none lg:inline-flex" onClick={() => openCompose()}>
            <Plus aria-hidden="true" />Compose
          </Button>
        )}
        {/* Mobile: search with a create button beside it, then pill folders, hidden while reading a message. */}
        {!mobileReaderOpen && (
          <div className="sm:hidden">
            <MobileSearchBar
              {...activeFilterBar}
              placeholder={tab === "inbox" ? "Search emails" : tab === "updates" ? "Search updates" : tab === "drafts" ? "Search drafts" : tab === "messages" ? "Search sent" : tab === "bin" ? "Search bin" : tab === "templates" ? "Search templates" : "Search lists"}
              className="mt-1 mb-4"
              create={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className={MOBILE_CREATE_BUTTON_CLASS} aria-label="Create" title="Create">
                      <Plus className="size-5" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => openCompose()}><Mail aria-hidden="true" />Compose email</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { openFolder("templates"); resetTemplateEditor(); setMobileTemplateView("editor") }}><FileText aria-hidden="true" />New template</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { openFolder("lists"); resetListEditor(); setListPickerOpen(true) }}><List aria-hidden="true" />New list</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          </div>
        )}
        <FilterBar
          {...activeFilterBar}
          showSearch={false}
          sorts={tab === "inbox" || tab === "updates" ? [] : activeFilterBar.sorts}
          mobileVariant="drawer"
          mobileSearch={false}
          className={cn("mb-2 max-sm:hidden", (tab === "inbox" || tab === "updates") && "lg:hidden")}
          placeholder={searchPlaceholder}
          searchClassName={tab === "messages" || tab === "inbox" || tab === "updates" || tab === "bin" ? "sm:max-w-[16rem]" : undefined}
          actions={
            <>
            {tab === "templates" && mobileTemplateView === "list" && (
              <Button type="button" size="sm" className="hidden lg:inline-flex" onClick={() => { resetTemplateEditor(); setMobileTemplateView("editor") }}>
                <Plus className="size-4" aria-hidden="true" />New template
              </Button>
            )}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="bg-transparent px-3 text-foreground hover:bg-transparent" aria-label="Create email item" title="Create email item">
                    <Plus className="size-4" aria-hidden="true" />
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => openCompose()}><Mail aria-hidden="true" />Compose email</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { openFolder("templates"); resetTemplateEditor(); setMobileTemplateView("editor") }}><FileText aria-hidden="true" />New template</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { openFolder("lists"); resetListEditor(); setListPickerOpen(true) }}><List aria-hidden="true" />New list</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            </>
          }
        />
        <div className={cn("scrollbar-none mb-2 flex w-full items-center gap-1 overflow-x-auto rounded-md bg-muted/50 p-0.5 max-sm:-mx-3 max-sm:mb-4 max-sm:w-auto max-sm:gap-2 max-sm:rounded-none max-sm:bg-transparent max-sm:px-3 lg:hidden", mobileReaderOpen && "max-sm:hidden", inSidebar && "hidden")} role="tablist" aria-label="Email">
          {EMAIL_FOLDERS.map((folder) => (
            <button
              key={folder.key}
              type="button"
              role="tab"
              aria-selected={tab === folder.key}
              onClick={() => {
                openFolder(folder.key)
                if (folder.key === "templates") setMobileTemplateView("list")
              }}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors max-sm:rounded-full max-sm:px-5 max-sm:py-2.5 max-sm:text-base",
                tab === folder.key
                  ? "bg-background text-foreground shadow-sm max-sm:bg-foreground max-sm:text-background"
                  : "text-muted-foreground hover:text-foreground max-sm:border max-sm:border-border max-sm:bg-card",
              )}
            >
              {folder.label}
            </button>
          ))}
        </div>

        {(tab === "inbox" || tab === "updates" || tab === "drafts" || tab === "messages") && (
          <EmailMessageSurfaces
            tab={tab}
            receivedMessages={activeReceivedMessages}
            visibleReceivedMessages={visibleReceivedMessages}
            receivedLoading={receivedLoading}
            receivedError={receivedError}
            receivedReconnectRequired={receivedReconnectRequired}
            onRetryReceived={() => void loadReceivedMessages()}
            selectedReceived={selectedReceived}
            selectedReceivedId={selectedReceivedId}
            loadingReceivedId={loadingReceivedId}
            onOpenReceived={(message) => { previewReceivedMessageById(message); router.push(messageHref(message)) }}
            onClearReceived={() => { setSelectedReceivedId(null); setMobileMessageView("list"); router.push(folderHref(tab)) }}
            onDeleteReceived={(message) => void deleteReceivedMessage(message)}
            onDownloadReceivedAttachment={(message, file) => void downloadReceivedAttachment(message, file)}
            downloadingAttachmentId={downloadingAttachmentId}
            onReplyReceived={(message) => composeReceivedMessage(message, "reply")}
            onForwardReceived={(message) => composeReceivedMessage(message, "forward")}
            selectedReceivedIds={[...selectedReceivedIds]}
            readReceivedIds={[...displayedReadIds]}
            onToggleAllReceived={toggleAllReceivedSelection}
            onToggleReceived={toggleReceivedSelection}
            onArchiveReceived={() => void archiveSelectedReceived()}
            onArchiveReceivedMessage={(message) => void archiveReceivedIds([message.id])}
            onMarkReceivedRead={() => markSelectedReceived(true)}
            onMarkReceivedUnread={() => markSelectedReceived(false)}
            receivedSortControl={receivedSortControl}
            onToggleReceivedRead={(message) => {
              if (message.id.startsWith("gmail:")) {
                void changeReceivedGmailMessage(message.id, message.unread ? "read" : "unread")
                return
              }
              setReadReceivedIds((current) => {
                const next = new Set(current)
                if (next.has(message.id)) next.delete(message.id)
                else next.add(message.id)
                return next
              })
            }}
            drafts={drafts}
            visibleDrafts={visibleDrafts}
            selectedDraftIds={[...selectedDraftIds]}
            onToggleAllDrafts={toggleAllDrafts}
            onToggleDraft={toggleDraftSelection}
            onDeleteSelectedDrafts={() => void deleteSelectedDrafts()}
            editingDraftId={openDraftId}
            onLoadDraft={loadDraft}
            onRemoveDraft={removeDraft}
            messages={messages}
            visibleMessages={visibleMessages}
            selectedMessageIds={[...selectedMessageIds]}
            onToggleAllMessages={toggleAllMessages}
            onToggleMessage={toggleMessageSelection}
            onDeleteSelectedMessages={() => void deleteSelectedMessages()}
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
            detailOnly={Boolean(initialMessageId)}
          />
        )}

        {tab === "bin" && (
          <EmailBin
            items={binItems}
            visibleItems={visibleBinItems}
            onRestore={restoreBinItem}
            onPermanentDelete={permanentlyDeleteBinItems}
            onOpen={(item) => {
              if (item.kind === "received") {
                const message = receivedMessages.find((entry) => entry.id === item.id) || trashedReceived.find((entry) => entry.receivedId === item.id)?.message
                if (message) void hydrateReceivedMessage(message)
              } else if (item.kind === "sent") {
                const message = trashedMessages.find((entry) => entry.id === item.id)
                if (message) void hydrateMessageBody(message)
              }
            }}
            loadingKey={loadingReceivedId ? `received:${loadingReceivedId}` : loadingMessageId ? `sent:${loadingMessageId}` : null}
            contactInitials={contactInitials}
            contactAvatarTone={contactAvatarTone}
            formatListDate={formatListDate}
            formatMessageDate={formatMessageDate}
          />
        )}

        {tab === "lists" && (
          listPickerOpen ? (
            <EmailListPicker
              open={listPickerOpen}
              onClose={() => setListPickerOpen(false)}
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
              editingListId={editingListId}
            />
          ) : (
            <EmailLists
              visibleLists={visibleLists}
              editingListId={editingListId}
              editList={editList}
              deleteList={(id) => setPendingDelete({ kind: "list", ids: [id] })}
              contactInitials={contactInitials}
              contactAvatarTone={contactAvatarTone}
            />
          )
        )}

        {tab === "templates" && (
          <EmailTemplates
            templates={templates}
            visibleTemplates={visibleTemplates}
            selectedTemplateIds={[...selectedTemplateIds]}
            onToggleAllTemplates={toggleAllTemplates}
            onToggleTemplate={toggleTemplateSelection}
            onDeleteSelectedTemplates={() => { if (selectedTemplateIds.size) setPendingDelete({ kind: "template", ids: [...selectedTemplateIds] }) }}
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
            addVisitorSalesTemplate={addVisitorSalesTemplate}
            resetTemplateEditor={resetTemplateEditor}
            deleteTemplate={(id) => setPendingDelete({ kind: "template", ids: [id] })}
            contactInitials={contactInitials}
            contactAvatarTone={contactAvatarTone}
            formatListDate={formatListDate}
          />
        )}

      </div>

      {/* Mobile: compose stays one tap away above the bottom nav. */}
      {!mobileReaderOpen && !compose && (tab === "inbox" || tab === "updates" || tab === "drafts" || tab === "messages" || tab === "bin") && (
        <Button
          type="button"
          size="lg"
          onClick={() => openCompose()}
          className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 h-14 gap-2 rounded-full px-6 text-base shadow-lg sm:hidden"
        >
          <Plus className="size-5" aria-hidden="true" />Write
        </Button>
      )}

      {templatePreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Template preview" onClick={() => setTemplatePreviewOpen(false)} onKeyDown={(event) => { if (event.key === "Escape") setTemplatePreviewOpen(false) }}>
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white sm:px-6" onClick={(event) => event.stopPropagation()}>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{templateName || "Template preview"}</p>
              <p className="truncate text-xs text-white/70">{templateSubject || "(No subject)"}</p>
            </div>
            <button type="button" autoFocus onClick={() => setTemplatePreviewOpen(false)} aria-label="Close template preview" className="flex size-9 items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden px-2 pb-6 sm:px-6" onClick={(event) => event.stopPropagation()}>
            <iframe title="Template preview" srcDoc={composedEmailPreview({ subject: templateSubject, body: withMessageImage(templateBody), branded: true, brand: businessProfile })} sandbox="allow-same-origin" className="h-full w-full border-0 bg-[#f3f4f7]" />
          </div>
        </div>
      )}

      {compose && (
        <QuickEmailComposer
          key={composeKey}
          open
          onOpenChange={(open) => { if (!open) setCompose(null) }}
          {...compose}
          onSent={handleSent}
          onDraftSaved={handleDraftSaved}
          onDraftTrashed={handleDraftTrashed}
        />
      )}

      {/* Page notices, such as a draft that could not be moved to Bin */}
      {!compose && sendNotice && (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 sm:left-6 sm:translate-x-0 md:bottom-4">
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

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open && !confirmingDelete) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === "list"
                ? `Delete ${lists.find((list) => list.id === pendingDelete.ids[0])?.name || "this list"}?`
                : pendingDelete && pendingDelete.ids.length > 1
                  ? `Delete ${pendingDelete.ids.length} templates?`
                  : `Delete ${templates.find((template) => template.id === pendingDelete?.ids[0])?.name || "this template"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "list"
                ? "The list is removed for everyone in the agency. The contacts in it stay saved. This cannot be undone."
                : "Deleted templates can't be used to send email any more. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmingDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmingDelete}
              onClick={(event) => { event.preventDefault(); void confirmPendingDelete() }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmingDelete ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
