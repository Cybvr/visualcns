import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * The headline and standfirst at the top of a marketing page. Shared so About,
 * Portfolio, Pricing and Templates all open at the same size and rhythm.
 */
export function PageHeading({
  title,
  subtitle,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <h1 className="text-balance text-3xl font-normal leading-[1.15] tracking-tight md:text-5xl">
        {title}
      </h1>
      {subtitle && <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">{subtitle}</p>}
    </div>
  )
}
