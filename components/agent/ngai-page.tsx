"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, SquarePen } from "lucide-react"

import { DeleteChatDialog, Ngai, type NgaiChatRef } from "@/components/agent/ngai"
import { useAgent } from "@/components/agent/agent-context"
import { useSidebarTakeover } from "@/components/company/sidebar-takeover"
import { useHideMobileFooter } from "@/components/dashboard/page-title-context"

/** Ngai as a full page. New chat and past chats sit in the sidebar, as Email's folders do. */
export function NgaiPage() {
  const router = useRouter()
  const { conversations, activeConversationId, reset, selectConversation } = useAgent()
  const [deleting, setDeleting] = useState<NgaiChatRef | null>(null)
  useHideMobileFooter(true)

  const chats = conversations.filter((conversation) => conversation.messages.length > 0)
  const inSidebar = useSidebarTakeover({
    title: "Ngai",
    backLabel: "Back",
    action: {
      label: "New chat",
      icon: SquarePen,
      onClick: () => {
        reset()
        router.push("/dashboard/agent")
      },
    },
    items: chats.map((chat) => ({
      key: chat.id,
      label: chat.title,
      icon: MessageSquare,
      onDelete: () => setDeleting({ id: chat.id, title: chat.title }),
      deleteLabel: `Delete ${chat.title}`,
    })),
    active: activeConversationId,
    onSelect: (id) => {
      selectConversation(id)
      router.push(`/dashboard/agent/${encodeURIComponent(id)}`)
    },
  })

  return (
    <>
      <Ngai scope={{ kind: "app" }} className="sm:px-6" menuInSidebar={inSidebar} />
      <DeleteChatDialog chat={deleting} onClose={() => setDeleting(null)} />
    </>
  )
}
