"use client"

import { useMemo, useState } from "react"
import { User as UserIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { CompanyEmptyState } from "@/components/company/empty-state"
import { useCompanyPage, type CompanyPagePerson } from "@/components/company/company-page-context"
import { SectionAddButton } from "@/components/company/section-add-button"
import { TeamInvitePanel, useTeamSeats } from "@/components/company/team-seats"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

export function TeamSection() {
  const { company, people, allContacts, projects, admin, canManageTeam } = useCompanyPage()
  const { appUser } = useAuth()
  const teamSeats = useTeamSeats(company.id, canManageTeam)
  const [removedPersonIds, setRemovedPersonIds] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [contactIds, setContactIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const members = useMemo<Array<{ person: CompanyPagePerson; projects: string[] }>>(
    () => people
      .filter((person) => !removedPersonIds.includes(person.id))
      .map((person) => ({
        person,
        projects: projects
          .filter((project) => project.teamMemberIds?.includes(person.id))
          .map((project) => project.title),
      }))
      .sort((a, b) => a.person.name.localeCompare(b.person.name)),
    [people, projects, removedPersonIds],
  )

  const availableContacts = (allContacts ?? []).filter((person) => !people.some((current) => current.id === person.id))
  const matchingContacts = availableContacts.filter((person) => {
    const search = query.trim().toLowerCase()
    return !search || [person.name, person.subtitle, person.email, person.phone].filter(Boolean).join(" ").toLowerCase().includes(search)
  })

  function openDialog() {
    setContactIds([])
    setQuery("")
    setError(null)
    setDialogOpen(true)
  }

  async function saveMembers() {
    if (!admin?.onAddExistingContact || !contactIds.length || saving) return
    setSaving(true)
    setError(null)
    try {
      for (const contactId of contactIds) {
        await admin.onAddExistingContact(contactId)
      }
      await admin.reload()
      setDialogOpen(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not add the team members.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="sr-only">Team</h2>
        <span className="sidebar-nav-label text-muted-foreground">
          Team members{teamSeats.info ? ` · ${teamSeats.info.seats} of ${teamSeats.info.limit} seats` : ""}
        </span>
        {admin && <SectionAddButton label="Add team members" onClick={openDialog} />}
      </div>
      {canManageTeam && teamSeats.info && (
        <TeamInvitePanel info={teamSeats.info} call={teamSeats.call} onChange={() => void teamSeats.reload()} />
      )}

      {members.length === 0 ? (
        <CompanyEmptyState
          icon={UserIcon}
          title="No team members yet"
          description={admin ? "Use the add button to add contacts, or invite someone by email." : canManageTeam ? "Invite colleagues by email above." : undefined}
        />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map(({ person, projects: assignedProjects }) => (
            <MobileDataCard
              key={person.id}
              ariaLabel={`Open ${person.name}`}
              title={person.name}
              subtitle={
                [person.email, person.phone, assignedProjects.length ? assignedProjects.join(", ") : null]
                  .filter(Boolean)
                  .join(" · ") || "Team member"
              }
              imageUrl={person.photoUrl}
              icon={<UserIcon className="size-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />}
              menuLabel={`Options for ${person.name}`}
              menu={canManageTeam && person.id !== appUser?.uid && teamSeats.info?.staff.some((member) => member.id === person.id) ? (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    void teamSeats.removePerson(person.id)
                      .then(() => { setRemovedPersonIds((current) => [...current, person.id]); toast.success(`${person.name} removed from the team.`) })
                      .catch((reason) => toast.error(reason instanceof Error ? reason.message : "Couldn't remove them. Try again."))
                  }}
                >
                  Remove from team
                </DropdownMenuItem>
              ) : undefined}
            />
          ))}
        </div>
      )}

      {admin && (
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!saving) setDialogOpen(open)
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add team members</DialogTitle>
              <DialogDescription>Select one or more existing contacts to add to this client&apos;s team.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search contacts"
                aria-label="Search contacts"
              />
              {matchingContacts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                  {availableContacts.length ? "No contacts match your search." : "No unassigned contacts available."}
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-border p-2">
                  <div className="grid gap-1 sm:grid-cols-2">
                    {matchingContacts.map((person) => (
                      <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted">
                        <Checkbox
                          checked={contactIds.includes(person.id)}
                          disabled={saving}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked
                            setContactIds((current) => checked
                              ? [...current, person.id]
                              : current.filter((id) => id !== person.id))
                          }}
                          aria-label={`Add ${person.name} to the client team`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{person.name}</span>
                          {person.email && <span className="block truncate text-xs text-muted-foreground">{person.email}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="button" onClick={() => void saveMembers()} disabled={saving || contactIds.length === 0}>
                {saving ? "Adding…" : `Add team members${contactIds.length > 0 ? ` (${contactIds.length})` : ""}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
