"use client"

import { useMemo } from "react"
import { History, SquarePen } from "lucide-react"

import { AgentChat } from "@/components/agent/agent-chat"
import { useAgent } from "@/components/agent/agent-context"
import { usePageHeaderActions } from "@/components/dashboard/page-title-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/** The dashboard home is Ngai. The old overview of projects, tasks and activity lives at /dashboard/overview. */
export default function DashboardHomePage() {
  const { messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()

  // Past chats sit behind one icon in the top bar.
  const historyButton = useMemo(
    () =>
      conversations.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Chat history"
              title="Chat history"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <History className="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
            <DropdownMenuItem onSelect={reset} disabled={sending}>
              <SquarePen aria-hidden="true" />
              <span>New chat</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {conversations.map((conversation) => (
              <DropdownMenuItem
                key={conversation.id}
                onSelect={() => selectConversation(conversation.id)}
                className={cn("block truncate", conversation.id === activeConversationId && "font-semibold")}
              >
                {conversation.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null,
    [activeConversationId, conversations, reset, selectConversation, sending],
  )
  usePageHeaderActions(historyButton)

  return <AgentChat
    className="mx-auto w-full max-w-4xl flex-1 sm:px-6 sm:py-6"
    messages={messages}
    conversations={conversations}
    activeConversationId={activeConversationId}
    sending={sending}
    firstName={firstName}
    onSend={send}
    onSelectConversation={selectConversation}
    onNewChat={reset}
  />
}
