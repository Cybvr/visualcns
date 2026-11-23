"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"

import type { Project } from "@/lib/projects"

/** The campaign's own words about itself, as plain text: what it is, then its angle. */
function campaignDescription(project: Project) {
  const text = [project.about, project.description, project.angle, project.summary]
    .map((value) => (value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
  return [...new Set(text)]
}

/**
 * A campaign's title row on a company-level tab (Content, Creators), with a + on the
 * right that opens the campaign's description under it.
 */
export function CampaignGroupHeader({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)
  const paragraphs = campaignDescription(project)
  const id = `campaign-about-${project.id}`
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-base font-semibold">{project.title || "Untitled campaign"}</h2>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={id}
          aria-label={open ? "Hide campaign description" : "Show campaign description"}
          title={open ? "Hide description" : "Show description"}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? <Minus className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <div id={id} className="mt-2 max-w-3xl space-y-2 text-sm text-muted-foreground">
          {paragraphs.length ? paragraphs.map((text, index) => <p key={index}>{text}</p>) : <p>No description yet.</p>}
        </div>
      )}
    </div>
  )
}
