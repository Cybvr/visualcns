"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { MobileCardsSkeleton } from "@/components/dashboard/collection-skeletons"
import { CompactListSkeleton, InitialAvatar, MOBILE_LIST_CARD, MobileListRow } from "@/components/dashboard/compact-list-row"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar } from "@/components/dashboard/filter-bar"
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
  const [retryCount, setRetryCount] = useState(0)
  const [companyNames, setCompanyNames] = useState<Record<string, { name: string; slug?: string }>>({})
  const [filter, setFilter] = useState<"all" | "on_site">("all")
  const [busyId, setBusyId] = useState("")

  useEffect(() => {
    if (authLoading || !agencyId) return
    if (!agencyView && !companyId) return
    const receive = (rows: Visitor[]) => { setVisitors(rows); setError(false) }
    const fail = (reason: Error) => { console.error("Visitor list subscription failed", reason); setError(true) }
    return agencyView
      ? watchAgencyVisitors(agencyId, receive, fail)
      : watchVisitors(agencyId, companyId, receive, fail)
  }, [agencyId, agencyView, authLoading, companyId, retryCount])

  // Older visits were saved without the company's name.
  useEffect(() => {
    if (!agencyView) return
    getOrganizations()
      .then((orgs) => setCompanyNames(Object.fromEntries(orgs.map((org) => [org.id, { name: org.name, slug: org.slug }]))))
      .catch(() => undefined)
  }, [agencyView])

  const onSiteCount = useMemo(() => (visitors ?? []).filter((visitor) => visitor.status === "on_site").length, [visitors])
  const filteredVisitors = useMemo(
    () => (visitors ?? []).filter((visitor) => filter === "all" || visitor.status === "on_site"),
    [filter, visitors],
  )
  const { results: rows, bar } = useFilterBar({
    items: filteredVisitors,
    search: (visitor) => [
      [visitor.name, visitor.visitorCompany, visitor.hostName, visitor.reason,
        visitor.companyName || companyNames[visitor.companyId]?.name || "", visitor.phone, visitor.email].join(" "),
    ],
  })

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
      <TableFilterBar {...bar} placeholder="Search visitors" controls={
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
      } />

      {error ? (
        <div role="alert" className="mt-10 flex flex-wrap items-center gap-3 text-sm">
          <p className="text-destructive">Visitor list unavailable.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => { setError(false); setVisitors(null); setRetryCount((count) => count + 1) }}>
            Try again
          </Button>
        </div>
      ) : visitors === null ? (
        <div className="mt-5 min-w-0">
          <div className="sm:hidden"><CompactListSkeleton /></div>
          <div className="hidden sm:block"><MobileCardsSkeleton /></div>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm font-medium text-foreground">{visitors.length ? "No visitors match." : "No visitors yet"}</p>
          {!visitors.length && (
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {agencyView ? "Set up a front desk link to start recording visits." : "Visits will appear here after someone signs in."}
            </p>
          )}
          {!visitors.length && agencyView && companyId && (
            <Button asChild className="mt-5">
              <Link href={`/dashboard/clients/${encodeURIComponent(companyId)}?tab=visitors`}>Set up sign-in</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-5 min-w-0">
          <ul className={cn(MOBILE_LIST_CARD, "sm:hidden")}>
            {rows.map((visitor) => {
              const companyName = visitor.companyName || companyNames[visitor.companyId]?.name || ""
              const onSite = visitor.status === "on_site"
              const day = visitDay(visitor.signedInAt)
              const busy = busyId === visitor.id
              return (
                <li key={visitor.id}>
                  <MobileListRow
                    avatar={
                      <span className="relative block">
                        <InitialAvatar text={visitor.name} />
                        {onSite && <span className="absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-card bg-emerald-500" aria-hidden="true" />}
                      </span>
                    }
                    avatarMenu={onSite ? (
                      <DropdownMenuItem onSelect={() => void signOut(visitor)} disabled={busy}>
                        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
                        Sign out
                      </DropdownMenuItem>
                    ) : undefined}
                    avatarLabel={`Actions for ${visitor.name}`}
                    title={visitor.name}
                    meta={day === "Today" ? visitTime(visitor.signedInAt) : day}
                    lines={[
                      [agencyView && companyName, visitor.visitorCompany, visitor.hostName && `Visiting ${visitor.hostName}`, visitor.reason].filter(Boolean).join(" · "),
                      onSite ? `In the building since ${visitTime(visitor.signedInAt)}` : `Signed out${visitor.signedOutAt ? ` · ${visitTime(visitor.signedInAt)}–${visitTime(visitor.signedOutAt)}` : ""}`,
                    ]}
                    lineClassNames={["text-foreground/90", onSite ? "text-emerald-700 dark:text-emerald-400" : ""]}
                  />
                </li>
              )
            })}
          </ul>
          <div className="hidden space-y-2 sm:block">
            {rows.map((visitor) => {
              const company = companyNames[visitor.companyId]
              const companyName = visitor.companyName || company?.name || ""
              const onSite = visitor.status === "on_site"
              return (
                <MobileDataCard
                  key={visitor.id}
                  surface="muted"
                  iconShape="circle"
                  icon={<InitialAvatar text={visitor.name} className="size-11" />}
                  title={visitor.name}
                  subtitle={[agencyView && companyName, visitor.visitorCompany, visitor.hostName && `Visiting ${visitor.hostName}`].filter(Boolean).join(" · ") || (onSite ? "In the building" : "Signed out")}
                  description={[
                    visitor.reason,
                    onSite ? "In the building" : `Signed out${visitor.signedOutAt ? ` at ${visitTime(visitor.signedOutAt)}` : ""}`,
                  ].filter(Boolean).join(" · ")}
                  trailing={`${visitDay(visitor.signedInAt)} · ${visitTime(visitor.signedInAt)}`}
                  menuLabel={`Actions for ${visitor.name}`}
                  menu={onSite || (agencyView && companyName) ? <>
                    {agencyView && companyName && <DropdownMenuItem asChild><Link href={`/dashboard/clients/${encodeURIComponent(company?.slug || visitor.companyId)}?tab=visitors`}>View client</Link></DropdownMenuItem>}
                    {onSite && <DropdownMenuItem onSelect={() => void signOut(visitor)} disabled={busyId === visitor.id}>Sign out</DropdownMenuItem>}
                  </> : undefined}
                />
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
