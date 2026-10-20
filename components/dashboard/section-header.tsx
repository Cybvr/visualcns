import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * The row at the top of a section: the heading, then an optional "View all"
 * link and any actions. Every section on the dashboard and company pages uses
 * this so headings look the same everywhere; style them in globals.css
 * (.surface-section-label), not per page.
 */
export function SectionHeader({ title, id, href, linkLabel = "View all", as: Heading = "h2", className, children }: {
  title: ReactNode
  id?: string
  href?: string
  linkLabel?: string
  as?: "h2" | "h3"
  className?: string
  /** Actions on the right, after the link. */
  children?: ReactNode
}) {
  return (
    <div className={cn("flex min-h-8 items-center justify-between gap-3", className)}>
      <Heading id={id} className="surface-section-label min-w-0 truncate">{title}</Heading>
      {(href || children) && (
        <div className="flex shrink-0 items-center gap-2">
          {href && <Link href={href} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">{linkLabel}</Link>}
          {children}
        </div>
      )}
    </div>
  )
}
