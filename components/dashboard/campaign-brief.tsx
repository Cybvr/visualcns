"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { StatusPill } from "@/components/dashboard/campaign-creatives"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { creativeStatus, type CampaignCreative } from "@/lib/campaign-creatives"
import { updateProject, type Project } from "@/lib/projects"

/**
 * The campaign's Brief: the one claim it's built on, how the launch will run,
 * and the announcement post (edited and approved in Content).
 */
export function CampaignBrief({
  project,
  content,
  canEdit,
  onPatched,
}: {
  project: Project
  content: CampaignCreative[]
  canEdit: boolean
  onPatched?: (patch: Partial<Project>) => void
}) {
  const [angle, setAngle] = useState(project.angle ?? "")
  const [strategy, setStrategy] = useState(project.description ?? "")
  useEffect(() => setAngle(project.angle ?? ""), [project.angle])
  useEffect(() => setStrategy(project.description ?? ""), [project.description])

  const announcement = content.find((item) => item.type === "text" && /announcement/i.test(item.title))

  async function save(patch: Partial<Project>) {
    try {
      await updateProject(project.id, patch)
      onPatched?.(patch)
    } catch (error) {
      console.error("Error saving brief:", error)
      toast.error("That change didn't save.")
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Main message</h3>
        {canEdit ? (
          <Input
            value={angle}
            onChange={(event) => setAngle(event.target.value)}
            onBlur={() => { if (angle.trim() !== (project.angle ?? "")) void save({ angle: angle.trim() }) }}
            placeholder="One sentence"
            aria-label="Main message"
            className="mt-3 h-11"
          />
        ) : (
          <p className="mt-3 text-base text-foreground">{project.angle || "Not written yet."}</p>
        )}
      </section>

      <section>
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Plan</h3>
        {canEdit ? (
          <Textarea
            value={strategy}
            onChange={(event) => setStrategy(event.target.value)}
            onBlur={() => { if (strategy.trim() !== (project.description ?? "")) void save({ description: strategy.trim() }) }}
            rows={6}
            placeholder="How it runs"
            aria-label="Plan"
            className="mt-3 text-base leading-7 md:text-sm md:leading-6"
          />
        ) : (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{project.description || project.excerpt || project.summary || "Not written yet."}</p>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Announcement</h3>
          {announcement && <StatusPill status={creativeStatus(announcement)} />}
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
          {announcement?.body || "None yet."}
        </p>
      </section>
    </div>
  )
}
