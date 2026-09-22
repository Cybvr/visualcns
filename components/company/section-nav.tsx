"use client"

import { cn } from "@/lib/utils"

export interface SectionNavItem<K extends string> {
  key: K
  label: string
}

/** Segmented pill nav, shared by the company dashboard page and its public counterpart. */
export function SectionNav<K extends string>({
  sections,
  active,
  onChange,
}: {
  sections: readonly SectionNavItem<K>[]
  active: K
  onChange: (key: K) => void
}) {
  return (
    <nav className="scrollbar-none flex items-center gap-1 overflow-x-auto rounded-full bg-muted p-1">
      {sections.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onChange(s.key)}
          aria-current={active === s.key ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            active === s.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}
