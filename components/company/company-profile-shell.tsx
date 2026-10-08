"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Building2, ChevronRight, LogIn, Share2, UserPlus } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { BrandLockup } from "@/components/brand-lockup"
import { useCompanyPage } from "@/components/company/company-page-context"
import { NgaiWidget } from "@/components/company/ngai-widget"
import { TeamInvitePanel, useTeamSeats } from "@/components/company/team-seats"
import { ShareLinkActions } from "@/components/dashboard/share-link-actions"
import { NavUser } from "@/components/nav-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

function CompanyIdentity() {
  const { company } = useCompanyPage()
  return (
    <div className="flex h-12 min-w-0 flex-1 items-center overflow-hidden">
      {company.logoUrl ? (
        <BrandLockup
          logoSize={20}
          wordmarkScale={0.9}
          gapClassName="gap-1"
          className="min-w-0"
          textClassName="truncate"
          brandName={company.name}
          logoUrl={company.logoUrl}
        />
      ) : (
        <span className="inline-flex min-w-0 items-center gap-1 text-foreground">
          <span className="grid size-5 shrink-0 place-items-center text-xs font-semibold">{company.name.trim().charAt(0).toUpperCase() || "?"}</span>
          <span className="truncate text-lg">{company.name}</span>
        </span>
      )}
    </div>
  )
}

const AGENCY_GROUP = { label: "Agency", keys: ["projects", "tasks", "messages"] as string[] }

const MAX_AVATARS = 4

/**
 * Top right of the header: the team as a cluster of avatars, then Invite (for the
 * people who manage the team) and Share. Replaces the separate Team page.
 */
