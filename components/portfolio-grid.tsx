"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getCaseStudyProjects, type CaseStudyProject } from "@/lib/case-studies"
import { Skeleton } from "@/components/ui/skeleton"

import "./portfolio.css"

const PLACEHOLDER = "/placeholder.svg?height=900&width=1200&query=project"

export interface PortfolioGridProps {
  /** Pass projects when the parent already owns loading, filtering, or sorting. */
  projects?: CaseStudyProject[]
  /** The compact spacing used when the grid sits inside the home accordion. */
  compact?: boolean
  /** Limit the number of projects rendered, without adding page controls. */
  limit?: number
  /** The full portfolio index keeps its editorial numbering; home does not. */
  showNumbers?: boolean
}

function metaLine(project: CaseStudyProject) {
  return [project.category?.join(" & "), project.location].filter(Boolean).join(" · ")
}

/** Reusable portfolio content: the grid only, without page filters or controls. */
export function PortfolioGrid({
  projects: providedProjects,
  compact = false,
  limit,
  showNumbers = true,
}: PortfolioGridProps) {
  const [fetchedProjects, setFetchedProjects] = useState<CaseStudyProject[]>([])
  const [loading, setLoading] = useState(providedProjects === undefined)

  useEffect(() => {
    if (providedProjects !== undefined) return

    async function fetchProjects() {
      try {
        setFetchedProjects(await getCaseStudyProjects())
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [providedProjects])

  const projects = providedProjects ?? fetchedProjects
  const visibleProjects = limit ? projects.slice(0, limit) : projects

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading case studies">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-4"><Skeleton className="aspect-[4/3] w-full" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>)}
      </div>
    )
  }

  if (visibleProjects.length === 0) {
    return <p className="py-20 text-center text-muted-foreground">No case studies are available yet.</p>
  }

  return (
    <ul
      className={`grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 ${
        compact ? "md:gap-x-8 md:gap-y-8" : "md:gap-x-10 md:gap-y-10"
      }`}
    >
      {visibleProjects.map((project, index) => {
        const meta = metaLine(project)

        return (
          <li key={project.id} className="pf-tile">
            <Link href={`/case-studies/${project.slug}`} className="group block outline-none">
              <figure>
                <div className="pf-shot aspect-[4/3] overflow-hidden bg-muted">
                  <img src={project.imageUrl || PLACEHOLDER} alt="" loading="lazy" />
                </div>

                <figcaption className="pf-rule mt-5 border-t border-border pt-4">
                  <div className="flex items-baseline gap-4">
                    {showNumbers && (
                      <span className="font-mono text-xs tabular-nums text-muted-foreground transition-colors group-hover:text-accent">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    )}
                    <h2 className="text-balance text-2xl tracking-[-0.01em] text-foreground transition-colors group-hover:text-accent md:text-3xl">
                      {project.title}
                    </h2>
                  </div>

                  {project.excerpt && (
                    <p className={`mt-2 max-w-[48ch] text-sm leading-6 text-muted-foreground ${showNumbers ? "pl-8" : ""}`}>
                      {project.excerpt}
                    </p>
                  )}

                  {meta && (
                    <p className={`mt-3 font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-muted-foreground ${showNumbers ? "pl-8" : ""}`}>
                      {meta}
                    </p>
                  )}
                </figcaption>
              </figure>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
