"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Share2, User, Users } from "lucide-react"

import { cn } from "@/lib/utils"

const SETTINGS_ITEMS = [
  ["company-settings-profile", "Profile", User],
  ["company-settings-social", "Social", Share2],
  ["company-settings-team", "Team", Users],
] as const

export function CompanySettingsLayout({ children, includeProfile = true, includeTeam = false }: { children: ReactNode; includeProfile?: boolean; includeTeam?: boolean }) {
  const items = SETTINGS_ITEMS.filter(([id]) =>
    (includeProfile || id !== "company-settings-profile") && (includeTeam || id !== "company-settings-team"))
  const ids = items.map(([id]) => id).join(",")
  const [active, setActive] = useState<string>(items[0]?.[0] ?? "")

  // The link for whichever section is in the top part of the screen stays highlighted, like the sidebar.
  useEffect(() => {
    const visible = new Set<string>()
    const order = ids.split(",")
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id)
        else visible.delete(entry.target.id)
      }
      const first = order.find((id) => visible.has(id))
      if (first) setActive(first)
    }, { rootMargin: "0px 0px -60% 0px" })
    for (const id of order) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [ids])

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:w-fit lg:max-w-full lg:grid-cols-[9rem_minmax(0,36rem)] lg:items-start lg:justify-center">
      <aside className="lg:sticky lg:top-6 lg:pt-5">
        <nav aria-label="Account sections" className="flex gap-0.5 overflow-x-auto lg:flex-col">
          {items.map(([id, label, Icon]) => {
            const isActive = active === id
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={() => setActive(id)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm leading-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-sidebar-accent font-semibold text-primary"
                    : "text-foreground hover:bg-muted hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {label}
              </a>
            )
          })}
        </nav>
      </aside>
      {children}
    </div>
  )
}
