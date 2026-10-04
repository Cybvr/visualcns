"use client"

import { useState } from "react"
import { Loader2, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { publishTemplate, unpublishTemplate, type Project } from "@/lib/projects"

/**
 * Sharing a project lists it on /templates as a template. Only the project
 * title, the details filled in here, and the task names travel with it - the
 * task bodies stay in the workspace.
 */
export function ProjectShareButton({
  project,
  stepCount,
  onChanged,
  open,
  onOpenChange,
  showTrigger = true,
}: {
  project: Project
  stepCount: number
  onChanged: () => Promise<void>
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [summary, setSummary] = useState(project.summary ?? "")
  const [timeline, setTimeline] = useState(project.timeline ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function publish() {
    setSaving(true)
    setError(null)
    try {
      await publishTemplate(project.id, {
        summary: summary.trim(),
        timeline: timeline.trim(),
      })
      await onChanged()
      if (onOpenChange) onOpenChange(false)
      else setInternalOpen(false)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The project could not be shared.")
    } finally {
      setSaving(false)
    }
  }

  async function unpublish() {
    setSaving(true)
    setError(null)
    try {
      await unpublishTemplate(project.id)
      await onChanged()
      if (onOpenChange) onOpenChange(false)
      else setInternalOpen(false)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The template could not be taken down.")
    } finally {
      setSaving(false)
    }
  }

  const dialogOpen = open ?? internalOpen
  const handleOpenChange = onOpenChange ?? setInternalOpen

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="shrink-0">
            <Share2 className="size-4" aria-hidden="true" />
            {project.isPublic ? "Shared" : "Share"}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{project.isPublic ? "Update listing" : "Share as a template"}</DialogTitle>
          <DialogDescription>
            Lists this project on the public templates page. Its {stepCount} {stepCount === 1 ? "step" : "steps"} show
            by name only, never the task notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-summary">One-line pitch</Label>
            <Input
              id="template-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={200}
              placeholder="For businesses who need help..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-timeline">Cadence</Label>
            <Input
              id="template-timeline"
              value={timeline}
              onChange={(event) => setTimeline(event.target.value)}
              maxLength={60}
              placeholder="Setup + monthly"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            {project.isPublic ? (
              <Button variant="ghost" size="sm" onClick={unpublish} disabled={saving}>
                Take down
              </Button>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={publish} disabled={saving || !summary.trim()}>
              {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
              {saving ? "Saving" : project.isPublic ? "Update" : "Share"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
