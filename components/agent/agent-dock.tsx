"use client"
"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { ArrowUp, History, Loader2, Plus, RotateCcw, X } from "lucide-react"

import { AgentChat } from "@/components/agent/agent-chat"
import { useAgent, type AgentFile } from "@/components/agent/agent-context"
import { uploadFileToStorage } from "@/lib/documents"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function DockHeader({ onReset, onClose, showReset, conversations, activeConversationId, onSelectConversation, sending }: { onReset: () => void; onClose: () => void; showReset: boolean; conversations: { id: string; title: string }[]; activeConversationId: string; onSelectConversation: (id: string) => void; sending: boolean }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Image src="/ngai-logo.png" alt="" width={20} height={20} className="rounded-full" />
        Ngai <span className="font-normal text-muted-foreground">/ Chat</span>
      </span>
      <div className="flex items-center gap-1">
        {/* Plus — new chat */}
        <button
          type="button"
          onClick={onReset}
          aria-label="New chat"
          title="New chat"
          disabled={sending}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
        {/* History — beside plus */}
        {conversations.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Chat history"
                title="Chat history"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <History className="size-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-60 overflow-y-auto">
              {conversations.map((conversation) => (
                <DropdownMenuItem
                  key={conversation.id}
                  onSelect={() => onSelectConversation(conversation.id)}
                  className={conversation.id === activeConversationId ? "font-medium truncate" : "truncate"}
                >
                  {conversation.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Ngai"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/** Types the picker offers, matching the full Ngai composer. */
const DOCK_ACCEPT_ATTR = ".pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt"
const DOCK_ALLOWED_EXTENSION = /\.(pdf|png|jpe?g|gif|webp|heic|heif|svg|doc|docx|xls|xlsx|csv|txt)$/i

function isAllowedDockFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf" || DOCK_ALLOWED_EXTENSION.test(file.name)
}

function NgaiWidget() {
  const pathname = usePathname()
  const { send, setOpen } = useAgent()
  const [text, setText] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  if (pathname.startsWith("/portal") || pathname === "/dashboard/email") return null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = text.trim()
    if (!content || uploading) return
    send(content)
    setText("")
    setOpen(true)
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ""
    const files = picked.filter(isAllowedDockFile)
    if (!files.length) return
    setUploading(true)
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          url: await uploadFileToStorage(file),
          mimeType: file.type || "application/octet-stream",
        })),
      )
      const images = uploaded.filter((item) => item.mimeType.startsWith("image/")).map((item) => item.url)
      const docs: AgentFile[] = uploaded
        .filter((item) => !item.mimeType.startsWith("image/"))
        .map(({ name, url, mimeType }) => ({ name, url, mimeType }))
      // Send straight away with whatever text is typed, then open the panel to continue.
      send(text.trim(), images, docs)
      setText("")
      setOpen(true)
    } catch {
      // Upload failures surface in the full panel; keep the bar usable.
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={submit} className="fixed bottom-8 left-1/2 z-40 flex w-[min(calc(100vw-2rem),36rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <input ref={fileInput} type="file" accept={DOCK_ACCEPT_ATTR} multiple onChange={handleFiles} className="hidden" />
      {/* The Ngai logo doubles as the attach button. */}
      <button
        type="button"
        aria-label="Attach file"
        title="Attach file"
        disabled={uploading}
        onClick={() => fileInput.current?.click()}
        className="relative flex size-6 shrink-0 items-center justify-center rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <Image src="/ngai-logo.png" alt="" width={20} height={20} className="rounded-full" />
        )}
      </button>
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Ask Ngai about your work…"
        aria-label="Ask Ngai"
        className="h-9 min-w-0 flex-1 rounded-full border-0 bg-background px-4 text-sm outline-none focus-visible:ring-0"
      />
      <button type="submit" aria-label="Send to Ngai" disabled={!text.trim() || uploading} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50">
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
    </form>
  )
}

/**
 * Mobile-only Ngai surface (full-screen sheet).
 * On desktop the NgaiSidePanel inside DashboardShell handles the right panel.
 */
export function AgentDock() {
  const { open, setOpen, messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()

  return (
    <>
      {!open && <NgaiWidget />}

      {/* Mobile: full-screen sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <DockHeader
            onReset={reset}
            onClose={() => setOpen(false)}
            showReset={messages.length > 0}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={selectConversation}
            sending={sending}
          />
          <AgentChat messages={messages} conversations={conversations} activeConversationId={activeConversationId} sending={sending} firstName={firstName} onSend={send} onSelectConversation={selectConversation} onNewChat={reset} compact />
        </div>
      )}
    </>
  )
}
