"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp } from "firebase/firestore"

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

export type AgentMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  /** Storage URLs of images the user attached to this message. */
  images?: string[]
  /** Non-image files (PDFs, Word, Excel…) attached to this message. */
  files?: AgentFile[]
  /** Present when the agent answered and then asked for details as a form. */
  form?: AgentForm
}

/** Matches FORM_MARKER in the agent route. */
const FORM_MARKER = "\n␞::ngai-form::"

/** Splits the assistant's reply into its visible text and any trailing form spec. */
function splitForm(raw: string): { text: string; form?: AgentForm } {
  const at = raw.indexOf(FORM_MARKER)
  if (at === -1) return { text: raw }
  const text = raw.slice(0, at)
  try {
    const form = JSON.parse(raw.slice(at + FORM_MARKER.length)) as AgentForm
    if (form && Array.isArray(form.fields) && form.fields.length) return { text, form }
  } catch {
    // A truncated or malformed spec just leaves the text on its own.
  }
  return { text }
}

export type AgentConversation = {
  id: string
  title: string
  messages: AgentMessage[]
}

interface AgentContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  messages: AgentMessage[]
  conversations: AgentConversation[]
  activeConversationId: string
  sending: boolean
  firstName: string
  send: (text: string, images?: string[], files?: AgentFile[]) => void
  reset: () => void
  selectConversation: (id: string) => void
}

const AgentContext = createContext<AgentContextValue | null>(null)
const MAX_HISTORY_MESSAGES = 100
const NEW_CHAT_TITLE = "New chat"

