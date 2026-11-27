"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { collection, getCountFromServer, query, where } from "firebase/firestore"

import { useAuth } from "@/components/auth-provider"

import { getCurrentAgencyId } from "@/lib/agency-scope"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"

/** The three lists that make up the CRM, each on its own address so old links keep working. */
export const CRM_TABS = [
  { label: "Leads", href: "/admin/leads", collection: "leads" },
  { label: "Companies", href: "/admin/companies", collection: "organizations" },
  { label: "Contacts", href: "/admin/users", collection: "users" },
] as const

export const CRM_PATHS = CRM_TABS.map((tab) => tab.href)

/** The CRM tab bar. Shows only on the three list pages, not on a company's own page. */
export function CrmTabs() {
  const pathname = usePathname()
  const { isAdmin, isImpersonating } = useAuth()
  const [counts, setCounts] = useState<Record<string, number>>({})

  // How many records each list holds, shown beside its tab name.
  useEffect(() => {
    if (!isAdmin || isImpersonating) return
    let cancelled = false
    getCurrentAgencyId()
      .then((agencyId) =>
        Promise.all(
          CRM_TABS.map(async (tab) => {
            const snapshot = await getCountFromServer(query(collection(db, tab.collection), where("agencyId", "==", agencyId)))
            return [tab.href, snapshot.data().count] as const
          }),
        ),
      )
      .then((entries) => { if (!cancelled) setCounts(Object.fromEntries(entries)) })
      .catch((error) => console.warn("Could not load list counts:", error))
    return () => { cancelled = true }
  }, [isAdmin, isImpersonating, pathname])
  // Creators and clients see Campaigns on its own, without the CRM tabs.
  if (!isAdmin || isImpersonating) return null
  if (!CRM_PATHS.includes(pathname as (typeof CRM_PATHS)[number])) return null
  return (
    <nav aria-label="Databases" className={cn("w-full px-4 pt-4 sm:px-6", pathname !== "/admin/companies" && "mx-auto max-w-6xl")}>
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
              {counts[tab.href] !== undefined && <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[tab.href].toLocaleString()}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
