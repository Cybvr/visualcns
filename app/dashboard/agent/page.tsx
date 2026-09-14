"use client"

import { AgentChat } from "@/components/agent/agent-chat"
import { useAgent } from "@/components/agent/agent-context"

/** Full-page Ngai surface for the dashboard navigation link. */
export default function AgentPage() {
  const { messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()

  return (
    <main className="mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
      <AgentChat
        messages={messages}
        conversations={conversations}
        activeConversationId={activeConversationId}
        sending={sending}
        firstName={firstName}
        onSend={send}
        onSelectConversation={selectConversation}
        onNewChat={reset}
      />
    </main>
  )
}
