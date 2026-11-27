"use client"

import Link from "next/link"
import { createContext, useContext, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/** On the client Home, each section is a rounded card with a small uppercase label above it. */
export const SectionCardsContext = createContext<false | "cards" | "inner">(false)

/** "inner" puts each section's title inside its card, like a field label. */
export function SectionCards({ inner = false, children }: { inner?: boolean; children: ReactNode }) {
  return <SectionCardsContext.Provider value={inner ? "inner" : "cards"}>{children}</SectionCardsContext.Provider>
}

/** A section's body: plain where it sits, or the rounded card inside SectionCards. */
export function SectionBody({ className, children }: { className?: string; children: ReactNode }) {
  const cards = useContext(SectionCardsContext)
  return <div className={cards === "inner" ? "mt-2" : cards ? "mt-3 rounded-3xl bg-muted/50 p-5" : className}>{children}</div>
}

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
  const cards = useContext(SectionCardsContext)
  return (
    <div className={cn("flex min-h-8 items-center justify-between gap-3", className, cards === "cards" && "px-1")}>
      <Heading id={id} className={cn("min-w-0 truncate", cards === "inner" ? "text-sm font-normal text-muted-foreground" : cards ? "text-xs font-semibold uppercase tracking-wider text-muted-foreground" : "surface-section-label")}>{title}</Heading>
      {(href || children) && (
        <div className="flex shrink-0 items-center gap-2">
          {href && <Link href={href} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">{linkLabel}</Link>}
          {children}
        </div>
      )}
    </div>
  )
}
