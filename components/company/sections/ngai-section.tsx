"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { History, Plus } from "lucide-react"

import { AgentChat } from "@/components/agent/agent-chat"
import { AgentProvider, useAgent, type AgentFile } from "@/components/agent/agent-context"
import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { NgaiLoginDialog } from "@/components/company/ngai-login-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const STARTING_OPTIONS = [
  "What's waiting on me?",
  "How are my projects going?",
  "What services do you offer?",
  "How does payment work?",
]

type PendingMessage = { text: string; images?: string[]; files?: AgentFile[] }

const iconButton = "flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

function NgaiChat() {
  const { company } = useCompanyPage()
  const { user, appUser, loading } = useAuth()
  const { messages, conversations, conversationsLoading, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()
  const [pending, setPending] = useState<PendingMessage | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)

  const isMember = appUser?.role === "client" && Boolean(appUser.companyId) && appUser.companyId === company.id
  const signedInElsewhere = Boolean(user && appUser && !isMember)

  // A message typed before signing in goes out once the member's chats have loaded.
  useEffect(() => {
    if (!pending || !isMember || conversationsLoading || sending) return
    send(pending.text, pending.images, pending.files)
    setPending(null)
  }, [pending, isMember, conversationsLoading, sending, send])

  function onSend(text: string, images?: string[], files?: AgentFile[]) {
    if (isMember) return send(text, images, files)
    setPending({ text, images, files })
    if (!user) setLoginOpen(true)
  }

  const chatted = conversations.filter((conversation) => conversation.messages.length > 0)

  return (
    <>
      <div className="flex h-12 shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Image src="/ngai-logo.png" alt="" width={20} height={20} className="rounded-full" />
          Ngai
        </div>
        {isMember && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={reset} disabled={sending} aria-label="New chat" title="New chat" className={iconButton}>
              <Plus className="size-4" aria-hidden="true" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Chat history" title="Chat history" className={iconButton}>
                  <History className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
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
          </div>
        )}
      </div>
      {signedInElsewhere && !loading ? (
        <div className="m-auto max-w-sm text-center">
          <p className="font-medium">Ngai here is for members of {company.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">You&apos;re signed in with an account that isn&apos;t part of this company.</p>
        </div>
      ) : (
        <AgentChat
          className="flex-1"
          messages={messages}
          conversations={conversations}
          activeConversationId={activeConversationId}
          sending={sending || Boolean(pending && user)}
          firstName={firstName}
          onSend={onSend}
          onSelectConversation={selectConversation}
          onNewChat={reset}
          startingOptions={STARTING_OPTIONS}
        />
      )}
      <NgaiLoginDialog
        open={loginOpen}
        onOpenChange={(open) => {
          setLoginOpen(open)
          // Closed without signing in: drop the waiting message.
          if (!open) setPending(null)
        }}
        onSignedIn={() => setLoginOpen(false)}
        companyName={company.name}
      />
    </>
  )
}

/**
 * Ngai for a company's own members: answers about their work and about the
 * agency. Anyone can type; sending asks them to sign in first.
 */
export function NgaiSection() {
  return (
    <AgentProvider surface="client_portal">
      <div className="flex h-[calc(100svh-7rem)] min-h-[28rem] flex-col md:h-[calc(100svh-4rem)]">
        <NgaiChat />
      </div>
    </AgentProvider>
  )
}
