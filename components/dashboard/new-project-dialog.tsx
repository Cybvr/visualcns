"use client"

import { useRouter } from "next/navigation"

import { ClientProjectForm } from "@/components/dashboard/client-project-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getProject, projectSlug, type Project } from "@/lib/projects"

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityLabel?: "project" | "campaign"
  initialCompanyId?: string
  /** Called with the created project instead of redirecting, e.g. to open it inline within a company shell. */
  onCreated?: (project: Project) => void
}

/** Create-project modal shared by the projects list and the company page. Redirects to the new project on save, unless the caller wants it handed back instead (e.g. to open inline). */
export function NewProjectDialog({ open, onOpenChange, entityLabel = "project", initialCompanyId, onCreated }: NewProjectDialogProps) {
  const router = useRouter()

  async function handleSaved(id: string) {
    onOpenChange(false)
    const project = await getProject(id)
    if (onCreated && project) {
      onCreated(project)
      return
    }
    router.push(project ? `/dashboard/projects/${projectSlug(project)}` : "/dashboard/projects")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New {entityLabel}</DialogTitle>
          <DialogDescription className="sr-only">Create a {entityLabel} for a client.</DialogDescription>
        </DialogHeader>
        {open && (
          <ClientProjectForm
            key="new"
            project={null}
            initialCompanyId={initialCompanyId}
            entityLabel={entityLabel}
            onSaved={handleSaved}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
