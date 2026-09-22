"use client"

import { cn } from "@/lib/utils"

export interface SectionNavItem<K extends string> {
  key: K
  label: string
}

/** Plain underline nav, shared by the company dashboard page and its public counterpart. */
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
    <nav className="scrollbar-none flex items-center gap-6 overflow-x-auto border-b border-border">
      {sections.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onChange(s.key)}
          className={cn(
            "shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors",
            active === s.key
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}
