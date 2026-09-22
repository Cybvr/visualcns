"use client"

import Image from "next/image"
import { History, Plus, X } from "lucide-react"

import { AgentChat } from "@/components/agent/agent-chat"
import { useAgent } from "@/components/agent/agent-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function DockHeader({ onReset, onClose, showReset, conversations, activeConversationId, onSelectConversation, sending }: { onReset: () => void; onClose: () => void; showReset: boolean; conversations: { id: string; title: string }[]; activeConversationId: string; onSelectConversation: (id: string) => void; sending: boolean }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Image src="/ngai-logo.png" alt="" width={20} height={20} className="rounded-full" />
        Ngai <span className="font-normal text-muted-foreground">/ Chat</span>
      </span>
      <div className="flex items-center gap-1">
        {/* Plus — new chat */}
        <button
          type="button"
          onClick={onReset}
          aria-label="New chat"
          title="New chat"
          disabled={sending}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
        {/* History — beside plus */}
        {conversations.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Chat history"
                title="Chat history"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <History className="size-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-60 overflow-y-auto">
              {conversations.map((conversation) => (
                <DropdownMenuItem
                  key={conversation.id}
                  onSelect={() => onSelectConversation(conversation.id)}
                  className={conversation.id === activeConversationId ? "font-medium truncate" : "truncate"}
                >
                  {conversation.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Ngai"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/**
 * Mobile-only Ngai surface (full-screen sheet), opened from the mobile footer nav's Ngai tab.
 * On desktop the NgaiSidePanel handles the right panel instead.
 */
export function AgentDock() {
  const { open, setOpen, messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
      <DockHeader
        onReset={reset}
        onClose={() => setOpen(false)}
        showReset={messages.length > 0}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        sending={sending}
      />
      <AgentChat messages={messages} conversations={conversations} activeConversationId={activeConversationId} sending={sending} firstName={firstName} onSend={send} onSelectConversation={selectConversation} onNewChat={reset} compact />
    </div>
  )
}
