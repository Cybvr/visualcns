"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { MessageSquare, Send } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { CompanyEmptyState } from "@/components/company/empty-state"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MAX_MESSAGE_LENGTH, sendCompanyMessage, subscribeToCompanyMessages, type CompanyMessage } from "@/lib/company-messages"
import { cn } from "@/lib/utils"

function timeLabel(message: CompanyMessage) {
  const date = message.createdAt?.toDate()
  if (!date) return "Sending…"
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  if (date.toDateString() === new Date().toDateString()) return time
  return `${date.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`
}

/** The conversation between the company's people and the agency. */
export function CompanyMessages() {
  const { company } = useCompanyPage()
  const { user, appUser } = useAuth()
  const [messages, setMessages] = useState<CompanyMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const agencyId = company.agencyId || appUser?.agencyId || ""
  const side: CompanyMessage["side"] = appUser?.role === "admin" || appUser?.role === "superadmin" ? "agency" : "company"

  useEffect(() => {
    if (!user || !agencyId || !company.id) return
    return subscribeToCompanyMessages(agencyId, company.id, (next) => { setMessages(next); setError(null) }, () => setError("Messages could not be loaded."))
  }, [user, agencyId, company.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages?.length])

  async function send(event?: FormEvent) {
    event?.preventDefault()
    if (!user || !draft.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      await sendCompanyMessage({
        agencyId,
        companyId: company.id,
        authorUid: user.uid,
        authorName: appUser?.displayName || user.displayName || "Someone",
        authorPhotoUrl: appUser?.photoURL || user.photoURL || undefined,
        side,
        body: draft,
      })
      setDraft("")
    } catch {
      setError("Your message was not sent. Try again.")
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <section className="mt-4 flex flex-col" aria-labelledby="company-messages-heading">
      <h2 id="company-messages-heading" className="sr-only">Messages</h2>
      <span className="sidebar-nav-label text-muted-foreground">Messages with the agency</span>

      {messages === null && !error ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading messages…</p>
      ) : messages && messages.length === 0 ? (
        <CompanyEmptyState icon={MessageSquare} title="No messages yet" description="Send the first message below. The agency and everyone at this company will see it." />
      ) : (
        <ul className="mt-4 space-y-4">
          {messages?.map((message) => {
            const mine = message.authorUid === user?.uid
            return (
              <li key={message.id} className={cn("flex items-end gap-2.5", mine && "flex-row-reverse")}>
                <Avatar className="size-8 shrink-0">
                  {message.authorPhotoUrl && <AvatarImage src={message.authorPhotoUrl} alt="" referrerPolicy="no-referrer" />}
                  <AvatarFallback className="text-xs">{message.authorName.trim().charAt(0).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className={cn("min-w-0 max-w-[75%]", mine && "text-right")}>
                  <div className="mb-1 text-xs text-muted-foreground">
                    {mine ? "You" : message.authorName}{!mine && message.side === "agency" ? " · Agency" : ""} · {timeLabel(message)}
                  </div>
                  <div className={cn("whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm", mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                    {message.body}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div ref={endRef} />

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <form onSubmit={(event) => void send(event)} className="sticky bottom-3 mt-5 flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
          placeholder="Write a message"
          aria-label="Message"
          className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Send message">
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </form>
    </section>
  )
}
