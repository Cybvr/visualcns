"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { getOrganizations } from "@/lib/organizations"
import { createProject, updateProject, type Project, type ProjectStatus } from "@/lib/projects"
import { getUsers } from "@/lib/users"

type CompanyOption = { id: string; name: string }

type FormState = {
  companyId: string
  title: string
  service: string
  description: string
  status: ProjectStatus
  progress: string
  dueDate: string
  teamMemberIds: string[]
}

const EMPTY_FORM: FormState = {
  companyId: "",
  title: "",
  service: "",
  description: "",
  status: "in-progress",
  progress: "0",
  dueDate: "",
  teamMemberIds: [],
}

interface ClientProjectFormProps {
  project?: Project | null
  initialCompanyId?: string
  onSaved: (id: string) => void
  onCancel: () => void
}

export function ClientProjectForm({ project, initialCompanyId, onSaved, onCancel }: ClientProjectFormProps) {
  const isEdit = Boolean(project)
  // When the caller already knows the client (e.g. opened from that company's
  // own page), there's nothing to pick — skip the field instead of asking.
  const showCompanyField = isEdit || !initialCompanyId
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [teamMembers, setTeamMembers] = useState<{ uid: string; name: string }[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getUsers(), getOrganizations()])
      .then(([users, organizations]) => {
        setTeamMembers(
          users
            .filter((user) => user.role === "admin" || user.role === "superadmin")
            .filter((user) => Boolean(user.displayName?.trim() || user.email?.trim()))
            .map((user) => ({ uid: user.uid, name: user.displayName || user.email }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        )
        const orgNames = new Map(organizations.map((org) => [org.id, org.name]))
        // Several people can share a workspace, so this is deduped to one row
        // per companyId, preferring the organization's own name.
        const byWorkspace = new Map<string, string>()
        for (const user of users) {
          if (user.role !== "client" || !user.companyId) continue
          if (byWorkspace.has(user.companyId)) continue
          byWorkspace.set(user.companyId, orgNames.get(user.companyId) || user.company || user.displayName || user.email)
        }
        setCompanies(
          Array.from(byWorkspace, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
        )
      })
      .catch((err) => console.error("Error loading companies:", err))
      .finally(() => setClientsLoading(false))
  }, [])

  useEffect(() => {
    if (project) {
      setForm({
        companyId: project.companyId ?? "",
        title: project.title ?? "",
        service: project.service ?? "",
        description: project.description ?? "",
        status: project.status ?? EMPTY_FORM.status,
        progress: String(project.progress ?? 0),
        dueDate: project.dueDate ?? "",
        teamMemberIds: project.teamMemberIds ?? [],
      })
    } else {
      setForm({ ...EMPTY_FORM, companyId: initialCompanyId ?? "" })
    }
    setError(null)
  }, [project, initialCompanyId])

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setError(null)

    if (!form.companyId) {
      setError("Pick which client this project belongs to.")
      return
    }
    if (!form.title.trim()) {
      setError("Project title is required.")
      return
    }

    const company = companies.find((c) => c.id === form.companyId)
    const payload = {
      companyId: form.companyId,
      client: company?.name || project?.client || form.companyId,
      title: form.title.trim(),
      service: form.service.trim(),
      description: form.description.trim(),
      status: form.status,
      progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
      dueDate: form.dueDate.trim(),
      teamMemberIds: form.teamMemberIds,
    }

    setSaving(true)
    try {
      if (isEdit && project) {
        await updateProject(project.id, payload)
        onSaved(project.id)
      } else {
        const id = await createProject(payload)
        onSaved(id)
      }
    } catch (err) {
      console.error("Error saving project:", err)
      setError(err instanceof Error ? err.message : "Failed to save project.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showCompanyField && (
        <div className="space-y-1.5">
          <Label htmlFor="companyId">Company</Label>
          <Select value={form.companyId} onValueChange={(v) => set("companyId", v)}>
            <SelectTrigger id="companyId" className="w-full">
              <SelectValue placeholder={clientsLoading ? "Loading companies..." : "Select a company"} />
            </SelectTrigger>
            <SelectContent>
              {[...companies].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!clientsLoading && companies.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No clients yet. Add one under Clients first.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="service">Service</Label>
          <Input
            id="service"
            value={form.service}
            onChange={(e) => set("service", e.target.value)}
            placeholder="e.g. Branding, Marketing"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What's this project about?"
        />
      </div>

      <div className="space-y-2">
        <Label>Team</Label>
        <p className="text-sm text-muted-foreground">Add organization users working on this project.</p>
        {teamMembers.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {teamMembers.map((member) => (
              <label key={member.uid} className="flex items-center gap-2 py-1 text-sm">
                <Checkbox
                  checked={form.teamMemberIds.includes(member.uid)}
                  onChange={(event) => {
                    const next = event.currentTarget.checked
                      ? [...form.teamMemberIds, member.uid]
                      : form.teamMemberIds.filter((uid) => uid !== member.uid)
                    set("teamMemberIds", next)
                  }}
                  aria-label={`Assign ${member.name}`}
                />
                <span className="min-w-0 truncate">{member.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No organization team members available.</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Project"}
        </Button>
      </div>
    </form>
  )
}
