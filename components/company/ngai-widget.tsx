"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { History, LogIn, Plus, X } from "lucide-react"

import { AgentChat } from "@/components/agent/agent-chat"
import { AgentProvider, useAgent } from "@/components/agent/agent-context"
import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { NgaiLoginDialog } from "@/components/company/ngai-login-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const STARTING_OPTIONS = [
  "What's waiting on me?",
  "How are my projects going?",
  "What is VisualCNS Pass?",
  "What services does VisualCNS offer?",
]

const iconButton = "flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

function NgaiPanel({ onClose }: { onClose: () => void }) {
  const { company } = useCompanyPage()
  const { user, appUser, loading } = useAuth()
  const { messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()
  const [loginOpen, setLoginOpen] = useState(false)

  const isMember = appUser?.role === "client" && Boolean(appUser.companyId) && appUser.companyId === company.id
  const chatted = conversations.filter((conversation) => conversation.messages.length > 0)

  return (
    <div
      role="dialog"
      aria-label="Ngai"
      className="fixed inset-0 z-50 flex flex-col bg-card print:hidden sm:inset-auto sm:bottom-20 sm:right-5 sm:h-[min(38rem,calc(100svh-7rem))] sm:w-[26rem] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:shadow-xl"
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Image src="/ngai-logo.png" alt="" width={20} height={20} className="rounded-full" />
          Ngai
        </div>
        <div className="flex items-center gap-1">
          {isMember && (
            <>
              <button type="button" onClick={reset} disabled={sending} aria-label="New chat" title="New chat" className={iconButton}>
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Chat history" title="Chat history" className={iconButton}>
                    <History className="size-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[60] max-h-80 w-64 overflow-y-auto">
                  {chatted.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">No chats yet</p>
                  ) : chatted.map((conversation) => (
                    <DropdownMenuItem
                      key={conversation.id}
                      onSelect={() => selectConversation(conversation.id)}
                      className={cn("truncate", conversation.id === activeConversationId && "font-medium")}
                    >
                      {conversation.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <button type="button" onClick={onClose} aria-label="Close Ngai" title="Close Ngai" className={iconButton}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isMember ? (
        <AgentChat
          className="min-h-0 flex-1"
          messages={messages}
          conversations={conversations}
          activeConversationId={activeConversationId}
          sending={sending}
          firstName={firstName}
          onSend={send}
          onSelectConversation={selectConversation}
          onNewChat={reset}
          startingOptions={STARTING_OPTIONS}
          compact
        />
      ) : (
        <div className="m-auto max-w-xs px-6 text-center">
          <Image src="/ngai-logo.png" alt="" width={36} height={36} className="mx-auto rounded-full" />
          {loading ? null : user && appUser ? (
            <>
              <p className="mt-4 font-medium">Ngai is for members of {company.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">You&apos;re signed in with an account that isn&apos;t part of this company.</p>
            </>
          ) : (
            <>
              <p className="mt-4 font-medium">Sign in to use Ngai</p>
              <p className="mt-2 text-sm text-muted-foreground">Ask about your projects, invoices and anything about VisualCNS.</p>
              <Button type="button" className="mt-5" onClick={() => setLoginOpen(true)}>
                <LogIn className="size-4" aria-hidden="true" /> Sign in
              </Button>
            </>
          )}
        </div>
      )}

      <NgaiLoginDialog open={loginOpen} onOpenChange={setLoginOpen} onSignedIn={() => setLoginOpen(false)} companyName={company.name} />
    </div>
  )
}

/** Opens or closes the Ngai panel from anywhere on a company page, e.g. the header icon. */
const TOGGLE_EVENT = "ngai:toggle"

function useNgaiAvailable() {
  const { section } = useCompanyPage()
  // The Ngai section already is the chat.
  return section !== "ngai"
}

/** The Ngai icon in the company page header. */
export function NgaiCompanyHeaderButton() {
  const available = useNgaiAvailable()
  if (!available) return null
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(TOGGLE_EVENT))}
      aria-label="Ask Ngai"
      title="Ask Ngai"
      className="grid size-9 place-items-center rounded-full outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Image src="/ngai-logo.png" alt="" width={20} height={20} className="rounded-full" />
    </button>
  )
}

/**
 * Ngai on company pages: a chat panel opened from the header icon.
 * Members chat; anyone else is asked to sign in.
 */
export function NgaiWidget() {
  const available = useNgaiAvailable()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const toggle = () => setOpen((current) => !current)
    window.addEventListener(TOGGLE_EVENT, toggle)
    return () => window.removeEventListener(TOGGLE_EVENT, toggle)
  }, [])

  if (!available || !open) return null

  return (
    <AgentProvider surface="client_portal">
      <NgaiPanel onClose={() => setOpen(false)} />
    </AgentProvider>
  )
}
