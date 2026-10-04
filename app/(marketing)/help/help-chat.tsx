"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"

import { AgentChat } from "@/components/agent/agent-chat"
import type { AgentMessage } from "@/components/agent/agent-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const STARTING_OPTIONS = [
  "What does VisualCNS do?",
  "What plans do you have?",
  "What is Pass?",
  "How do I get started?",
]

const STORED_KEY = "help-chat-visitor"

type Visitor = { name: string; email: string }

/** Asks for a name and email once (saved as a lead), then lets them chat. Remembered in this browser. */
export function HelpChat() {
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState("")
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [sending, setSending] = useState(false)
  const nextId = useRef(0)
  const id = () => `help-${nextId.current++}`

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORED_KEY) || "null") as Visitor | null
      if (saved?.name && saved.email) setVisitor(saved)
    } catch {
      // Private mode or bad data: they just enter their details again.
    }
  }, [])

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const details = { name: name.trim(), email: email.trim() }
    setStarting(true)
    setStartError("")
    try {
      const response = await fetch("/api/help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start", ...details }),
      })
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.")
      try {
        window.localStorage.setItem(STORED_KEY, JSON.stringify(details))
      } catch {
        // Not remembered; fine for this visit.
      }
      setVisitor(details)
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
    } finally {
      setStarting(false)
    }
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending || !visitor) return
    const history: AgentMessage[] = [...messages, { id: id(), role: "user", content }]
    const answerId = id()
    setMessages([...history, { id: answerId, role: "assistant", content: "" }])
    setSending(true)
    let answer = ""
    try {
      const response = await fetch("/api/help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...visitor, messages: history.map(({ role, content: body }) => ({ role, content: body })) }),
      })
      const body = (await response.json().catch(() => ({}))) as { answer?: string; error?: string }
      if (response.status === 403) setVisitor(null)
      answer = body.answer || body.error || "Sorry, I couldn't answer just now. Please try again."
    } catch {
      answer = "Sorry, I couldn't reach Ngai. Please check your connection and try again."
    } finally {
      setMessages([...history, { id: answerId, role: "assistant", content: answer }])
      setSending(false)
    }
  }

  if (!visitor) {
    return (
      <form onSubmit={start} className="m-auto w-full max-w-sm space-y-4 px-4 py-10">
        <div className="text-center">
          <Image src="/ngai-logo.png" alt="" width={44} height={44} className="mx-auto rounded-full" />
          <h2 className="mt-4 text-2xl tracking-[-0.02em]">Ask Ngai anything about VisualCNS</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tell us who you are to start the chat.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="help-name">Name</Label>
          <Input id="help-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required disabled={starting} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="help-email">Email</Label>
          <Input id="help-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={starting} className="h-11" />
        </div>
        {startError && <p role="alert" className="text-sm text-destructive">{startError}</p>}
        <Button type="submit" size="lg" className="h-11 w-full" disabled={starting}>
          {starting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Start chat
        </Button>
      </form>
    )
  }

  return (
    <AgentChat
      className="flex-1"
      messages={messages}
      conversations={[]}
      activeConversationId=""
      sending={sending}
      firstName={visitor.name.split(" ")[0]}
      onSend={(text) => void send(text)}
      onSelectConversation={() => undefined}
      onNewChat={() => setMessages([])}
      startingOptions={STARTING_OPTIONS}
      allowAttachments={false}
    />
  )
}
