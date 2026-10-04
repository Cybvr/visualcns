"use client"

import { AgentChat } from "@/components/agent/agent-chat"
import { AgentProvider, useAgent } from "@/components/agent/agent-context"

const STARTING_OPTIONS = [
  "What's waiting on me?",
  "How are my projects going?",
  "What services do you offer?",
  "How does payment work?",
]

function NgaiChat() {
  const { messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()
  return (
    <AgentChat
      className="flex-1"
      messages={messages}
      conversations={conversations}
      activeConversationId={activeConversationId}
      sending={sending}
      firstName={firstName}
      onSend={send}
      onSelectConversation={selectConversation}
      onNewChat={reset}
      startingOptions={STARTING_OPTIONS}
    />
  )
}

/** Ngai for a company's own members: answers about their work and about the agency. */
export function NgaiSection() {
  return (
    <AgentProvider surface="client_portal">
      <div className="flex h-[calc(100svh-7rem)] min-h-[28rem] flex-col md:h-[calc(100svh-4rem)]">
        <NgaiChat />
      </div>
    </AgentProvider>
  )
}
