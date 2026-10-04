"use client"

import { useRef, useState } from "react"

import { AgentChat } from "@/components/agent/agent-chat"
import type { AgentMessage } from "@/components/agent/agent-context"

const STARTING_OPTIONS = [
  "What does VisualCNS do?",
  "What plans do you have?",
  "What is Pass?",
  "How do I get started?",
]

/** Public Ngai: anyone can ask about VisualCNS. Nothing is saved; the chat lives on this page. */
export function HelpChat() {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [sending, setSending] = useState(false)
  const nextId = useRef(0)
  const id = () => `help-${nextId.current++}`

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending) return
    const history: AgentMessage[] = [...messages, { id: id(), role: "user", content }]
    const answerId = id()
    setMessages([...history, { id: answerId, role: "assistant", content: "" }])
    setSending(true)
    let answer = ""
    try {
      const response = await fetch("/api/help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content: body }) => ({ role, content: body })) }),
      })
      const body = (await response.json().catch(() => ({}))) as { answer?: string; error?: string }
      answer = body.answer || body.error || "Sorry, I couldn't answer just now. Please try again."
    } catch {
      answer = "Sorry, I couldn't reach Ngai. Please check your connection and try again."
    } finally {
      setMessages([...history, { id: answerId, role: "assistant", content: answer }])
      setSending(false)
    }
  }

  return (
    <AgentChat
      className="flex-1"
      messages={messages}
      conversations={[]}
      activeConversationId=""
      sending={sending}
      firstName=""
      welcome="Ask Ngai anything about VisualCNS"
      onSend={(text) => void send(text)}
      onSelectConversation={() => undefined}
      onNewChat={() => setMessages([])}
      startingOptions={STARTING_OPTIONS}
      allowAttachments={false}
    />
  )
}
