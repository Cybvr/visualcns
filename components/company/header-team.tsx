"use client"

import { useState } from "react"
import { Plus, Share2 } from "lucide-react"

import { TeamInvitePanel, useTeamSeats } from "@/components/company/team-seats"
import { ShareLinkActions } from "@/components/dashboard/share-link-actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const MAX_AVATARS = 4

export interface HeaderTeamPerson {
  id: string
  name: string
  email?: string
  photoUrl?: string
}

/**
 * The team as a cluster of avatars ending in a plus that opens the invite
 * modal (for the people who manage the team), then Share. Takes plain props
 * rather than reading the company page, because the dashboard renders it in
 * its top bar, outside the page.
 */
export function HeaderTeam({ company, people, canManageTeam, shareUrl, className }: {
  company: { id: string; name: string }
  people: HeaderTeamPerson[]
  canManageTeam: boolean
  shareUrl: string
  className?: string
}) {
  const teamSeats = useTeamSeats(company.id, canManageTeam)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const shown = people.slice(0, MAX_AVATARS)
  const extra = people.length - shown.length
  const canInvite = canManageTeam && Boolean(teamSeats.info)

  return (
    <div className={cn("flex shrink-0 items-center gap-2 print:hidden", className)}>
      {(people.length > 0 || canInvite) && (
        <div className="mr-1 flex -space-x-2" aria-label={`${people.length} team member${people.length === 1 ? "" : "s"}`}>
          {shown.map((person) => (
            <Avatar key={person.id} className="size-9 border-2 border-card" title={person.name}>
              {person.photoUrl && <AvatarImage src={person.photoUrl} alt={person.name} referrerPolicy="no-referrer" />}
              <AvatarFallback className="text-xs">{person.name.trim().charAt(0).toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
          ))}
          {extra > 0 && (
            <span className="grid size-9 place-items-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground">+{extra}</span>
          )}
          {canInvite && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              aria-label="Invite to team"
              title="Invite to team"
              className="grid size-9 place-items-center rounded-full border-2 border-card bg-muted text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      <Button type="button" variant="ghost" className="h-9 gap-2 rounded-full px-3 bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent/80 active:bg-sidebar-accent/80 [&>svg]:size-[18px]" onClick={() => setShareOpen(true)}>
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
          {people.length > 0 && (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              <p className="sidebar-nav-label text-muted-foreground">Members</p>
              {people.map((person) => (
                <div key={person.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                  <Avatar className="size-8">
                    {person.photoUrl && <AvatarImage src={person.photoUrl} alt="" referrerPolicy="no-referrer" />}
                    <AvatarFallback className="text-xs">{person.name.trim().charAt(0).toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{person.name}</span>
                    {person.email && <span className="block truncate text-xs text-muted-foreground">{person.email}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
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
