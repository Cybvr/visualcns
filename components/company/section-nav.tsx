"use client"

import { cn } from "@/lib/utils"

export interface SectionNavItem<K extends string> {
  key: K
  label: string
}

/** Plain text tab nav, shared by the company dashboard page and its public counterpart. */
export function SectionNav<K extends string>({
  sections,
  active,
  onChange,
  className,
}: {
  sections: readonly SectionNavItem<K>[]
  active: K
  onChange: (key: K) => void
  className?: string
}) {
  return (
    <nav className={cn("scrollbar-none flex items-end justify-start gap-1 overflow-x-auto px-2 text-sm md:px-4", className)}>
      {sections.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onChange(s.key)}
          aria-current={active === s.key ? "page" : undefined}
          className={`relative shrink-0 px-2.5 pb-3 pt-3.5 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            active === s.key
              ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-foreground"
              : ""
          }`}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}
