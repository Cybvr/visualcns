"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { CreatorBriefForm } from "@/components/dashboard/creator-brief"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { TaskContent, taskContentHtml } from "@/components/dashboard/task-content"
import { Button } from "@/components/ui/button"
import { updateProject, type Project } from "@/lib/projects"

/**
 * About campaign: one rich-text write-up of the campaign, then the creator
 * brief. Changes save with the Save button.
 */
export function CampaignBrief({
  project,
  canEdit,
  onPatched,
}: {
  project: Project
  /** The agency: edits everything. */
  canEdit: boolean
  onPatched?: (patch: Partial<Project>) => void
}) {
  // Older write-ups are plain text; the editor keeps their line breaks.
  const saved = project.about?.trim() ? taskContentHtml(project.about) : ""
  const [draft, setDraft] = useState(saved)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(saved), [saved])
  const dirty = draft !== saved

  async function save(event?: FormEvent) {
    event?.preventDefault()
    if (!dirty || saving) return
    setSaving(true)
    try {
      // An emptied editor leaves "<p></p>"; store that as nothing.
      const about = draft.replace(/<[^>]*>/g, "").trim() ? draft : ""
      await updateProject(project.id, { about })
      onPatched?.({ about })
      toast.success("Saved")
    } catch (error) {
      console.error("Error saving about:", error)
      toast.error("That didn't save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-10">
      <form onSubmit={save} className="space-y-4">
        <Section title="About campaign">
          {canEdit
            ? <RichTextEditor value={draft} onChange={setDraft} placeholder={ABOUT_PLACEHOLDER} className="min-h-[60vh]" />
            : project.about?.trim()
              ? <TaskContent value={project.about} className="text-[15px] text-foreground" />
              : <p className="text-[15px] text-muted-foreground">Not written yet.</p>}
        </Section>
        {canEdit && (
          <div className="flex gap-2 border-t border-border pt-4">
            <Button type="submit" disabled={!dirty || saving}>{saving ? "Saving…" : "Save"}</Button>
            {dirty && <Button type="button" variant="ghost" onClick={() => setDraft(saved)}>Cancel</Button>}
          </div>
        )}
      </form>
      <Section title="Creator brief">
        <CreatorBriefForm project={project} canEdit={canEdit} onPatched={onPatched} />
      </Section>
    </div>
  )
}

/** Shown in the empty editor, so whoever fills it in knows what to cover. */
const ABOUT_PLACEHOLDER = "What it is, when and where, who it's for, why it's worth talking about, what people should do, and anything creators must mention or avoid."

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}
