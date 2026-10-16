"use client"

import { usePathname, useRouter } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type RouteTab = { label: string; href: string }

/** Documents and Notes share one sidebar item, switched by these tabs. */
export const DOCUMENT_TABS: RouteTab[] = [
  { label: "Documents", href: "/dashboard/documents" },
  { label: "Notes", href: "/dashboard/notes" },
]

/** Invoices and Estimates share one sidebar item, switched by these tabs. */
export const BILLING_TABS: RouteTab[] = [
  { label: "Invoices", href: "/dashboard/invoices" },
  { label: "Estimates", href: "/dashboard/estimates" },
]

/** Tabs that are pages: each one is its own address, so it can be linked and gone back to. */
export function RouteTabs({ tabs, className }: { tabs: RouteTab[]; className?: string }) {
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const active = tabs.find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.href ?? tabs[0].href
  return (
    <Tabs value={active} onValueChange={(href) => router.push(href)} className={className ?? "mb-4"}>
      <TabsList>
        {tabs.map((tab) => <TabsTrigger key={tab.href} value={tab.href}>{tab.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  )
}
