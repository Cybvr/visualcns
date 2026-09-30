"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageSquare, Plus } from "lucide-react"

import { useAgent, type AgentConversation } from "@/components/agent/agent-context"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"

const CHAT_SORTS: SortOption<AgentConversation>[] = [
  { value: "updatedAt", label: "Last modified", get: (chat) => chat.updatedAt, ascLabel: "Oldest", descLabel: "Newest" },
  { value: "title", label: "Chat", get: (chat) => chat.title, ascLabel: "A–Z", descLabel: "Z–A" },
]

function searchChat(chat: AgentConversation) {
  return [chat.title, ...chat.messages.map((message) => message.content)]
}

function lastMessage(chat: AgentConversation) {
  const message = [...chat.messages].reverse().find((item) => item.content.trim())
  return message?.content.replace(/\s+/g, " ").trim() || "No messages yet"
}

function formatUpdatedAt(value?: number) {
  if (!value) return "—"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))
}

export default function AllChatsPage() {
  const router = useRouter()
  const { conversations, conversationsLoading, activeConversationId, selectConversation, reset } = useAgent()
  const { results: visibleChats, bar } = useFilterBar({
    items: conversations,
    search: searchChat,
    sorts: CHAT_SORTS,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })

  function openChat(chat: AgentConversation) {
    selectConversation(chat.id)
    router.push(`/dashboard/agent/${encodeURIComponent(chat.id)}`)
  }

  function startChat() {
    reset()
    router.push("/dashboard/agent")
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <FilterBar
        {...bar}
        placeholder="Search chats"
        actions={<Button variant="ghost" className="bg-transparent text-foreground hover:bg-transparent" onClick={startChat}><Plus className="h-4 w-4" />New Chat</Button>}
      />

      {conversationsLoading ? (
        <DashboardPageSkeleton rows={6} />
      ) : conversations.length === 0 ? (
        <FirstRunState
          label="Chat"
          title="Your chats will appear here"
          description="Start a chat with Ngai and you can find it here later."
          action={<Button onClick={startChat}>New Chat</Button>}
        />
      ) : visibleChats.length === 0 ? (
        <EmptySearchState label="No chats match your search." />
      ) : (
        <>
          <ul className="space-y-2 sm:hidden">
            {visibleChats.map((chat) => (
              <li key={chat.id}>
                <MobileDataCard
                  title={chat.title || "Untitled chat"}
                  subtitle={<span className="flex flex-col gap-1"><span className="truncate">{lastMessage(chat)}</span><span>Modified {formatUpdatedAt(chat.updatedAt)}</span></span>}
                  icon={<MessageSquare className="size-5 text-muted-foreground" aria-hidden="true" />}
                  onClick={() => openChat(chat)}
                  selected={chat.id === activeConversationId}
                  ariaLabel={`Open ${chat.title || "chat"}`}
                />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-hidden sm:block">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">Chat</TableHead>
                  <TableHead className="w-[44%]">Last message</TableHead>
                  <TableHead className="w-[16%]">Last modified</TableHead>
                  <TableHead className="w-[12%] text-right">Messages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleChats.map((chat) => (
                  <TableRow key={chat.id} className="cursor-pointer" onClick={() => openChat(chat)}>
                    <TableCell className="max-w-0 font-medium">
                      <Link href={`/dashboard/agent/${encodeURIComponent(chat.id)}`} onClick={(event) => { event.stopPropagation(); selectConversation(chat.id) }} className="block truncate rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {chat.title || "Untitled chat"}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-0 text-muted-foreground"><span className="block truncate">{lastMessage(chat)}</span></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatUpdatedAt(chat.updatedAt)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{chat.messages.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </main>
  )
}
