"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getProjects, type Project } from "@/lib/projects"
import { getOrganizations, type Organization } from "@/lib/organizations"

export interface DuplicateSelection {
  companyId: string
  client: string
  projectId: string
  project: string
}

/**
 * Lets an admin re-home a duplicated invoice/estimate/contract onto a
 * different (or the same) client and project before the copy is created.
 * Shared by the invoices, estimates, and contracts list pages.
 */
export function DuplicateDocumentDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultCompanyId,
  defaultProjectId,
  submitting = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  defaultCompanyId: string
  defaultProjectId?: string
  submitting?: boolean
  onConfirm: (selection: DuplicateSelection) => void
}) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState(defaultCompanyId)
  const [projectId, setProjectId] = useState(defaultProjectId ?? "")

  useEffect(() => {
    if (!open) return
    setCompanyId(defaultCompanyId)
    setProjectId(defaultProjectId ?? "")
    let active = true
    setLoading(true)
    Promise.all([getOrganizations(), getProjects()])
      .then(([organizationList, projectList]) => {
        if (!active) return
        setOrganizations(organizationList)
        setProjects(projectList)
      })
      .catch(() => {
        // The selects just stay empty; the client/project inputs below fall
        // back to whatever the duplicated record already had.
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open, defaultCompanyId, defaultProjectId])

  const selectedOrganization = organizations.find((entry) => entry.id === companyId)
  const selectedProject = projects.find((entry) => entry.id === projectId)

  function selectClient(value: string) {
    setCompanyId(value)
    if (projectId && projects.find((project) => project.id === projectId)?.companyId !== value) setProjectId("")
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4" role="status" aria-label="Loading document options">
            <Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="duplicate-client">Client</Label>
              <Select value={companyId} onValueChange={selectClient}>
                <SelectTrigger id="duplicate-client" className="mt-1">
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {[...organizations].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duplicate-project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="duplicate-project" className="mt-1">
                  <SelectValue placeholder="Not tied to a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter((project) => !companyId || project.companyId === companyId)
                    .sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }))
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || loading || !companyId}
            onClick={() =>
              onConfirm({
                companyId,
                client: selectedOrganization?.name || "",
                projectId,
                project: selectedProject?.title || "",
              })
            }
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
