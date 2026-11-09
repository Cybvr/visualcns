import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { PortfolioGrid } from "@/components/portfolio-grid"

/**
 * Case studies on the home page: the same four-column cards as before
 * (picture, then name and tags), spread across the full width of the page
 * rather than held to the page column.
 */
export function HomeCaseStudies({ limit = 4 }: { limit?: number }) {
  return (
    <section aria-labelledby="home-work" className="px-4 py-14 sm:px-8 md:px-12 md:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mb-14">
        <h2 id="home-work" className="tracking-[-0.03em] text-foreground">Case Studies</h2>
        <Link
          href="/case-studies"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          View all
          <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </div>
      <PortfolioGrid compact minimal limit={limit} showNumbers={false} />
    </section>
  )
}
