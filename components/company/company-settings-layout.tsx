"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { ChartColumn, Settings2, Share2, TrendingUp, User, Users } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { cn } from "@/lib/utils"

const SETTINGS_ITEMS = [
  ["company-settings-profile", "Profile", User],
  ["company-settings-social", "Social", Share2],
  ["company-settings-team", "Team", Users],
] as const

/** Company settings pages, each at /{slug}/settings/{path}. */
const SETTINGS_PAGES = [
  ["", "General", Settings2, "about"],
  ["account", "Account", User, "about"],
  ["social", "Social", Share2, "social"],
  ["reports", "Reports", ChartColumn, "pulse"],
  ["analytics", "Analytics", TrendingUp, "analytics"],
] as const

const linkClass = (active: boolean) => cn(
  "flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm leading-6 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
  active
    ? "bg-sidebar-accent font-semibold text-primary"
    : "text-foreground hover:bg-muted hover:text-sidebar-accent-foreground",
)

/**
 * Dashboard settings use section anchors; company-site settings use pages.
 * `wide` gives data pages the full width instead of the form column.
 */
export function CompanySettingsLayout({ children, includeProfile = true, includeTeam = false, wide = false }: { children: ReactNode; includeProfile?: boolean; includeTeam?: boolean; wide?: boolean }) {
  const { company, mode, sections } = useCompanyPage()
  const pathname = usePathname()
  const settingsPath = `/${encodeURIComponent(company.slug || company.id)}/settings`
  const onSettingsPage = mode !== "routes" || pathname === settingsPath
  const items = (mode === "routes" ? [] : SETTINGS_ITEMS).filter(([id]) =>
    (includeProfile || id !== "company-settings-profile") && (includeTeam || id !== "company-settings-team"))
  const pages = mode === "routes" ? SETTINGS_PAGES.filter(([, , , key]) => sections.some((section) => section.key === key)) : []
  const ids = onSettingsPage ? items.map(([id]) => id).join(",") : ""
  const [active, setActive] = useState<string>(items[0]?.[0] ?? "")

  // The link for whichever section is in the top part of the screen stays highlighted, like the sidebar.
  useEffect(() => {
    if (!ids) return
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
    <div className={cn(
      "mx-auto grid w-full gap-8 lg:items-start",
      wide
        ? "max-w-6xl lg:grid-cols-[9rem_minmax(0,1fr)]"
        : "max-w-5xl lg:w-fit lg:max-w-full lg:grid-cols-[9rem_minmax(0,36rem)] lg:justify-center",
    )}>
      <aside className="lg:sticky lg:top-6 lg:pt-5">
        <nav aria-label="Settings pages" className="flex gap-0.5 overflow-x-auto lg:flex-col">
          {items.map(([id, label, Icon]) => {
            const isActive = onSettingsPage && active === id
            return onSettingsPage ? (
              <a key={id} href={`#${id}`} aria-current={isActive ? "location" : undefined} onClick={() => setActive(id)} className={linkClass(isActive)}>
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {label}
              </a>
            ) : (
              <Link key={id} href={`${settingsPath}#${id}`} className={linkClass(false)}>
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {label}
              </Link>
            )
          })}
          {pages.map(([path, label, Icon]) => {
            const href = path ? `${settingsPath}/${path}` : settingsPath
            const isActive = pathname === href
            return (
              <Link key={path} href={href} aria-current={isActive ? "page" : undefined} className={linkClass(isActive)}>
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>
      {children}
    </div>
  )
}
