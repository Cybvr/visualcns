"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"

import { Ngai } from "@/components/agent/ngai"
import { useAgent } from "@/components/agent/agent-context"

export default function AgentConversationPage() {
  const params = useParams<{ chatId: string }>()
  const chatId = params?.chatId ?? ""
  const { selectConversation } = useAgent()

  useEffect(() => {
    if (chatId) selectConversation(chatId)
  }, [chatId, selectConversation])

  return <Ngai scope={{ kind: "app" }} className="sm:px-6" />
}
