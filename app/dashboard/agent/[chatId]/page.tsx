"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"

import { AgentChat } from "@/components/agent/agent-chat"
import { useAgent } from "@/components/agent/agent-context"

export default function AgentConversationPage() {
  const params = useParams<{ chatId: string }>()
  const chatId = params?.chatId ?? ""
  const { messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()

  useEffect(() => {
    if (chatId) selectConversation(chatId)
  }, [chatId, selectConversation])

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
