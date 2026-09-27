"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, LogOut, Search } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getOrganizations } from "@/lib/organizations"
import { signOutVisitor, visitDay, visitTime, watchAgencyVisitors, watchVisitors, type Visitor } from "@/lib/visitors"
import { cn } from "@/lib/utils"

/**
 * Every front-desk visitor in one list. Admins see all their clients; a
 * client's staff see their own company's visitors.
 */
export default function VisitorsPage() {
  const { appUser, isAdmin, isImpersonating, loading: authLoading } = useAuth()
  const agencyView = isAdmin && !isImpersonating
  const agencyId = appUser?.agencyId || ""
  const companyId = appUser?.companyId || ""

  const [visitors, setVisitors] = useState<Visitor[] | null>(null)
  const [error, setError] = useState(false)
  const [companyNames, setCompanyNames] = useState<Record<string, { name: string; slug?: string }>>({})
  const [filter, setFilter] = useState<"all" | "on_site">("all")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState("")

  useEffect(() => {
    if (authLoading || !agencyId) return
    if (!agencyView && !companyId) return
    const fail = () => setError(true)
    return agencyView
      ? watchAgencyVisitors(agencyId, setVisitors, fail)
      : watchVisitors(agencyId, companyId, setVisitors, fail)
  }, [agencyId, agencyView, authLoading, companyId])

  // Older visits were saved without the company's name.
  useEffect(() => {
    if (!agencyView) return
    getOrganizations()
      .then((orgs) => setCompanyNames(Object.fromEntries(orgs.map((org) => [org.id, { name: org.name, slug: org.slug }]))))
      .catch(() => undefined)
  }, [agencyView])

  const onSiteCount = useMemo(() => (visitors ?? []).filter((visitor) => visitor.status === "on_site").length, [visitors])
  const rows = useMemo(() => {
    const words = search.trim().toLowerCase()
    return (visitors ?? []).filter((visitor) => {
      if (filter === "on_site" && visitor.status !== "on_site") return false
      if (!words) return true
      const company = visitor.companyName || companyNames[visitor.companyId]?.name || ""
      return [visitor.name, visitor.hostName, visitor.reason, company, visitor.phone, visitor.email].join(" ").toLowerCase().includes(words)
    })
  }, [companyNames, filter, search, visitors])

  async function signOut(visitor: Visitor) {
    setBusyId(visitor.id)
    try {
      await signOutVisitor(visitor.id)
    } catch {
      toast.error("Couldn't sign them out. Try again.")
    } finally {
      setBusyId("")
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-12 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-card p-1">
          {([
            { value: "all", label: "All" },
            { value: "on_site", label: `In now · ${onSiteCount}` },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                filter === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search visitors" aria-label="Search visitors" className="pl-6" />
        </label>
      </div>

      {error ? (
        <p className="mt-10 text-sm text-destructive">Couldn&rsquo;t load visitors right now.</p>
      ) : visitors === null ? (
        <DashboardPageSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm font-medium text-foreground">{visitors.length ? "No visitors match." : "No visitors yet"}</p>
          {!visitors.length && (
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Turn on front desk sign-in from a client&apos;s Visitors tab, then open the link on a tablet at their reception.
            </p>
          )}
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
          {rows.map((visitor) => {
            const company = companyNames[visitor.companyId]
            const companyName = visitor.companyName || company?.name || ""
            const onSite = visitor.status === "on_site"
            return (
              <li key={visitor.id} className="flex items-center gap-3 px-4 py-3">
                <span className={cn("size-2 shrink-0 rounded-full", onSite ? "bg-emerald-500" : "bg-border")} aria-label={onSite ? "In the building" : "Signed out"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{visitor.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {agencyView && companyName && (
                      <>
                        <Link href={`/dashboard/clients/${encodeURIComponent(company?.slug || visitor.companyId)}?tab=visitors`} className="hover:text-foreground hover:underline">
                          {companyName}
                        </Link>
                        {(visitor.hostName || visitor.reason) && " · "}
                      </>
                    )}
                    {[visitor.hostName && `Visiting ${visitor.hostName}`, visitor.reason].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="shrink-0 text-right text-xs text-muted-foreground">
                  {visitDay(visitor.signedInAt)}
                  <br />
                  {visitTime(visitor.signedInAt)}{visitor.signedOutAt ? `–${visitTime(visitor.signedOutAt)}` : ""}
                </p>
                {onSite && (
                  <Button type="button" variant="outline" size="sm" onClick={() => void signOut(visitor)} disabled={busyId === visitor.id} aria-label={`Sign out ${visitor.name}`}>
                    {busyId === visitor.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
                    <span className="max-sm:hidden">Sign out</span>
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
