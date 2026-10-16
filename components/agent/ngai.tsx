"use client"

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import { History, LogIn, Plus, X } from "lucide-react"

import { AgentChat } from "@/components/agent/agent-chat"
import { AgentProvider, useAgent } from "@/components/agent/agent-context"
import { useAuth } from "@/components/auth-provider"
import { useOptionalCompanyPage } from "@/components/company/company-page-context"
import { NgaiLoginDialog } from "@/components/company/ngai-login-dialog"
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
                className={cn("block truncate", conversation.id === activeConversationId && "font-medium")}
              >
                {conversation.title}
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
    </div>
  )
}

function NgaiConversation({ layout, startingOptions }: { layout: NgaiLayout; startingOptions?: string[] }) {
  const { messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()
  const page = useOptionalCompanyPage()
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
      className={cn("min-h-0 flex-1", layout === "page" && "mx-auto w-full max-w-4xl")}
      messages={messages}
      conversations={conversations}
      activeConversationId={activeConversationId}
      sending={sending}
      firstName={firstName}
      onSend={send}
      onSelectConversation={selectConversation}
      onNewChat={reset}
      startingOptions={startingOptions}
      campaignMentions={campaignMentions}
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
          <p className="mt-2 text-sm text-muted-foreground">Ask about your campaigns, invoices and anything about VisualCNS.</p>
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
export function Ngai({ scope, layout = "page", onClose, className }: { scope: NgaiScope; layout?: NgaiLayout; onClose?: () => void; className?: string }) {
  const access = useCompanyAccess()
  const pageRef = useRef<HTMLDivElement>(null)

  // A page runs from where it starts down to the bottom of the window, measured
  // rather than guessed, so the composer always sits at the bottom edge.
  useLayoutEffect(() => {
    const element = pageRef.current
    if (layout !== "page" || !element) return
    const fit = () => {
      const top = element.getBoundingClientRect().top + (element.closest("[data-slot=sidebar-inset]")?.scrollTop ?? 0)
      element.style.height = `${Math.max(416, window.innerHeight - top - 8)}px`
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [layout, access.allowed])

  const frame = (body: ReactNode) => (
    // A page takes the colour of the page it sits on; a panel is its own card.
    <div ref={pageRef} data-ngai-page={layout === "page" ? "" : undefined} className={cn("flex min-h-0 flex-col overflow-hidden", layout === "panel" && "h-full bg-card", className)}>
      {body}
    </div>
  )

  if (scope.kind === "app") {
    return frame(
      <>
        <NgaiHeader layout={layout} onClose={onClose} />
        <NgaiConversation layout={layout} />
      </>,
    )
  }

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
      {frame(
        <>
          <NgaiHeader layout={layout} onClose={onClose} />
          <NgaiConversation layout={layout} startingOptions={STARTING_OPTIONS[scope.kind]} />
        </>,
      )}
    </AgentProvider>
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
