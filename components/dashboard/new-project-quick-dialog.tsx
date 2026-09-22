"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createProject, createProjectFromTemplate, getTemplates, getTemplateSteps, type Project } from "@/lib/projects"

type TemplateOption = { project: Project; steps: string[] }

/**
 * The Home page's "New Project" action: a title field to create a blank
 * project, or a compact list of templates to copy instead. Replaces the
 * separate empty-state copy and full template gallery previously shown
 * inline on Home.
 */
export function NewProjectQuickDialog({
  open,
  onOpenChange,
  companyId,
  clientName,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  clientName: string
  onCreated: () => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle("")
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setTemplatesLoading(true)
    getTemplates()
      .then(async (published) => {
        const withSteps = await Promise.all(
          published.map(async (project) => ({ project, steps: await getTemplateSteps(project.id) })),
        )
        if (!cancelled) setTemplates(withSteps)
      })
      .catch((caughtError) => console.error("Error loading templates:", caughtError))
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  async function handleQuickCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const projectTitle = title.trim()
    if (!companyId) {
      setError("This account is not connected to a workspace yet.")
      return
    }
    if (!projectTitle) {
      setError("Add a project name before creating it.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createProject({
        companyId,
        client: clientName || "Client workspace",
        title: projectTitle,
        service: "",
        status: "in-progress",
        progress: 0,
        dueDate: "",
      })
      onOpenChange(false)
      await onCreated()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The project could not be created. Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleUseTemplate(project: Project) {
    if (!companyId) {
      setError("This account is not connected to a workspace yet.")
      return
    }
    setApplyingId(project.id)
    setError(null)
    try {
      await createProjectFromTemplate(project, companyId, clientName || "Client workspace")
      onOpenChange(false)
      await onCreated()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The template could not be copied. Try again.")
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Give it a name, or start from a template.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleQuickCreate} className="space-y-2">
          <Label htmlFor="quick-project-title">Project name</Label>
          <div className="flex gap-2">
            <Input
              id="quick-project-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Website redesign"
              maxLength={120}
              autoFocus
            />
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
              Create
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>

        {(templatesLoading || templates.length > 0) && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Or start from a template</p>
            {templatesLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading templates…
              </div>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border">
                {templates.map(({ project, steps }) => (
                  <button
                    key={project.id}
                    type="button"
                    disabled={applyingId !== null}
                    onClick={() => handleUseTemplate(project)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm outline-none transition-colors hover:bg-muted/50 disabled:opacity-60"
                  >
                    <span>
                      <span className="font-medium">{project.title}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {steps.length} {steps.length === 1 ? "step" : "steps"}
                      </span>
                    </span>
                    {applyingId === project.id && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
