"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { History, LogIn, Plus, SquarePen, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { AgentChat } from "@/components/agent/agent-chat"
import { AgentProvider, useAgent } from "@/components/agent/agent-context"
import { useAuth } from "@/components/auth-provider"
import { useOptionalCompanyPage } from "@/components/company/company-page-context"
import { DocumentArtifact, type ArtifactRef } from "@/components/dashboard/document-artifact"
import { NgaiLoginDialog } from "@/components/company/ngai-login-dialog"
import { useSidebarTakeover } from "@/components/company/sidebar-takeover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * What Ngai is looking at. "app" uses the dashboard's shared conversation, so
 * the side panel, the phone sheet and the pages all show the same chat.
 * "company" and "campaign" keep a chat of their own, focused on that record.
 */
export type NgaiScope =
  | { kind: "app" }
  | { kind: "company" }
  | { kind: "campaign"; campaign: { id: string; title: string } }

/** "page" fills a page or tab; "panel" is a narrow box with a close button. */
export type NgaiLayout = "page" | "panel"

const STARTING_OPTIONS: Record<Exclude<NgaiScope["kind"], "app">, string[]> = {
  company: [
    "What's waiting on me?",
    "How are my campaigns going?",
    "Show me my outstanding invoices",
    "What is VisualCNS Pass?",
  ],
  campaign: [
    "What's left to do on this campaign?",
    "Draft three post ideas for it",
    "Suggest creators who fit it",
    "How is it going so far?",
  ],
}

const iconButton = "flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

