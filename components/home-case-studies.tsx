"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { getCaseStudyProjects, type CaseStudyProject } from "@/lib/case-studies"

const PLACEHOLDER = "/placeholder.svg?height=900&width=1200&query=project"

/**
 * Case studies on the home page, edge to edge: four pictures side by side
 * with no gaps, each with its name over the bottom of the picture.
 */
export function HomeCaseStudies({ limit = 4 }: { limit?: number }) {
  const [projects, setProjects] = useState<CaseStudyProject[] | null>(null)

  useEffect(() => {
    let active = true
    getCaseStudyProjects()
      .then((rows) => { if (active) setProjects(rows.slice(0, limit)) })
      .catch((error) => {
        console.error("Error fetching case studies:", error)
        if (active) setProjects([])
      })
    return () => { active = false }
  }, [limit])

  return (
    <section aria-labelledby="home-work" className="py-14 md:py-20">
      <div className="mx-auto mb-10 flex max-w-7xl flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 sm:px-8 md:mb-14 md:px-20">
        <h2 id="home-work" className="tracking-[-0.03em] text-foreground">Case Studies</h2>
        <Link
          href="/case-studies"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          View all
          <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </div>

      {projects === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading case studies">
          {Array.from({ length: limit }, (_, index) => <Skeleton key={index} className="aspect-[3/4] w-full rounded-none" />)}
        </div>
      ) : projects.length === 0 ? (
        <p className="px-4 py-10 text-center text-muted-foreground">No case studies are available yet.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((project) => (
            <li key={project.id}>
              <Link href={`/case-studies/${project.slug}`} className="group relative block aspect-[3/4] overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={project.imageUrl || PLACEHOLDER} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white md:p-6">
                  <div className="min-w-0">
                    <h3 className="truncate text-xl tracking-[-0.02em] md:text-2xl">{project.title}</h3>
                    {project.category?.length ? <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-white/75">{project.category.join(" & ")}</p> : null}
                  </div>
                  <ArrowUpRight className="size-5 shrink-0 transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
