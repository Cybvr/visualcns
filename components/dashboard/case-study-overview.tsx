import type { ReactNode } from "react"
import { ExternalLink } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { projectStatusMeta, type Project } from "@/lib/projects"

/** Strips the scheme, leading www, and trailing slash so a URL reads like a domain. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "")
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border bg-secondary/50 px-3 py-1.5 text-sm font-medium">
      {children}
    </span>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

/**
 * Read-only view of everything CaseStudyForm edits. This is what the
 * Overview tab shows by default; "Edit project" swaps in the form.
 */
export function CaseStudyOverview({ project }: { project: Project }) {
  const category = project.category ?? []
  const technologies = project.technologies ?? []
  const tags = project.tags ?? []
  const status = projectStatusMeta[project.status]

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Field label="Status">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${status.className}`}>{status.label}</span>
        </Field>
        <Field label="Excerpt">
          <p className="text-lg leading-relaxed sm:text-xl">{project.excerpt || "—"}</p>
        </Field>
        <Field label="Description">
          <p className="text-lg leading-relaxed sm:text-xl">{project.description || "—"}</p>
        </Field>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          {category.length ? (
            <div className="flex flex-wrap gap-2">
              {category.map((entry) => (
                <Pill key={entry}>{entry}</Pill>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No category added</p>
          )}
        </Field>
        <Field label="Live site">
          {project.projectUrl ? (
            <a
              href={project.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              {displayUrl(project.projectUrl)}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">No live site</p>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Technologies">
          {technologies.length ? (
            <div className="flex flex-wrap gap-2">
              {technologies.map((entry) => (
                <Pill key={entry}>{entry}</Pill>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No technologies added</p>
          )}
        </Field>
        <Field label="Tags">
          {tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((entry) => (
                <Pill key={entry}>{entry}</Pill>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tags added</p>
          )}
        </Field>
      </div>
    </div>
  )
}
