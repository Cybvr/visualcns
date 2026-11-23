"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react"

import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, Timestamp } from "firebase/firestore"

/** One field in an inline form the agent asks the user to fill in. */
export type AgentFormField = {
  id: string
  label: string
  type: "text" | "textarea" | "number" | "date" | "select"
  options?: string[] | null
  placeholder?: string | null
  required?: boolean | null
}

export type AgentForm = {
  title: string
  fields: AgentFormField[]
}

/** A non-image file the user attached: PDFs the model can read, plus other docs it can only file. */
export type AgentFile = {
  name: string
  url: string
  mimeType?: string
}

/** A record explicitly selected from the composer with an @ mention. */
export type AgentMention = {
  type: "campaign"
  id: string
  label: string
  companyId: string
}

export type AgentMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  /** The user's rating of an assistant response. */
  feedback?: "positive" | "negative"
  /** Storage URLs of images the user attached to this message. */
  images?: string[]
  /** Non-image files (PDFs, Word, Excel…) attached to this message. */
  files?: AgentFile[]
  /** Exact workspace records selected in the composer, kept separate from display text. */
  mentions?: AgentMention[]
  /** Present when the agent answered and then asked for details as a form. */
  form?: AgentForm
  /** A checklist the agent wants approved before it does a big job. */
  plan?: AgentPlan
  /** What the agent did while working, e.g. "Reading Falcon's records". */
  steps?: string[]
  /** Documents the agent made in this reply, opened beside the chat. */
  artifacts?: AgentArtifact[]
}

/** A document Ngai made, which opens beside the chat like an artifact. */
export type AgentArtifact = { kind: "document" | "invoice" | "estimate" | "contract"; id: string; title: string }

export type AgentPlan = {
  title: string
  steps: string[]
}

/** Matches FORM_MARKER in the agent route. */
const FORM_MARKER = "\n␞::ngai-form::"

/** Match the markers in the agent route. */
const PLAN_MARKER = "\n␞::ngai-plan::"
const STEP_MARKER = "␞::ngai-step::"
const ANSWER_MARKER = "␞::ngai-answer::"
const ARTIFACT_MARKER = "\n␞::ngai-artifacts::"
const ARTIFACT_KINDS = ["document", "invoice", "estimate", "contract"]

/** Takes the list of documents made this turn off the end of the reply. */
function splitArtifacts(raw: string): { rest: string; artifacts?: AgentArtifact[] } {
  const at = raw.indexOf(ARTIFACT_MARKER)
  if (at === -1) return { rest: raw }
  try {
    const list: unknown = JSON.parse(raw.slice(at + ARTIFACT_MARKER.length))
    const artifacts = Array.isArray(list)
      ? list.filter((item): item is AgentArtifact => Boolean(item) && ARTIFACT_KINDS.includes(item.kind) && typeof item.id === "string")
      : []
    return { rest: raw.slice(0, at), artifacts: artifacts.length ? artifacts : undefined }
  } catch {
    // Still streaming, or cut short: hide the list until it is whole.
    return { rest: raw.slice(0, at) }
  }
}

/** Splits the assistant's reply into its visible text and any trailing form or plan spec. */
function splitForm(raw: string): { text: string; form?: AgentForm; plan?: AgentPlan } {
  const formAt = raw.indexOf(FORM_MARKER)
  const planAt = raw.indexOf(PLAN_MARKER)
  if (formAt === -1 && planAt === -1) return { text: raw }
  const isForm = formAt !== -1 && (planAt === -1 || formAt < planAt)
  const at = isForm ? formAt : planAt
  const text = raw.slice(0, at)
  try {
    const spec = JSON.parse(raw.slice(at + (isForm ? FORM_MARKER : PLAN_MARKER).length))
    if (isForm && spec && Array.isArray(spec.fields) && spec.fields.length) return { text, form: spec as AgentForm }
    if (!isForm && spec && Array.isArray(spec.steps) && spec.steps.length) return { text, plan: spec as AgentPlan }
  } catch {
    // A truncated or malformed spec just leaves the text on its own.
  }
  return { text }
}

/** Pulls the progress lines out of the stream, and the answer once it starts. */
function splitStream(raw: string): { steps: string[]; answer: string } {
  const at = raw.indexOf(ANSWER_MARKER)
  const head = at === -1 ? raw : raw.slice(0, at)
  const steps = [...head.matchAll(/␞::ngai-step::([^\n]*)\n/g)].map((match) => match[1]).filter(Boolean)
  if (at !== -1) return { steps, answer: raw.slice(at + ANSWER_MARKER.length) }
  // An older server sends the answer on its own, with no markers.
  return { steps, answer: head.includes(STEP_MARKER) ? "" : raw }
}

