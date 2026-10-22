"use client"

import { useEffect, useState, type FormEvent } from "react"
import { FileText } from "lucide-react"
import { toast } from "sonner"

import { CreatorBriefForm, useCreatorBriefDraft } from "@/components/dashboard/creator-brief"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { SettingsSection } from "@/components/dashboard/settings-section"
import { TaskContent, taskContentHtml } from "@/components/dashboard/task-content"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { renameProject, slugify, updateProject, type Project } from "@/lib/projects"

/**
 * About campaign: the title and one rich-text write-up, with the creator
 * brief's settings beside it on wide screens and below it on phones. Every
 * part opens and closes, so a phone only shows the part being changed.
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
  const savedAbout = project.about?.trim() ? taskContentHtml(project.about) : ""
  const [title, setTitle] = useState(project.title)
  const [about, setAbout] = useState(savedAbout)
  const [saving, setSaving] = useState(false)
  useEffect(() => setTitle(project.title), [project.title])
  useEffect(() => setAbout(savedAbout), [savedAbout])
  const brief = useCreatorBriefDraft(project)
  const textDirty = title.trim() !== project.title || about !== savedAbout
  const dirty = textDirty || brief.dirty

  async function save(event?: FormEvent) {
    event?.preventDefault()
    if (!dirty || saving || !title.trim()) return
    setSaving(true)
    try {
      const nextTitle = title.trim()
      if (nextTitle !== project.title) {
        await renameProject(project.id, nextTitle)
        onPatched?.({ title: nextTitle, slug: slugify(nextTitle) })
      }
      if (about !== savedAbout) {
        // An emptied editor leaves "<p></p>"; store that as nothing. An image on its own still counts.
        const nextAbout = about.replace(/<[^>]*>/g, "").trim() || /<img\b/i.test(about) ? about : ""
        await updateProject(project.id, { about: nextAbout })
        onPatched?.({ about: nextAbout })
      }
      if (brief.dirty) {
        const nextBrief = brief.toSave()
        await updateProject(project.id, { brief: nextBrief })
        onPatched?.({ brief: nextBrief })
      }
      toast.success("Saved")
    } catch (error) {
      console.error("Error saving about:", error)
      toast.error("That didn't save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    // grid-cols-1 and min-w-0 keep the editor inside a phone's width.
    <form onSubmit={save} className="grid grid-cols-1 gap-x-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
      <div className="min-w-0">
        <SettingsSection title="Content" icon={FileText} defaultOpen divider={false}>
          {canEdit ? (
            <div className="space-y-4">
              <Input id={`campaign-title-${project.id}`} aria-label="Campaign title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="h-11 text-[15px] text-foreground" />
              <RichTextEditor value={about} onChange={setAbout} placeholder={ABOUT_PLACEHOLDER} ariaLabel="About campaign" className="min-h-[50vh] text-foreground" />
            </div>
          ) : project.about?.trim() ? (
            <TaskContent value={project.about} className="text-[15px] text-foreground" />
          ) : (
            <p className="text-[15px] text-muted-foreground">Not written yet.</p>
          )}
        </SettingsSection>
      </div>
      {/* Settings: a side panel on wide screens, more sections below on phones. */}
      <aside aria-label="Creator brief settings" className="min-w-0 lg:sticky lg:top-4">
        <CreatorBriefForm project={project} canEdit={canEdit} value={brief.draft} onChange={brief.set} />
      </aside>
      {/* One Save for the title, the about and the creator brief. */}
      {canEdit && (
        <div className="flex gap-2 border-t border-border pt-4 lg:col-span-2">
          <Button type="submit" disabled={!dirty || saving || !title.trim()}>{saving ? "Saving…" : "Save"}</Button>
          {(textDirty || brief.changed) && (
            <Button type="button" variant="ghost" onClick={() => { setTitle(project.title); setAbout(savedAbout); brief.reset() }}>Cancel</Button>
          )}
        </div>
      )}
    </form>
  )
}

/** Shown in the empty editor, so whoever fills it in knows what to cover. */
const ABOUT_PLACEHOLDER = "What it is, when and where, who it's for, why it's worth talking about, what people should do, and anything creators must mention or avoid."