function messageId(nextId: MutableRefObject<number>): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${nextId.current++}`
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const { appUser, user } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState("")
  const [sending, setSending] = useState(false)
  const nextId = useRef(1)

  useEffect(() => {
    let active = true
    if (!user?.uid) {
      setMessages([])
      setConversations([])
      setActiveConversationId("")
      return () => { active = false }
    }

    setMessages([])
    setConversations([])
    setActiveConversationId("")
    void getDocs(query(collection(db, "agentConversations", user.uid, "chats"), orderBy("updatedAt", "desc"), limit(12)))
      .then(async (snapshot) => {
        if (!active) return
        let restored: AgentConversation[] = snapshot.docs.map((chat) => {
          const stored = chat.data().messages
          const chatMessages = Array.isArray(stored)
            ? stored
                .filter((message): message is { id: string | number; role: "user" | "assistant"; content: string; images?: string[]; files?: AgentFile[] } =>
                  Boolean(message) &&
                  (message.role === "user" || message.role === "assistant") &&
                  typeof message.content === "string" &&
                  !(message.role === "assistant" && !message.content.trim()),
                )
                .slice(-MAX_HISTORY_MESSAGES)
                .map((message) => ({ ...message, id: String(message.id), ...(Array.isArray(message.images) ? { images: message.images.filter((url): url is string => typeof url === "string") } : {}), ...(Array.isArray(message.files) ? { files: message.files.filter((file): file is AgentFile => Boolean(file) && typeof file.url === "string" && typeof file.name === "string") } : {}) }))
            : []
          return { id: chat.id, title: String(chat.data().title || NEW_CHAT_TITLE), messages: chatMessages }
        })

        // Migrate the single-transcript format used by the first version.
        if (!restored.length) {
          const legacy = await getDoc(doc(db, "agentConversations", user.uid))
          const stored = legacy.data()?.messages
          const legacyMessages = Array.isArray(stored)
            ? stored
                .filter((message): message is { id: string | number; role: "user" | "assistant"; content: string; images?: string[]; files?: AgentFile[] } =>
                  Boolean(message) &&
                  (message.role === "user" || message.role === "assistant") &&
                  typeof message.content === "string" &&
                  !(message.role === "assistant" && !message.content.trim()),
                )
                .slice(-MAX_HISTORY_MESSAGES)
                .map((message) => ({ ...message, id: String(message.id), ...(Array.isArray(message.images) ? { images: message.images.filter((url): url is string => typeof url === "string") } : {}), ...(Array.isArray(message.files) ? { files: message.files.filter((file): file is AgentFile => Boolean(file) && typeof file.url === "string" && typeof file.name === "string") } : {}) }))
            : []
          if (legacyMessages.length) restored = [{ id: "previous-chat", title: "Previous chat", messages: legacyMessages }]
        }

        if (!active) return
        setConversations(restored)
      })
      .catch((error) => console.error("Agent history load failed", error))

    return () => { active = false }
  }, [user?.uid])

  const displayName = appUser?.displayName || appUser?.company || user?.displayName || "there"
  const firstName = displayName.split(" ")[0]

  const persistConversation = useCallback(
    (conversation: AgentConversation) => {
      if (!user?.uid) return
      void setDoc(
        doc(db, "agentConversations", user.uid, "chats", conversation.id),
        { title: conversation.title || NEW_CHAT_TITLE, messages: conversation.messages.slice(-MAX_HISTORY_MESSAGES), updatedAt: Timestamp.now() },
        { merge: true },
      ).catch((error) => console.error("Agent history save failed", error))
    },
    [user?.uid],
  )

  const rememberConversation = useCallback(
    (conversation: AgentConversation) => {
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)])
      persistConversation(conversation)
    },
    [persistConversation],
  )

  const send = useCallback(
    (text: string, images?: string[], files?: AgentFile[]) => {
      const content = text.trim()
      const attachments = (images ?? []).filter((url) => typeof url === "string" && url)
      const fileAttachments = (files ?? []).filter((file) => file && typeof file.url === "string" && file.url && typeof file.name === "string")
      const currentUser = user
      if ((!content && !attachments.length && !fileAttachments.length) || sending || !currentUser) return

      const userMessage: AgentMessage = {
        id: messageId(nextId),
        role: "user",
        content,
        ...(attachments.length ? { images: attachments } : {}),
        ...(fileAttachments.length ? { files: fileAttachments } : {}),
      }
      const assistantId = messageId(nextId)
      const history = [...messages, userMessage]
      const conversationId = activeConversationId || messageId(nextId)
      const existing = conversations.find((conversation) => conversation.id === conversationId)
      const fallbackTitle = content.slice(0, 56) || (fileAttachments.length ? fileAttachments[0].name : "Shared a file")
      const title = existing?.title && existing.title !== NEW_CHAT_TITLE ? existing.title : fallbackTitle
      const pending = [...history, { id: assistantId, role: "assistant" as const, content: "" }]

      setActiveConversationId(conversationId)
      setMessages(pending)
      rememberConversation({ id: conversationId, title, messages: history })
      setSending(true)

      const payload = history.map(({ role, content: c, images: im, files: fl }) => ({ role, content: c, ...(im?.length ? { images: im } : {}), ...(fl?.length ? { files: fl } : {}) }))

      void (async () => {
        try {
          const surface = pathname?.startsWith("/portal") ? "client_portal" : "agency_dashboard"
          const response = await fetch("/api/agent", {
            method: "POST",
            headers: { "content-type": "application/json", Authorization: `Bearer ${await currentUser.getIdToken()}` },
            body: JSON.stringify({ messages: payload, firstName, surface }),
          })

          if (!response.ok || !response.body) {
            const message =
              response.status === 503
                ? "Ngai is not set up yet. Add an OpenAI API key to enable it."
                : "Sorry, I could not respond just now. Please try again."
            const failed = [...history, { id: assistantId, role: "assistant" as const, content: message }]
            setMessages(failed)
            rememberConversation({ id: conversationId, title, messages: failed })
            return
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let acc = ""
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            acc += decoder.decode(value, { stream: true })
            // Hide the trailing form spec while the reply is still arriving.
            const visible = splitForm(acc).text
            setMessages((current) =>
              current.map((m) => (m.id === assistantId ? { ...m, content: visible } : m)),
            )
          }
          const { text, form } = splitForm(acc)
          acc = text.trim() ? text : "I did not catch that. Could you rephrase?"
          const completed = [...history, { id: assistantId, role: "assistant" as const, content: acc, ...(form ? { form } : {}) }]
          setMessages(completed)
          rememberConversation({ id: conversationId, title, messages: completed })
        } catch {
          const failed = [...history, { id: assistantId, role: "assistant" as const, content: "Something went wrong reaching the assistant." }]
          setMessages(failed)
          rememberConversation({ id: conversationId, title, messages: failed })
        } finally {
          setSending(false)
        }
      })()
    },
    [messages, sending, firstName, pathname, activeConversationId, conversations, rememberConversation, user],
  )

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
  const toggle = useCallback(() => setOpen((current) => !current), [])

  const value = useMemo(
    () => ({ open, setOpen, toggle, messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation }),
    [open, toggle, messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation],
  )

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgent(): AgentContextValue {
  const context = useContext(AgentContext)
  if (!context) throw new Error("useAgent must be used inside an AgentProvider")
  return context
}
