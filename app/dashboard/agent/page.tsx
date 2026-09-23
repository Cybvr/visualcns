"use client"

import { AgentChat } from "@/components/agent/agent-chat"
import { useAgent } from "@/components/agent/agent-context"

/** Full-page Ngai surface for the dashboard navigation link. */
export default function AgentPage() {
  const { messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()

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
