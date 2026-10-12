"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { History, LogIn, Plus } from "lucide-react"

import { AgentChat } from "@/components/agent/agent-chat"
import { AgentProvider, useAgent } from "@/components/agent/agent-context"
import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { NgaiLoginDialog } from "@/components/company/ngai-login-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const STARTING_OPTIONS = [
  "What's waiting on me?",
  "How are my campaigns going?",
  "Show me my outstanding invoices",
  "What is VisualCNS Pass?",
]

function NgaiTitleActions() {
  const { conversations, activeConversationId, sending, reset, selectConversation } = useAgent()
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const chatted = conversations.filter((conversation) => conversation.messages.length > 0)

  useEffect(() => {
    setSlot(document.getElementById("company-title-actions"))
  }, [])

  if (!slot) return null

  return createPortal(
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm">
            <History className="size-4" aria-hidden="true" />
            <span className="max-sm:hidden">History</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
          {chatted.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No chats yet</p>
          ) : chatted.map((conversation) => (
            <DropdownMenuItem
              key={conversation.id}
              onSelect={() => selectConversation(conversation.id)}
              className={cn("truncate", conversation.id === activeConversationId && "font-medium")}
            >
              {conversation.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button type="button" size="sm" onClick={reset} disabled={sending}>
        <Plus className="size-4" aria-hidden="true" />
        New
      </Button>
    </>,
    slot,
  )
}

function MemberNgai() {
  const { messages, conversations, activeConversationId, sending, firstName, send, reset, selectConversation } = useAgent()
  const { company, projects } = useCompanyPage()
  const campaignMentions = useMemo(() => [...projects]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((campaign) => ({
      type: "campaign" as const,
      id: campaign.id,
      label: campaign.title || "Untitled campaign",
      companyId: campaign.companyId || company.id,
    })), [projects, company.id])

  return (
    <>
      <NgaiTitleActions />
      <AgentChat
        className="h-[calc(100svh-8rem)] min-h-[26rem] md:h-[calc(100svh-10rem)]"
        messages={messages}
        conversations={conversations}
        activeConversationId={activeConversationId}
        sending={sending}
        firstName={firstName}
        onSend={send}
        onSelectConversation={selectConversation}
        onNewChat={reset}
        startingOptions={STARTING_OPTIONS}
        campaignMentions={campaignMentions}
      />
    </>
  )
}

export function NgaiSection() {
  const { company, canManageTeam } = useCompanyPage()
  const { user, appUser, loading } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const belongsToCompany = Boolean(appUser?.companyId) && appUser?.companyId === company.id
  const isAgencyAdmin = appUser?.role === "admin" || appUser?.role === "superadmin"
  const canUseNgai = belongsToCompany || canManageTeam

  if (canUseNgai) {
    return (
      <AgentProvider
        surface={isAgencyAdmin ? "agency_dashboard" : "client_portal"}
        companyContext={{ id: company.id, name: company.name }}
      >
        <MemberNgai />
      </AgentProvider>
    )
  }

  return (
    <div className="flex h-[calc(100svh-8rem)] min-h-[26rem] items-center justify-center px-4 text-center md:h-[calc(100svh-10rem)]">
      {!loading && (
        <div className="max-w-sm">
          <Image src="/ngai-logo.png" alt="Ngai" width={44} height={44} className="mx-auto rounded-full" priority />
          {user && appUser ? (
            <>
              <p className="mt-4 font-medium">Ngai is for members of {company.name}</p>
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
        </div>
      )}

      <NgaiLoginDialog open={loginOpen} onOpenChange={setLoginOpen} onSignedIn={() => setLoginOpen(false)} companyName={company.name} />
    </div>
  )
}