/** The document or invoice a chat was started beside. It travels with the chat. */
export type AgentChatContext = { kind: "document" | "invoice"; id: string; title: string }

function validChatContext(value: unknown): AgentChatContext | undefined {
  if (!value || typeof value !== "object") return undefined
  const { kind, id, title } = value as Record<string, unknown>
  if ((kind !== "document" && kind !== "invoice") || typeof id !== "string" || !id) return undefined
  return { kind, id, title: typeof title === "string" ? title : "" }
}

export type AgentConversation = {
  id: string
  title: string
  messages: AgentMessage[]
  updatedAt?: number
  context?: AgentChatContext
}

interface AgentContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  messages: AgentMessage[]
  conversations: AgentConversation[]
  conversationsLoading: boolean
  activeConversationId: string
  sending: boolean
  firstName: string
  send: (text: string, images?: string[], files?: AgentFile[], mentions?: AgentMention[]) => void
  rateResponse: (messageId: string, feedback: AgentMessage["feedback"] | null) => void
  reset: () => void
  selectConversation: (id: string) => void
  deleteConversations: (ids: string[]) => Promise<void>
  /** The open chat's document or invoice, when this chat isn't already beside it. */
  conversationContext: AgentChatContext | null
  /** Tells the chat which document or invoice is open beside it, or null when none is. */
  setItemContext: (context: AgentChatContext | null) => void
  renameConversation: (id: string, title: string) => void
}

const AgentContext = createContext<AgentContextValue | null>(null)
const MAX_HISTORY_MESSAGES = 100
const NEW_CHAT_TITLE = "New chat"

