"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"

import { NgaiPage } from "@/components/agent/ngai-page"
import { useAgent } from "@/components/agent/agent-context"

export default function ChatConversationPage() {
  const params = useParams<{ chatId: string }>()
  const chatId = params?.chatId ?? ""
  const { selectConversation } = useAgent()

  useEffect(() => {
    if (chatId) selectConversation(chatId)
  }, [chatId, selectConversation])

  return <NgaiPage />
}