function HeaderTeam() {
  const { company, people, canManageTeam, absoluteUrl } = useCompanyPage()
  const teamSeats = useTeamSeats(company.id, canManageTeam)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const shown = people.slice(0, MAX_AVATARS)
  const extra = people.length - shown.length
  const shareUrl = absoluteUrl(`/${encodeURIComponent(company.slug || company.id)}`)

  return (
    <div className="ml-auto flex shrink-0 items-center gap-2 print:hidden">
      {people.length > 0 && (
        <div className="mr-1 flex -space-x-2" aria-label={`${people.length} team member${people.length === 1 ? "" : "s"}`}>
          {shown.map((person) => (
            <Avatar key={person.id} className="size-8 border-2 border-card" title={person.name}>
              {person.photoUrl && <AvatarImage src={person.photoUrl} alt={person.name} referrerPolicy="no-referrer" />}
              <AvatarFallback className="text-xs">{person.name.trim().charAt(0).toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
          ))}
          {extra > 0 && (
            <span className="grid size-8 place-items-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground">+{extra}</span>
          )}
        </div>
      )}
      {canManageTeam && teamSeats.info && (
        <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-4" aria-hidden="true" />
          <span className="max-sm:hidden">Invite</span>
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => setShareOpen(true)}>
        <Share2 className="size-4" aria-hidden="true" />
        <span className="max-sm:hidden">Share</span>
      </Button>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite to {company.name}</DialogTitle>
            <DialogDescription>
              {teamSeats.info ? (teamSeats.info.limit === null ? `${teamSeats.info.seats} seats in use.` : `${teamSeats.info.seats} of ${teamSeats.info.limit} seats in use.`) : "Invite a colleague by email."}
            </DialogDescription>
          </DialogHeader>
          {teamSeats.info && <TeamInvitePanel info={teamSeats.info} call={teamSeats.call} onChange={() => void teamSeats.reload()} />}
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share company page</DialogTitle>
            <DialogDescription>Copy this link to share {company.name}&apos;s page.</DialogDescription>
          </DialogHeader>
          <ShareLinkActions url={shareUrl} label="Company link" shareText={`See ${company.name}'s company page`} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** The dashboard's account menu when signed in, a sign-in button for visitors. */
function SidebarAccount() {
  const { company } = useCompanyPage()
  const { user } = useAuth()

  if (user) return <NavUser />
  if (!company.slug) return null
  return (
    <Button asChild className="w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
      <Link href={`/${encodeURIComponent(company.slug)}/sign-in`} aria-label="Sign in">
        <LogIn className="hidden size-4 group-data-[collapsible=icon]:block" aria-hidden="true" />
        <span className="group-data-[collapsible=icon]:hidden">Sign in</span>
      </Link>
    </Button>
  )
}


/**
 * The public company page frame, built from the same pieces as the dashboard
 * shell: SidebarProvider + Sidebar + SidebarInset, with the content in the white
 * card on the tinted background and the page header inside the card.
 */
export function CompanyProfileShell({ children }: { children: ReactNode }) {
  const { company, sections, section, sectionHref } = useCompanyPage()
  const sectionLabel = sections.find((item) => item.key === section)?.label

  // Jobs, Tasks and Messages sit together under one Agency dropdown, where the first of them falls.
  type SectionItem = (typeof sections)[number]
  const entries: Array<{ type: "item"; item: SectionItem } | { type: "group"; items: SectionItem[] }> = []
  for (const item of sections) {
    if (!AGENCY_GROUP.keys.includes(item.key)) entries.push({ type: "item", item })
    else {
      const group = entries.find((entry) => entry.type === "group")
      if (group && group.type === "group") group.items.push(item)
      else entries.push({ type: "group", items: [item] })
    }
  }

  function renderItem(item: SectionItem) {
    const Icon = item.icon
    return (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton
          asChild
          isActive={section === item.key}
          tooltip={item.label}
          className="h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5"
        >
          <Link href={sectionHref(item.key)}>
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            <span className="sidebar-nav-label">{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <div className="dashboard-body flex h-svh flex-col overflow-hidden bg-background font-sans [&_*]:font-sans">
      <SidebarProvider className="!min-h-0 flex-1">
        <Sidebar collapsible="icon" className="dashboard-sidebar bg-sidebar text-foreground group-data-[side=left]:!border-r-0 print:hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
            <SidebarHeader className="group-data-[collapsible=icon]:p-1">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <CompanyIdentity />
                </div>
                <SidebarTrigger className="size-8 shrink-0" />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup className="group-data-[collapsible=icon]:p-1">
                <SidebarMenu className="gap-0.5 max-md:gap-1.5">
                  {entries.map((entry) => {
                    if (entry.type === "item") return renderItem(entry.item)
                    const open = entry.items.some((item) => item.key === section)
                    return (
                      <Collapsible key="agency-group" asChild defaultOpen={open} className="group/collapsible">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={AGENCY_GROUP.label} className="h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5">
                              <Building2 className="h-4 w-4" aria-hidden="true" />
                              <span className="sidebar-nav-label">{AGENCY_GROUP.label}</span>
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" aria-hidden="true" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="gap-0.5">
                              {entry.items.map((item) => {
                                const Icon = item.icon
                                return (
                                  <SidebarMenuSubItem key={item.key}>
                                    <SidebarMenuSubButton asChild isActive={section === item.key} className="h-9 gap-2 px-2 max-md:h-11 max-md:min-h-11 max-md:gap-3 max-md:px-3">
                                      <Link href={sectionHref(item.key)}>
                                        {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                                        <span className="sidebar-nav-label">{item.label}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="group-data-[collapsible=icon]:p-1">
              <SidebarAccount />
            </SidebarFooter>
          </div>
          <SidebarRail />
        </Sidebar>

        {/* The inset itself is the full-height scroller, flush to the window's right edge,
            so its scrollbar is the window's. The header sits on the tinted background and
            sticky strips in that colour hide content passing the card's edges. */}
        <SidebarInset className="min-h-0 overflow-y-auto bg-card md:bg-sidebar">
          <header className="surface-nav sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-card px-4 text-foreground max-md:border-b max-md:border-border md:bg-sidebar print:hidden md:after:pointer-events-none md:after:absolute md:after:left-0 md:after:top-full md:after:size-4 md:after:bg-[radial-gradient(circle_at_100%_100%,transparent_15.5px,var(--sidebar)_16px)]">
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 max-md:data-[orientation=vertical]:h-6" />
            </div>
            <h1 className="surface-title min-w-0 truncate max-md:[--surface-title-size:17px]">{sectionLabel ?? company.name}</h1>
            <HeaderTeam />
          </header>
          <main className="min-w-0 flex-1 bg-card px-4 pb-16 pt-4 sm:px-6 sm:pt-6 md:rounded-tl-2xl lg:px-8">
            {children}
          </main>
          <div
            aria-hidden="true"
            className="pointer-events-none sticky bottom-0 z-40 hidden h-3 shrink-0 bg-sidebar after:absolute after:bottom-full after:left-0 after:size-4 after:bg-[radial-gradient(circle_at_100%_0%,transparent_15.5px,var(--sidebar)_16px)] print:hidden md:block"
          />
        </SidebarInset>

        <NgaiWidget />
      </SidebarProvider>
    </div>
  )
}
