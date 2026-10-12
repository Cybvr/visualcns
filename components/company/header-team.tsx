"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"

import { TeamInvitePanel, useTeamSeats } from "@/components/company/team-seats"
import { ShareLinkActions } from "@/components/dashboard/share-link-actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"


export interface HeaderTeamPerson {
  id: string
  name: string
  email?: string
  photoUrl?: string
}

/**
 * The Share button. Its window holds the link, inviting people to the team
 * (for the people who manage it) and who has access. Takes plain props
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
  const [shareOpen, setShareOpen] = useState(false)
  const canInvite = canManageTeam && Boolean(teamSeats.info)

  return (
    <div className={cn("flex shrink-0 items-center gap-2 print:hidden", className)}>
      <Button type="button" variant="ghost" className="h-9 gap-2 rounded-full px-3 bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent/80 active:bg-sidebar-accent/80 [&>svg]:size-[18px]" onClick={() => setShareOpen(true)}>
        <Share2 className="size-4" aria-hidden="true" />
        <span className="max-sm:hidden">Share</span>
      </Button>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share {company.name}</DialogTitle>
            <DialogDescription className="sr-only">Copy the link or invite people to the team.</DialogDescription>
          </DialogHeader>
          <ShareLinkActions url={shareUrl} label="Company link" shareText={`See ${company.name}'s company page`} />
          {canInvite && teamSeats.info && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">Invite to the team</p>
              <TeamInvitePanel info={teamSeats.info} call={teamSeats.call} onChange={() => void teamSeats.reload()} />
            </div>
          )}
          {people.length > 0 && (
            <div className="space-y-1 border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">People with access</p>
              <div className="max-h-56 overflow-y-auto">
                {people.map((person) => (
                  <div key={person.id} className="flex items-center gap-3 py-1.5">
                    <Avatar className="size-8">
                      {person.photoUrl && <AvatarImage src={person.photoUrl} alt="" referrerPolicy="no-referrer" />}
                      <AvatarFallback className="text-xs">{person.name.trim().charAt(0).toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{person.name}</span>
                      {person.email && <span className="block truncate text-xs text-muted-foreground">{person.email}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