function messageId(nextId: MutableRefObject<number>): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${nextId.current++}`
}

function validMentions(value: unknown): AgentMention[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((mention): mention is AgentMention => Boolean(
      mention
      && mention.type === "campaign"
      && typeof mention.id === "string"
      && typeof mention.label === "string"
      && typeof mention.companyId === "string",
    ))
    .map((mention) => ({
      type: "campaign",
      id: mention.id.slice(0, 200),
      label: mention.label.slice(0, 200),
      companyId: mention.companyId.slice(0, 200),
    }))
}

/** `surface` picks which Ngai the server runs; context keeps a company-page chat focused on that company. */
export function AgentProvider({
  children,
  surface = "agency_dashboard",
  companyContext,
  campaignContext,
  documentContext: documentContextProp,
  invoiceContext: invoiceContextProp,
  initialConversationId,
}: {
  /** Opens this chat once the chats load, e.g. one carried over from the main chat. */
  initialConversationId?: string
  children: ReactNode
  surface?: "agency_dashboard" | "client_portal"
  companyContext?: { id: string; name: string }
  /** Opened inside one campaign, so "this campaign" means that one. */
  campaignContext?: { id: string; title: string }
  /** Open beside a document, so "this document" means that one. */
  documentContext?: { id: string; title: string }
  /** Open beside an invoice, so "this invoice" means that one. */
  invoiceContext?: { id: string; title: string }
}) {
  const { appUser, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [activeConversationId, setActiveConversationId] = useState("")
  const [sending, setSending] = useState(false)
  // The item open beside the shared chat (in the Ngai workspace). A provider made for one item passes it as a prop instead.
  const [itemContext, setItemContext] = useState<AgentChatContext | null>(null)
  const documentContext = useMemo(() => documentContextProp ?? (itemContext?.kind === "document" ? { id: itemContext.id, title: itemContext.title } : undefined), [documentContextProp, itemContext])
  const invoiceContext = useMemo(() => invoiceContextProp ?? (itemContext?.kind === "invoice" ? { id: itemContext.id, title: itemContext.title } : undefined), [invoiceContextProp, itemContext])
  const nextId = useRef(1)

  useEffect(() => {
    let active = true
    if (!user?.uid) {
      setMessages([])
      setConversations([])
      setActiveConversationId("")
      setConversationsLoading(false)
      return () => { active = false }
    }

    setConversationsLoading(true)
    setMessages([])
    setConversations([])
    setActiveConversationId("")
    void getDocs(query(collection(db, "agentConversations", user.uid, "chats"), orderBy("updatedAt", "desc")))
      .then(async (snapshot) => {
        if (!active) return
        let restored: AgentConversation[] = snapshot.docs.map((chat) => {
          const stored = chat.data().messages
          const chatMessages = Array.isArray(stored)
            ? stored
                .filter((message): message is { id: string | number; role: "user" | "assistant"; content: string; images?: string[]; files?: AgentFile[]; mentions?: AgentMention[] } =>
                  Boolean(message) &&
                  (message.role === "user" || message.role === "assistant") &&
                  typeof message.content === "string" &&
                  !(message.role === "assistant" && !message.content.trim()),
                )
                .slice(-MAX_HISTORY_MESSAGES)
                .map((message) => ({ ...message, id: String(message.id), ...(Array.isArray(message.images) ? { images: message.images.filter((url): url is string => typeof url === "string") } : {}), ...(Array.isArray(message.files) ? { files: message.files.filter((file): file is AgentFile => Boolean(file) && typeof file.url === "string" && typeof file.name === "string") } : {}), ...(validMentions(message.mentions).length ? { mentions: validMentions(message.mentions) } : {}) }))
            : []
          const updatedAt = chat.data().updatedAt
          const context = validChatContext(chat.data().context)
          return {
            id: chat.id,
            title: String(chat.data().title || NEW_CHAT_TITLE),
            messages: chatMessages,
            ...(updatedAt instanceof Timestamp ? { updatedAt: updatedAt.toMillis() } : {}),
            ...(context ? { context } : {}),
          }
        })

        // Migrate the single-transcript format used by the first version.
        if (!restored.length) {
          const legacy = await getDoc(doc(db, "agentConversations", user.uid))
          const stored = legacy.data()?.messages
          const legacyMessages = Array.isArray(stored)
            ? stored
                .filter((message): message is { id: string | number; role: "user" | "assistant"; content: string; images?: string[]; files?: AgentFile[]; mentions?: AgentMention[] } =>
                  Boolean(message) &&
                  (message.role === "user" || message.role === "assistant") &&
                  typeof message.content === "string" &&
                  !(message.role === "assistant" && !message.content.trim()),
                )
                .slice(-MAX_HISTORY_MESSAGES)
                .map((message) => ({ ...message, id: String(message.id), ...(Array.isArray(message.images) ? { images: message.images.filter((url): url is string => typeof url === "string") } : {}), ...(Array.isArray(message.files) ? { files: message.files.filter((file): file is AgentFile => Boolean(file) && typeof file.url === "string" && typeof file.name === "string") } : {}), ...(validMentions(message.mentions).length ? { mentions: validMentions(message.mentions) } : {}) }))
            : []
          if (legacyMessages.length) restored = [{ id: "previous-chat", title: "Previous chat", messages: legacyMessages }]
        }

        if (!active) return
        setConversations(restored)
        setConversationsLoading(false)
      })
      .catch((error) => {
        console.error("Agent history load failed", error)
        if (active) setConversationsLoading(false)
      })

    return () => { active = false }
  }, [user?.uid])

  const displayName = appUser?.displayName || appUser?.company || user?.displayName || "there"
  const firstName = displayName.split(" ")[0]

  const trackEvent = useCallback((type: "agent_opened" | "message_sent" | "record_opened" | "human_handoff", metadata?: Record<string, unknown>) => {
    if (!user) return
    void user.getIdToken().then((token) => fetch("/api/agent/events", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, surface, metadata }),
    })).catch(() => undefined)
  }, [surface, user])

  useEffect(() => {
    if (open) trackEvent("agent_opened")
  }, [open, trackEvent])

  const persistConversation = useCallback(
    (conversation: AgentConversation) => {
      if (!user?.uid) return
      void setDoc(
        doc(db, "agentConversations", user.uid, "chats", conversation.id),
        { title: conversation.title || NEW_CHAT_TITLE, messages: conversation.messages.slice(-MAX_HISTORY_MESSAGES), updatedAt: Timestamp.now(), ...(conversation.context ? { context: conversation.context } : {}) },
        { merge: true },
      ).catch((error) => console.error("Agent history save failed", error))
    },
    [user?.uid],
  )

  const rememberConversation = useCallback(
    (conversation: AgentConversation) => {
      const updated = { ...conversation, updatedAt: Date.now() }
      setConversations((current) => [updated, ...current.filter((item) => item.id !== conversation.id)])
      persistConversation(updated)
    },
    [persistConversation],
  )

  const send = useCallback(
    (text: string, images?: string[], files?: AgentFile[], mentions?: AgentMention[]) => {
      const content = text.trim()
      const attachments = (images ?? []).filter((url) => typeof url === "string" && url)
      const fileAttachments = (files ?? []).filter((file) => file && typeof file.url === "string" && file.url && typeof file.name === "string")
      const selectedMentions = validMentions(mentions)
      const currentUser = user
      if ((!content && !attachments.length && !fileAttachments.length) || sending || !currentUser) return
      trackEvent("message_sent", { hasAttachments: attachments.length > 0 || fileAttachments.length > 0 })

      const userMessage: AgentMessage = {
        id: messageId(nextId),
        role: "user",
        content,
        ...(attachments.length ? { images: attachments } : {}),
        ...(fileAttachments.length ? { files: fileAttachments } : {}),
        ...(selectedMentions.length ? { mentions: selectedMentions } : {}),
      }
      const assistantId = messageId(nextId)
      const history = [...messages, userMessage]
      const conversationId = activeConversationId || messageId(nextId)
      const existing = conversations.find((conversation) => conversation.id === conversationId)
      const fallbackTitle = content.slice(0, 56) || (fileAttachments.length ? fileAttachments[0].name : "Shared a file")
      const title = existing?.title && existing.title !== NEW_CHAT_TITLE ? existing.title : fallbackTitle
      const pending = [...history, { id: assistantId, role: "assistant" as const, content: "" }]
      // Beside a document or invoice, the chat remembers it; reopened elsewhere, it still points there.
      const context: AgentChatContext | undefined = documentContext
        ? { kind: "document", ...documentContext }
        : invoiceContext
          ? { kind: "invoice", ...invoiceContext }
          : existing?.context
      const sentDocumentContext = documentContext ?? (context?.kind === "document" ? { id: context.id, title: context.title } : undefined)
      const sentInvoiceContext = invoiceContext ?? (context?.kind === "invoice" ? { id: context.id, title: context.title } : undefined)
      const remember = (list: AgentMessage[]) => rememberConversation({ id: conversationId, title, messages: list, ...(context ? { context } : {}) })

      setActiveConversationId(conversationId)
      setMessages(pending)
      remember(history)
      setSending(true)

      // A plan lives outside the text, so spell it out for the model to follow on "go ahead".
      // Documents it made are named too, so "change that document" finds the right one.
      const payload = history.map(({ role, content: c, images: im, files: fl, mentions: mn, plan, artifacts: made }) => ({
        role,
        content: [
          plan ? `${c}\n\nProposed plan: ${plan.title}\n${plan.steps.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : c,
          made?.length ? `Created: ${made.map((item) => `${item.kind} "${item.title}" (id ${item.id})`).join(", ")}` : "",
        ].filter(Boolean).join("\n\n"),
        ...(im?.length ? { images: im } : {}),
        ...(fl?.length ? { files: fl } : {}),
        ...(mn?.length ? { mentions: mn } : {}),
      }))

      void (async () => {
        try {
          const response = await fetch("/api/agent", {
            method: "POST",
            headers: { "content-type": "application/json", Authorization: `Bearer ${await currentUser.getIdToken()}` },
            body: JSON.stringify({ messages: payload, firstName, surface, companyContext, campaignContext, documentContext: sentDocumentContext, invoiceContext: sentInvoiceContext, conversationId }),
          })

          if (!response.ok || !response.body) {
            const message =
              response.status === 503
                ? "Ngai is not set up yet. Add an OpenAI API key to enable it."
                : "Sorry, I could not respond just now. Please try again."
            const failed = [...history, { id: assistantId, role: "assistant" as const, content: message }]
            setMessages(failed)
            remember(failed)
            return
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let acc = ""
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            acc += decoder.decode(value, { stream: true })
            // Show progress lines as they land, and hide any trailing form or plan spec.
            const live = splitStream(acc)
            const visible = splitForm(splitArtifacts(live.answer).rest).text
            setMessages((current) =>
              current.map((m) => (m.id === assistantId ? { ...m, content: visible, steps: live.steps } : m)),
            )
          }
          const { steps, answer } = splitStream(acc)
          const { rest, artifacts } = splitArtifacts(answer)
          const { text, form, plan } = splitForm(rest)
          acc = text.trim() ? text : plan ? "Here's what I'll do." : "I did not catch that. Could you rephrase?"
          const completed = [...history, { id: assistantId, role: "assistant" as const, content: acc, ...(steps.length ? { steps } : {}), ...(form ? { form } : {}), ...(plan ? { plan } : {}), ...(artifacts ? { artifacts } : {}) }]
          setMessages(completed)
          remember(completed)
        } catch {
          const failed = [...history, { id: assistantId, role: "assistant" as const, content: "Something went wrong reaching the assistant." }]
          setMessages(failed)
          remember(failed)
        } finally {
          setSending(false)
        }
      })()
    },
    [messages, sending, firstName, activeConversationId, conversations, rememberConversation, user, surface, companyContext, campaignContext, documentContext, invoiceContext, trackEvent],
  )

  const rateResponse = useCallback((messageId: string, feedback: AgentMessage["feedback"] | null) => {
    if (!activeConversationId || sending) return
    const conversation = conversations.find((item) => item.id === activeConversationId)
    if (!conversation) return
    const updated = messages.map((message) => {
      if (message.id !== messageId || message.role !== "assistant") return message
      const next = { ...message }
      if (feedback) next.feedback = feedback
      else delete next.feedback
      return next
    })
    setMessages(updated)
    rememberConversation({ ...conversation, messages: updated })
  }, [activeConversationId, conversations, messages, rememberConversation, sending])

  const reset = useCallback(() => {
    // A new chat is only persisted once the user sends the first message.
    // Keeping the id empty preserves the welcome state without creating a blank record.
    setActiveConversationId("")
    setMessages([])
  }, [])
  const selectConversation = useCallback((id: string) => {
    const conversation = conversations.find((item) => item.id === id)
    if (!conversation) return
    setActiveConversationId(id)
    setMessages(conversation.messages)
  }, [conversations])
  const deleteConversations = useCallback(async (ids: string[]) => {
    if (!user?.uid || ids.length === 0) return
    if (sending && ids.includes(activeConversationId)) {
      throw new Error("Wait for the current response to finish before deleting this chat.")
    }

    const results = await Promise.allSettled(ids.map((id) =>
      deleteDoc(id === "previous-chat" && !conversations.find((chat) => chat.id === id)?.updatedAt
        ? doc(db, "agentConversations", user.uid)
        : doc(db, "agentConversations", user.uid, "chats", id)),
    ))
    const deleted = new Set(ids.filter((_, index) => results[index].status === "fulfilled"))
    if (deleted.size > 0) {
      setConversations((current) => current.filter((chat) => !deleted.has(chat.id)))
      if (deleted.has(activeConversationId)) reset()
    }
    if (results.some((result) => result.status === "rejected")) {
      throw new Error("Some chats could not be deleted. Please try again.")
    }
  }, [user?.uid, sending, activeConversationId, conversations, reset])
  const toggle = useCallback(() => setOpen((current) => !current), [])
  const renameConversation = useCallback((id: string, title: string) => {
    const conversation = conversations.find((item) => item.id === id)
    if (conversation) rememberConversation({ ...conversation, title })
  }, [conversations, rememberConversation])

  // Beside a document or invoice, carry on the chat you came from, or else the latest one about this item.
  const picked = useRef(false)
  useEffect(() => {
    if (picked.current || conversationsLoading) return
    picked.current = true
    const item = documentContext ?? invoiceContext
    const kind = documentContext ? "document" : "invoice"
    const target = (initialConversationId && conversations.find((chat) => chat.id === initialConversationId))
      || (item ? conversations.find((chat) => chat.context?.kind === kind && chat.context.id === item.id && chat.messages.length > 0) : undefined)
    if (target) selectConversation(target.id)
  }, [conversationsLoading, conversations, initialConversationId, documentContext, invoiceContext, selectConversation])

  // Only when this chat isn't already open beside its document or invoice.
  const conversationContext = useMemo(() => {
    if (documentContext || invoiceContext) return null
    return conversations.find((item) => item.id === activeConversationId)?.context ?? null
  }, [documentContext, invoiceContext, conversations, activeConversationId])

  const value = useMemo(
    () => ({ open, setOpen, toggle, messages, conversations, conversationsLoading, activeConversationId, sending, firstName, send, rateResponse, reset, selectConversation, deleteConversations, conversationContext, setItemContext, renameConversation }),
    [open, toggle, messages, conversations, conversationsLoading, activeConversationId, sending, firstName, send, rateResponse, reset, selectConversation, deleteConversations, conversationContext, renameConversation],
  )

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgent(): AgentContextValue {
  const context = useContext(AgentContext)
  if (!context) throw new Error("useAgent must be used inside an AgentProvider")
  return context
}
