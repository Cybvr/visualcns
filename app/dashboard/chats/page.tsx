"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { useAgent, type AgentConversation } from "@/components/agent/agent-context"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableRowsSkeleton } from "@/components/dashboard/collection-skeletons"
import { CompactListSkeleton, InitialAvatar, MOBILE_LIST_CARD, MobileListRow, CheckAvatar } from "@/components/dashboard/compact-list-row"
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

function formatUpdatedAt(value?: number) {
  if (!value) return "—"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))
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
          <div className="hidden sm:block"><TableRowsSkeleton headers={["", "Chat", "Updated", ""]} /></div>
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

          <div className="hidden overflow-x-hidden sm:block">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-2">
                    <Checkbox
                      aria-label="Select all chats"
                      checked={selection.allSelected}
                      indeterminate={selection.someSelected}
                      onChange={selection.toggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-[27%]">Chat</TableHead>
                  <TableHead className="w-[39%]">Last message</TableHead>
                  <TableHead className="w-[16%]">Last modified</TableHead>
                  <TableHead className="w-[12%] text-right">Messages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleChats.map((chat) => (
                  <TableRow key={chat.id} className="cursor-pointer" onClick={() => openChat(chat)}>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        aria-label={`Select ${chat.title || "chat"}`}
                        checked={selection.isSelected(chat.id)}
                        onChange={(event) => selection.toggle(chat.id, (event.nativeEvent as MouseEvent).shiftKey)}
                      />
                    </TableCell>
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
