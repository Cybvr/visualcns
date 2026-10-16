"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { StatusPill } from "@/components/dashboard/campaign-creatives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { addCampaignCreative, creativeStatus, READY_FOR_REVIEW, updateCampaignCreative, type CampaignCreative } from "@/lib/campaign-creatives"
import { updateProject, type Project } from "@/lib/projects"

/**
 * The campaign's Brief: what it's about, the one claim it's built on, how it
 * will run, and the announcement post with its approval. Changes save with
 * the Save button.
 */
export function CampaignBrief({
  project,
  content,
  canEdit,
  canReview,
  onPatched,
}: {
  project: Project
  content: CampaignCreative[]
  /** The agency: edits everything. */
  canEdit: boolean
  /** The client's own people: edit and approve the announcement post. */
  canReview: boolean
  onPatched?: (patch: Partial<Project>) => void
}) {
  const post = content.find((item) => item.type === "text" && /announcement/i.test(item.title))
  const saved = { about: project.about ?? "", angle: project.angle ?? "", strategy: project.description ?? "", announcement: post?.body ?? "" }
  const [draft, setDraft] = useState(saved)
  const [saving, setSaving] = useState(false)
  // Take in changes saved elsewhere, e.g. the post edited in Content.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(saved), [saved.about, saved.angle, saved.strategy, saved.announcement])

  const status = post ? creativeStatus(post) : ""
  const canWriteAnnouncement = canEdit || (canReview && Boolean(post))
  const dirty = (Object.keys(saved) as (keyof typeof saved)[]).some((key) => draft[key] !== saved[key])
  const set = (key: keyof typeof saved) => (value: string) => setDraft((current) => ({ ...current, [key]: value }))

  async function save(event?: FormEvent) {
    event?.preventDefault()
    if (!dirty || saving) return
    setSaving(true)
    try {
      if (canEdit) {
        const patch = { about: draft.about.trim(), angle: draft.angle.trim(), description: draft.strategy.trim() }
        if (patch.about !== saved.about || patch.angle !== saved.angle || patch.description !== saved.strategy) {
          await updateProject(project.id, patch)
          onPatched?.(patch)
        }
      }
      if (draft.announcement !== saved.announcement) {
        if (post) {
          await updateCampaignCreative(post.id, { body: draft.announcement })
        } else if (canEdit && draft.announcement.trim()) {
          await addCampaignCreative(
            { agencyId: project.agencyId, companyId: project.companyId, projectId: project.id },
            { title: "Announcement post", url: "", type: "text", kind: "content", postedBy: "Founder", body: draft.announcement, status: "Draft" },
          )
        }
      }
      toast.success("Saved")
    } catch (error) {
      console.error("Error saving brief:", error)
      toast.error("That didn't save.")
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(next: string) {
    if (!post) return
    try {
      await updateCampaignCreative(post.id, { status: next, ...(draft.announcement !== saved.announcement ? { body: draft.announcement } : {}) })
    } catch (error) {
      console.error("Error saving announcement:", error)
      toast.error("That didn't save.")
    }
  }

  return (
    <form onSubmit={save} className="space-y-8">
      <Section title="About the event">
        <Field canEdit={canEdit} value={draft.about} onChange={set("about")} rows={12} label="About the event" placeholder={ABOUT_PLACEHOLDER} />
      </Section>
      <Section title="Narrative and angle">
        <Field canEdit={canEdit} value={draft.angle} onChange={set("angle")} singleLine label="Narrative and angle" placeholder="The one line the whole campaign hangs on, e.g. “Lagos executives step into the ring for one night”" />
      </Section>
      <Section title="Strategy">
        <Field canEdit={canEdit} value={draft.strategy} onChange={set("strategy")} rows={5} label="Strategy" placeholder="How you'll get there: which creators, which platforms, what they post and when, and what counts as a win." />
      </Section>
      <Section title="Announcement post">
        <Field canEdit={canWriteAnnouncement} value={draft.announcement} onChange={set("announcement")} rows={7} label="Announcement post" placeholder="The first post people will see: the hook, what's happening, when and where, and what to do next." />
        {post && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill status={status} />
            {canReview && status !== "Approved" && (
              <>
                <Button type="button" size="sm" onClick={() => void setStatus("Approved")}>Approve</Button>
                <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus("Changes requested")}>Request changes</Button>
              </>
            )}
            {canReview && status === "Approved" && (
              <button type="button" onClick={() => void setStatus(READY_FOR_REVIEW)} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">Undo approval</button>
            )}
            {canEdit && !canReview && (status === "Draft" || status === "Changes requested") && (
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus(READY_FOR_REVIEW)}>Send for review</Button>
            )}
          </div>
        )}
      </Section>

      {(canEdit || canWriteAnnouncement) && (
        <div className="flex gap-2 border-t border-border pt-4">
          <Button type="submit" disabled={!dirty || saving}>{saving ? "Saving…" : "Save"}</Button>
          {dirty && <Button type="button" variant="ghost" onClick={() => setDraft(saved)}>Cancel</Button>}
        </div>
      )}
    </form>
  )
}

/** Shown in the empty About box, so whoever fills it in knows what to cover. */
const ABOUT_PLACEHOLDER = [
  "What is it? Name the event, launch or product in a sentence.",
  "",
  "When and where: the date, the time and the venue or city.",
  "",
  "Who it's for: the people you want to show up, buy or talk about it.",
  "",
  "What makes it worth talking about: the headline act, the offer or the story behind it.",
  "",
  "What people should do: buy a ticket, sign up, visit, or follow along.",
  "",
  "Anything creators must mention or avoid: hashtags, tags, dos and don'ts.",
].join("\n")

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

/** A box to write in, or plain text for people who can't change it. */
function Field({ canEdit, value, onChange, label, singleLine = false, rows = 4, placeholder }: { canEdit: boolean; value: string; onChange: (value: string) => void; label: string; singleLine?: boolean; rows?: number; placeholder?: string }) {
  if (!canEdit) return <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{value || <span className="text-muted-foreground">Not written yet.</span>}</p>
  return singleLine
    ? <Input value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} placeholder={placeholder} className="h-11 text-[15px]" />
    : <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} aria-label={label} placeholder={placeholder} className="text-[15px] leading-7" />
}