/** New chat, past chats and (in a panel) close. The same buttons on every Ngai. */
function NgaiHeader({ layout, onClose }: { layout: NgaiLayout; onClose?: () => void }) {
  const { conversations, activeConversationId, sending, reset, selectConversation } = useAgent()
  const chatted = conversations.filter((conversation) => conversation.messages.length > 0)
  const [deleting, setDeleting] = useState<NgaiChatRef | null>(null)
  return (
    // A page already has its title, so the page header is just the buttons.
    <div className={cn("flex shrink-0 items-center justify-between gap-2", layout === "panel" ? "h-14 border-b border-border px-4" : "h-10 justify-end")}>
      {layout === "panel" && (
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Image src="/ngai-logo.png" alt="" width={20} height={20} className="rounded-full" />
          Ngai
        </div>
      )}
      <div className="flex items-center gap-1">
        <button type="button" onClick={reset} disabled={sending} aria-label="New chat" title="New chat" className={iconButton}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Chat history" title="Chat history" className={iconButton}>
              <History className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[110] max-h-80 w-64 overflow-y-auto">
            {chatted.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No chats yet</p>
            ) : chatted.map((conversation) => (
              <DropdownMenuItem
                key={conversation.id}
                onSelect={() => selectConversation(conversation.id)}
                className={cn("group flex items-center gap-2 pr-1", conversation.id === activeConversationId && "font-medium")}
              >
                <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                {/* Shown on hover (always on touch screens); opens the confirm dialog rather than the chat. */}
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => { event.preventDefault(); event.stopPropagation(); setDeleting({ id: conversation.id, title: conversation.title }) }}
                  aria-label={`Delete ${conversation.title}`}
                  title="Delete chat"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-muted hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 group-focus:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close Ngai" title="Close Ngai" className={iconButton}>
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <DeleteChatDialog chat={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}

export type NgaiChatRef = { id: string; title: string }

/** Asks before deleting a past chat, from the history menu or the sidebar. */
export function DeleteChatDialog({ chat, onClose }: { chat: NgaiChatRef | null; onClose: () => void }) {
  const { deleteConversations } = useAgent()
  const [busy, setBusy] = useState(false)

  async function confirmDelete() {
    if (!chat || busy) return
    setBusy(true)
    try {
      await deleteConversations([chat.id])
      onClose()
    } catch {
      toast.error("The chat could not be deleted. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={chat !== null} onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <AlertDialogContent className="z-[120]">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
          <AlertDialogDescription>&ldquo;{chat?.title}&rdquo; will be deleted for good.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={busy} onClick={(event) => { event.preventDefault(); void confirmDelete() }}>
            {busy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function NgaiConversation({ layout, startingOptions, onOpenArtifact, activeArtifactId }: { layout: NgaiLayout; startingOptions?: string[]; onOpenArtifact: (artifact: ArtifactRef) => void; activeArtifactId?: string }) {
  const { messages, conversations, activeConversationId, sending, send, rateResponse, reset, selectConversation } = useAgent()
  const pathname = usePathname()
  const router = useRouter()
  const page = useOptionalCompanyPage()

  function startNewChat() {
    reset()
    if (/^\/dashboard\/chat\/[^/]+$/.test(pathname ?? "")) router.push("/dashboard/chat")
  }

  // A document Ngai has just made opens by itself; documents in older chats wait to be clicked.
  // The reply being written while `sending` is the one whose documents may open.
  const streaming = useRef<string | null>(null)
  useEffect(() => {
    const last = messages.at(-1)
    if (sending) {
      if (last?.role === "assistant") streaming.current = last.id
      return
    }
    if (!last || last.id !== streaming.current) return
    streaming.current = null
    const latest = last.artifacts?.at(-1)
    if (latest) onOpenArtifact(latest)
  }, [messages, sending, onOpenArtifact])

  // On a company page, any of its campaigns can be picked with @.
  const campaignMentions = useMemo(() => page ? [...page.projects]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((campaign) => ({
      type: "campaign" as const,
      id: campaign.id,
      label: campaign.title || "Untitled campaign",
      companyId: campaign.companyId || page.company.id,
    })) : undefined, [page])

  return (
    <AgentChat
      className={cn("h-0 min-h-0 flex-1", layout === "page" && "mx-auto w-full max-w-4xl")}
      messages={messages}
      conversations={conversations}
      activeConversationId={activeConversationId}
      sending={sending}
      onSend={send}
      onFeedback={rateResponse}
      onSelectConversation={selectConversation}
      onNewChat={startNewChat}
      startingOptions={startingOptions}
      campaignMentions={campaignMentions}
      onOpenArtifact={onOpenArtifact}
      activeArtifactId={activeArtifactId}
      compact={layout === "panel"}
    />
  )
}

/** Who may chat on a company page: its own people and the agency that runs it. */
function useCompanyAccess() {
  const page = useOptionalCompanyPage()
  const { user, appUser, role, loading } = useAuth()
  if (!page) return { allowed: true, page: null, user, appUser, loading, surface: "agency_dashboard" as const }
  const { company, canManageTeam } = page
  // `appUser` can be the client an admin is viewing as, so use the signed-in
  // role for authority and keep regular admins inside their own agency.
  const isAgencyAdmin = role === "superadmin" || (role === "admin" && Boolean(appUser?.agencyId) && appUser?.agencyId === company.agencyId)
  const isMember = Boolean(appUser?.companyId) && appUser?.companyId === company.id
  return {
    allowed: isMember || canManageTeam || isAgencyAdmin,
    page,
    user,
    appUser,
    loading,
    surface: isAgencyAdmin ? "agency_dashboard" as const : "client_portal" as const,
  }
}

function NgaiSignIn({ companyName }: { companyName: string }) {
  const { user, appUser, loading } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  return (
    <div className="m-auto max-w-xs px-6 py-10 text-center">
      <Image src="/ngai-logo.png" alt="" width={40} height={40} className="mx-auto rounded-full" />
      {loading ? null : user && appUser ? (
        <>
          <p className="mt-4 font-medium">Ngai is for members of {companyName}</p>
          <p className="mt-2 text-sm text-muted-foreground">You&apos;re signed in with an account that isn&apos;t part of this company.</p>
        </>
      ) : (
        <>
          <p className="mt-4 font-medium">Sign in to use Ngai</p>
          <Button type="button" className="mt-5" onClick={() => setLoginOpen(true)}>
            <LogIn className="size-4" aria-hidden="true" />
            Sign in
          </Button>
        </>
      )}
      <NgaiLoginDialog open={loginOpen} onOpenChange={setLoginOpen} onSignedIn={() => setLoginOpen(false)} companyName={companyName} />
    </div>
  )
}

/**
 * Ngai, wherever it appears. It brings its own conversation (or uses the
 * dashboard's), the New and History buttons, the @ campaign picker, the sign-in
 * gate on company pages and its own sizing. The parent only gives it room:
 * a page or tab of fixed height, or a panel.
 */
export function Ngai({ scope, layout = "page", onClose, menuInSidebar = false, className }: { scope: NgaiScope; layout?: NgaiLayout; onClose?: () => void; /** New chat and past chats are in the sidebar, so the page drops its own buttons for them. */ menuInSidebar?: boolean; className?: string }) {
  const access = useCompanyAccess()
  const pageRef = useRef<HTMLDivElement>(null)

  // A page runs from where it starts down to the bottom of the window, measured
  // rather than guessed, so the composer always sits at the bottom edge.
  useLayoutEffect(() => {
    const element = pageRef.current
    if (layout !== "page" || !element) return
    const scroller = element.closest("[data-slot=sidebar-inset]")
    const fit = () => {
      const top = element.getBoundingClientRect().top + (scroller?.scrollTop ?? window.scrollY)
      // The page's own bottom margin and padding sit below the frame.
      const main = element.closest("main:not([data-slot])")
      const below = main ? parseFloat(getComputedStyle(main).paddingBottom) + parseFloat(getComputedStyle(main).marginBottom) : 0
      // Never taller than the room left, however short the window.
      element.style.height = `${Math.max(200, Math.floor(window.innerHeight - top - below - 4))}px`
    }
    fit()
    // Headers, fonts and covers above can settle after the first paint, so fit again whenever the layout moves.
    const frameId = requestAnimationFrame(fit)
    const observer = new ResizeObserver(fit)
    observer.observe(document.body)
    if (element.parentElement) observer.observe(element.parentElement)
    window.addEventListener("resize", fit)
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener("resize", fit)
    }
  }, [layout, access.allowed])

  const [artifact, setArtifact] = useState<ArtifactRef | null>(null)
  const { role } = useAuth()
  const isAgency = role === "admin" || role === "superadmin"

  const frame = (body: ReactNode) => (
    // A page takes the colour of the page it sits on; a panel is its own card.
    <div ref={pageRef} data-ngai-page={layout === "page" ? "" : undefined} className={cn("flex min-h-0 flex-col overflow-hidden", layout === "panel" && "h-full bg-card", className)}>
      {body}
    </div>
  )

  // The chat, and beside it any document Ngai made, like an artifact in Claude or ChatGPT.
  // On a wide page they sit side by side; in a narrow panel or on a phone the document
  // takes the space, and closing it goes back to the chat.
  const chat = (startingOptions?: string[], chatsInSidebar = menuInSidebar) => (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className={cn("flex min-w-0 flex-1 flex-col", artifact && (layout === "panel" ? "hidden" : "max-md:hidden"))}>
        {!chatsInSidebar && <NgaiHeader layout={layout} onClose={onClose} />}
        <NgaiConversation layout={layout} startingOptions={startingOptions} onOpenArtifact={setArtifact} activeArtifactId={artifact?.id} />
      </div>
      {artifact && (
        <DocumentArtifact
          artifact={artifact}
          canEdit={isAgency}
          fullHref={isAgency ? `/dashboard/${artifact.kind}s/${encodeURIComponent(artifact.id)}` : undefined}
          onClose={() => setArtifact(null)}
          className={cn("w-full shrink-0", layout === "page" && "md:w-[min(48rem,55%)] md:border-l md:border-border")}
        />
      )}
    </div>
  )

  if (scope.kind === "app") return frame(chat())

  if (!access.page) throw new Error("A company or campaign Ngai needs a company page around it.")
  const { company } = access.page
  if (!access.allowed) {
    return frame(
      <>
        {onClose && <NgaiHeaderStatic onClose={onClose} />}
        <NgaiSignIn companyName={company.name} />
      </>,
    )
  }

  return (
    <AgentProvider
      key={scope.kind === "campaign" ? `campaign-${scope.campaign.id}` : `company-${company.id}`}
      surface={access.surface}
      companyContext={{ id: company.id, name: company.name }}
      campaignContext={scope.kind === "campaign" ? scope.campaign : undefined}
    >
      {layout === "page" && scope.kind === "company"
        ? <NgaiSidebarChats>{(inSidebar) => frame(chat(STARTING_OPTIONS[scope.kind], inSidebar))}</NgaiSidebarChats>
        : frame(chat(STARTING_OPTIONS[scope.kind]))}
    </AgentProvider>
  )
}

/** On the company page, New chat and past chats sit in the sidebar, as they do on the app's own Ngai page. */
function NgaiSidebarChats({ children }: { children: (inSidebar: boolean) => ReactNode }) {
  const { conversations, activeConversationId, reset, selectConversation } = useAgent()
  const [deleting, setDeleting] = useState<NgaiChatRef | null>(null)
  const chats = conversations.filter((conversation) => conversation.messages.length > 0)
  const inSidebar = useSidebarTakeover({
    title: "Assistant",
    backLabel: "Back",
    action: { label: "New chat", icon: SquarePen, onClick: reset },
    items: chats.map((chat) => ({
      key: chat.id,
      label: chat.title,
      onDelete: () => setDeleting({ id: chat.id, title: chat.title }),
      deleteLabel: `Delete ${chat.title}`,
    })),
    active: activeConversationId,
    onSelect: selectConversation,
  })
  return (
    <>
      {children(inSidebar)}
      <DeleteChatDialog chat={deleting} onClose={() => setDeleting(null)} />
    </>
  )
}

/** The header for a signed-out panel, which has no chats to list. */
function NgaiHeaderStatic({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Image src="/ngai-logo.png" alt="" width={20} height={20} className="rounded-full" />
        Ngai
      </div>
      <button type="button" onClick={onClose} aria-label="Close Ngai" title="Close Ngai" className={iconButton}>
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
