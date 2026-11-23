"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useAuth } from "@/components/auth-provider"

import { cn } from "@/lib/utils"

/** The three lists that make up the CRM, each on its own address so old links keep working. */
export const CRM_TABS = [
  { label: "Leads", href: "/dashboard/leads" },
  { label: "Companies", href: "/dashboard/companies" },
  { label: "Contacts", href: "/dashboard/users" },
  { label: "Campaigns", href: "/dashboard/projects" },
  { label: "Schedules", href: "/dashboard/schedules" },
] as const

export const CRM_PATHS = CRM_TABS.map((tab) => tab.href)

/** The CRM tab bar. Shows only on the three list pages, not on a company's own page. */
export function CrmTabs() {
  const pathname = usePathname()
  const { isAdmin, isImpersonating } = useAuth()
  // Creators and clients see Campaigns on its own, without the CRM tabs.
  if (!isAdmin || isImpersonating) return null
  if (!CRM_PATHS.includes(pathname as (typeof CRM_PATHS)[number])) return null
  return (
    <nav aria-label="CRM" className={cn("w-full px-4 pt-4 sm:px-6", pathname !== "/dashboard/companies" && "mx-auto max-w-6xl")}>
      <div className="inline-flex rounded-lg bg-muted p-0.5 text-sm font-medium">
        {CRM_TABS.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn("rounded-md px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
