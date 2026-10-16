import type { ReactNode } from "react"

const SETTINGS_ITEMS = [
  ["company-settings-profile", "Profile"],
  ["company-settings-about", "About"],
  ["company-settings-details", "Details"],
  ["company-settings-tags", "Tags"],
  ["company-settings-links", "Links"],
] as const

export function CompanySettingsLayout({ children, includeProfile = true }: { children: ReactNode; includeProfile?: boolean }) {
  const items = includeProfile ? SETTINGS_ITEMS : SETTINGS_ITEMS.filter(([id]) => id !== "company-settings-profile")
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:w-fit lg:max-w-full lg:grid-cols-[8rem_minmax(0,36rem)] lg:items-start lg:justify-center">
      <aside className="lg:sticky lg:top-6 lg:pt-5">
        <nav aria-label="Account sections" className="flex gap-1 overflow-x-auto text-sm lg:flex-col">
          {items.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-md px-3 py-2 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              {label}
            </a>
          ))}
        </nav>
      </aside>
      {children}
    </div>
  )
}
