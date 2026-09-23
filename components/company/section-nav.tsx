"use client"

export interface SectionNavItem<K extends string> {
  key: K
  label: string
}

/** Plain text tab nav, shared by the company dashboard page and its public counterpart. */
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
    <nav className="scrollbar-none flex items-end justify-start gap-4 overflow-x-auto p-0">
      {sections.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onChange(s.key)}
          aria-current={active === s.key ? "page" : undefined}
          className={`relative shrink-0 px-0 pb-2 pt-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            active === s.key
              ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-foreground"
              : ""
          }`}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}
