"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getCaseStudyProjects, type CaseStudyProject } from "@/lib/case-studies"
import { PageHeading } from "@/components/page-heading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PortfolioGrid } from "@/components/portfolio-grid"
import { Skeleton } from "@/components/ui/skeleton"

const triggerClass =
  "w-fit gap-1 border-0 bg-transparent p-0 h-auto shadow-none focus-visible:ring-0 text-foreground [&>svg]:size-5 [&>svg]:opacity-100"
const contentClass =
  "border-0 shadow-lg [&_[data-slot=select-scroll-up-button]]:hidden [&_[data-slot=select-scroll-down-button]]:hidden [&_[data-radix-select-viewport]]:[scrollbar-width:none] [&_[data-radix-select-viewport]]:[&::-webkit-scrollbar]:hidden"
const itemClass = "text-lg"

interface PortfolioSectionProps {
  showHero?: boolean
  /** Render without the page container's max-width and gutters, for use inside an already-constrained parent. */
  inset?: boolean
  /** Cap the number of tiles and offer a link through to the full index. Omit to show everything. */
  limit?: number
}

export function PortfolioSection({ showHero = true, inset = false, limit }: PortfolioSectionProps) {
  const containerClass = inset ? "" : "mx-auto max-w-7xl px-4 sm:px-8 md:px-20"
  const [activeFilter, setActiveFilter] = useState("All")
  const [industryFilter, setIndustryFilter] = useState("All")
  const [locationFilter, setLocationFilter] = useState("All")
  const [projects, setProjects] = useState<CaseStudyProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        setProjects(await getCaseStudyProjects())
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const categories = ["All", ...Array.from(new Set(projects.flatMap((p) => p.category || []))).sort()]
  const industries = Array.from(new Set(projects.map((p) => p.industry).filter(Boolean))).sort()
  const locations = Array.from(new Set(projects.map((p) => p.location).filter(Boolean))).sort()

  const filteredProjects = projects
    .filter((p) => activeFilter === "All" || p.category?.includes(activeFilter))
    .filter((p) => industryFilter === "All" || p.industry === industryFilter)
    .filter((p) => locationFilter === "All" || p.location === locationFilter)

  const visibleProjects = limit ? filteredProjects.slice(0, limit) : filteredProjects
  const hasMore = Boolean(limit) && filteredProjects.length > visibleProjects.length

  return (
    <>
      {showHero && (
        <section className="pb-12 pt-32">
          <div className={containerClass}>
            <PageHeading
              title="Case Studies"
              subtitle={loading ? undefined : `${filteredProjects.length} client projects across brand, product, and platform work.`}
            />
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="pb-12">
        <div className={`flex flex-wrap items-center gap-6 ${containerClass}`}>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className={triggerClass}>
              <h2 className="text-2xl md:text-3xl">
                <SelectValue />
              </h2>
            </SelectTrigger>
            <SelectContent className={contentClass}>
              {categories.map((category) => (
                <SelectItem key={category} value={category} className={itemClass}>
                  <h3 className="text-lg">{category === "All" ? "All Categories" : category}</h3>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {industries.length > 0 && (
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className={triggerClass}>
                <h2 className="text-2xl md:text-3xl">
                  <SelectValue />
                </h2>
              </SelectTrigger>
              <SelectContent className={contentClass}>
                <SelectItem value="All" className={itemClass}>
                  <h3 className="text-lg">All Industries</h3>
                </SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry as string} className={itemClass}>
                    <h3 className="text-lg">{industry}</h3>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {locations.length > 0 && (
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className={triggerClass}>
                <h2 className="text-2xl md:text-3xl">
                  <SelectValue />
                </h2>
              </SelectTrigger>
              <SelectContent className={contentClass}>
                <SelectItem value="All" className={itemClass}>
                  <h3 className="text-lg">All Locations</h3>
                </SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location as string} className={itemClass}>
                    <h3 className="text-lg">{location}</h3>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </section>

      {/* Projects */}
      <section className={inset ? "pb-4" : "pb-24 md:pb-32"}>
        <div className={containerClass}>
          {loading ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading case studies">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-4"><Skeleton className="aspect-[4/3] w-full" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>)}
            </div>
          ) : filteredProjects.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">
              No projects match these filters yet. Try widening one of them.
            </p>
          ) : (
            <>
              {/* The hero heading carries the count on /case-studies; inset has no heading, so it carries its own. */}
              {limit && (
                <p className="mb-8 font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-muted-foreground">
                  Showing {visibleProjects.length} of {filteredProjects.length} projects
                </p>
              )}

              <PortfolioGrid projects={visibleProjects} compact={inset} showNumbers={!inset} />

              {hasMore && (
                <div className="mt-12 border-t border-border pt-6">
                  <Link
                    href="/case-studies"
                    className="group inline-flex items-center gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-accent"
                  >
                    View all {filteredProjects.length} case studies
                    <ArrowRight className="size-3.5 transition-transform duration-500 ease-out group-hover:translate-x-1 motion-reduce:transition-none" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
