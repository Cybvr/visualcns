"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useAgent, type AgentConversation } from "@/components/agent/agent-context"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { MobileCardsSkeleton } from "@/components/dashboard/collection-skeletons"
import { CompactListSkeleton, InitialAvatar, MOBILE_LIST_CARD, MobileListRow, CheckAvatar } from "@/components/dashboard/compact-list-row"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { Checkbox } from "@/components/ui/checkbox"
import { useRowSelection } from "@/hooks/use-row-selection"
import { DropdownMenuCheckboxItem, DropdownMenuItem } from "@/components/ui/dropdown-menu"

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

/** Today shows the time, older chats the day and month. */
function formatShortDate(value?: number) {
  if (!value) return ""
  const date = new Date(value)
  if (date.toDateString() === new Date().toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date)
  }
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(date)
}

export default function AllChatsPage() {
  const router = useRouter()
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AgentConversation | null>(null)
  const { conversations, conversationsLoading, activeConversationId, selectConversation, reset, deleteConversations } = useAgent()
  const { results: visibleChats, bar } = useFilterBar({
    items: conversations,
    search: searchChat,
    sorts: CHAT_SORTS,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })
  const selection = useRowSelection(visibleChats, (chat) => chat.id)

  async function handleBulkDelete() {
    if (selection.selectedCount === 0 || bulkDeleting) return
    setBulkDeleting(true)
    setDeleteError(null)
    try {
      await deleteConversations(selection.selectedIds)
      selection.clear()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Chats could not be deleted. Please try again.")
    } finally {
      setBulkDeleting(false)
    }
  }

  async function deleteChat(chat: AgentConversation) {
    setPendingDelete(null)
    setDeleteError(null)
    try {
      await deleteConversations([chat.id])
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Chat could not be deleted. Please try again.")
    }
  }

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
      <TableFilterBar
        {...bar}
        placeholder="Search chats"
        createAction={{ label: "New chat", onClick: startChat }}
      />
      {deleteError && <p role="alert" className="mb-3 text-sm text-destructive">{deleteError}</p>}

      {conversationsLoading ? (
        <>
          <div className="sm:hidden"><CompactListSkeleton /></div>
          <div className="hidden sm:block"><MobileCardsSkeleton /></div>
        </>
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
          <TableBulkBar
            count={selection.selectedCount}
            noun="chat"
            deleting={bulkDeleting}
            onClear={() => { selection.clear(); setDeleteError(null) }}
            onDelete={handleBulkDelete}
          />
          <div className="sm:hidden">
            {selection.selectedCount > 0 && (
              <label className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  aria-label="Select all chats"
                  checked={selection.allSelected}
                  indeterminate={selection.someSelected}
                  onChange={selection.toggleAll}
                />
                Select all chats
              </label>
            )}
            <ul className={MOBILE_LIST_CARD}>
              {visibleChats.map((chat) => {
                const title = chat.title || "Untitled chat"
                const selected = selection.isSelected(chat.id)
                return (
                  <li key={chat.id}>
                    <MobileListRow
                      avatar={selected ? (
                        <CheckAvatar />
                      ) : <InitialAvatar text={title} />}
                      avatarMenu={
                        <>
                          <DropdownMenuItem onSelect={() => openChat(chat)}>Open chat</DropdownMenuItem>
                          <DropdownMenuCheckboxItem checked={selected} onCheckedChange={() => selection.toggle(chat.id)}>
                            Select chat
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(chat)}>Delete chat</DropdownMenuItem>
                        </>
                      }
                      avatarLabel={`Options for ${title}`}
                      title={title}
                      meta={formatShortDate(chat.updatedAt)}
                      lines={[lastMessage(chat)]}
                      active={chat.id === activeConversationId || selected}
                      onClick={() => selection.selectedCount > 0 ? selection.toggle(chat.id) : openChat(chat)}
                      ariaLabel={selection.selectedCount > 0 ? `${selected ? "Deselect" : "Select"} ${title}` : `Open ${title}`}
                    />
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="hidden space-y-2 sm:block">
            <label className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
              <Checkbox aria-label="Select all chats" checked={selection.allSelected} indeterminate={selection.someSelected} onChange={selection.toggleAll} />
              Select all chats
            </label>
            {visibleChats.map((chat) => {
              const title = chat.title || "Untitled chat"
              const selected = selection.isSelected(chat.id)
              return <MobileDataCard
                key={chat.id}
                surface="muted"
                iconShape="circle"
                icon={<InitialAvatar text={title} className="size-11" />}
                title={title}
                subtitle={lastMessage(chat)}
                description={`${chat.messages.length} ${chat.messages.length === 1 ? "message" : "messages"}`}
                trailing={formatShortDate(chat.updatedAt)}
                selected={selected || chat.id === activeConversationId}
                pressed={selected}
                onClick={(event) => selection.selectedCount > 0 ? selection.toggle(chat.id, event.shiftKey) : openChat(chat)}
                ariaLabel={`${selected ? "Selected. " : ""}Open ${title}`}
                menuLabel={`Options for ${title}`}
                menu={<>
                  <DropdownMenuItem onSelect={() => openChat(chat)}>Open chat</DropdownMenuItem>
                  <DropdownMenuCheckboxItem checked={selected} onCheckedChange={() => selection.toggle(chat.id)}>Select chat</DropdownMenuCheckboxItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(chat)}>Delete chat</DropdownMenuItem>
                </>}
              />
            })}
          </div>
        </>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>{pendingDelete?.title || "This chat"} will be removed for good.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && void deleteChat(pendingDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
