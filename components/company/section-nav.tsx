"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface SectionNavItem<K extends string> {
  key: K
  label: string
  icon?: LucideIcon
}

interface SectionNavProps<K extends string> {
  sections: readonly SectionNavItem<K>[]
  active: K
  /** Each section's URL. */
  href: (key: K) => string
  className?: string
}

/** Plain text tab nav, shared by the company dashboard page and the public page on phones. */
export function SectionNav<K extends string>({ sections, active, href, className }: SectionNavProps<K>) {
  return (
    <nav className={cn("scrollbar-none flex items-end justify-start gap-1 overflow-x-auto px-2 text-sm md:px-4", className)}>
      {sections.map((s) => (
        <Link
          key={s.key}
          href={href(s.key)}
          scroll={false}
          aria-current={active === s.key ? "page" : undefined}
          className={`relative shrink-0 px-2.5 pb-3 pt-3.5 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            active === s.key
              ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-foreground"
              : ""
          }`}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  )
}

/** Vertical icon menu for the side of the public company page, in the style of X and Facebook. */
export function SectionRail<K extends string>({ sections, active, href, className }: SectionNavProps<K>) {
  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {sections.map((s) => {
        const Icon = s.icon
        const isActive = active === s.key
        return (
          <Link
            key={s.key}
            href={href(s.key)}
            aria-current={isActive ? "page" : undefined}
            aria-label={s.label}
            title={s.label}
            className={cn(
              "flex items-center justify-center gap-3 rounded-full p-2.5 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:w-full lg:justify-start lg:px-3 lg:py-2",
              isActive ? "font-semibold" : "font-normal",
            )}
          >
            {Icon && <Icon className="size-[18px] shrink-0" strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />}
            {/* Icons only on tablets, like X; labels come in once there is room. */}
            <span className="hidden truncate text-[14px] lg:inline">{s.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
