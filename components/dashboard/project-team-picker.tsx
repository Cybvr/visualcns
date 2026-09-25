"use client"

import { useEffect, useMemo, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getUsersByCompanyId, type AppUser } from "@/lib/users"
import { updateProject, type Project } from "@/lib/projects"

export function ProjectTeamPicker({
  project,
  onPatched,
}: {
  project: Project
  onPatched?: (patch: Partial<Project>) => void
}) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [selected, setSelected] = useState<string[]>(project.teamMemberIds ?? [])
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    setSelected(project.teamMemberIds ?? [])
  }, [project.id, project.teamMemberIds])

  useEffect(() => {
    let active = true
    getUsersByCompanyId(project.companyId)
      .then((allUsers) => {
        if (!active) return
        setUsers(
          allUsers
            .filter((user) => Boolean(user.displayName?.trim() || user.email?.trim()))
            .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email)),
        )
      })
      .catch(() => {
        if (active) setUsers([])
      })
    return () => {
      active = false
    }
  }, [project.companyId])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  async function toggle(user: AppUser) {
    if (saving) return
    const next = selectedSet.has(user.uid)
      ? selected.filter((uid) => uid !== user.uid)
      : [...selected, user.uid]
    setSelected(next)
    setSaving(user.uid)
    try {
      await updateProject(project.id, { teamMemberIds: next })
      onPatched?.({ teamMemberIds: next })
    } catch {
      setSelected(selected)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-2">
      <Label>Team</Label>
      <p className="text-sm text-muted-foreground">Select from this client&apos;s team members.</p>
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No client team members available yet.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {users.map((user) => (
            <label key={user.uid} className="flex items-center gap-2 py-1 text-sm">
              <Checkbox
                checked={selectedSet.has(user.uid)}
                disabled={Boolean(saving)}
                onChange={() => void toggle(user)}
                aria-label={`Assign ${user.displayName || user.email}`}
              />
              <span className="min-w-0 truncate">{user.displayName || user.email}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
