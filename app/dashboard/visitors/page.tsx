"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { EllipsisVertical, Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { TableRowsSkeleton } from "@/components/dashboard/collection-skeletons"
import { CompactListSkeleton } from "@/components/dashboard/compact-list-row"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar } from "@/components/dashboard/filter-bar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
          <div className="hidden sm:block"><TableRowsSkeleton headers={["Visitor", "Host", "Visit", ""]} /></div>
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
          <ul className="divide-y divide-border sm:hidden">
            {rows.map((visitor) => {
              const companyName = visitor.companyName || companyNames[visitor.companyId]?.name || ""
              const onSite = visitor.status === "on_site"
              return (
                <li key={visitor.id} className="flex min-w-0 items-center gap-3 px-2 py-3">
                  <span className={cn("size-2 shrink-0 rounded-full", onSite ? "bg-emerald-500" : "bg-border")} aria-label={onSite ? "In the building" : "Signed out"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{visitor.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[agencyView && companyName, visitor.visitorCompany, visitor.hostName && `Visiting ${visitor.hostName}`, visitor.reason].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-xs text-muted-foreground">
                    {visitDay(visitor.signedInAt)}<br />{visitTime(visitor.signedInAt)}{visitor.signedOutAt ? `–${visitTime(visitor.signedOutAt)}` : ""}
                  </p>
                  {onSite && (
                    <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => void signOut(visitor)} disabled={busyId === visitor.id} aria-label={`Sign out ${visitor.name}`}>
                      {busyId === visitor.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="hidden min-w-0 sm:block">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead className="w-32">Visit</TableHead>
                  <TableHead className="w-12 text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((visitor) => {
                  const company = companyNames[visitor.companyId]
                  const companyName = visitor.companyName || company?.name || ""
                  const onSite = visitor.status === "on_site"
                  return (
                    <TableRow key={visitor.id}>
                      <TableCell className="max-w-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={cn("size-2 shrink-0 rounded-full", onSite ? "bg-emerald-500" : "bg-border")} aria-label={onSite ? "In the building" : "Signed out"} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{visitor.name}</span>
                            <span className="block truncate text-muted-foreground">
                              {agencyView && companyName ? (
                                <><Link href={`/dashboard/clients/${encodeURIComponent(company?.slug || visitor.companyId)}?tab=visitors`} className="hover:text-foreground hover:underline">{companyName}</Link>{visitor.visitorCompany && ` · ${visitor.visitorCompany}`}</>
                              ) : visitor.visitorCompany || (onSite ? "In the building" : "Signed out")}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-0">
                        <span className="block truncate">{visitor.hostName || "—"}</span>
                        <span className="block truncate text-muted-foreground">{visitor.reason || "—"}</span>
                      </TableCell>
                      <TableCell className="max-w-0 text-muted-foreground">
                        <span className="block">{visitDay(visitor.signedInAt)}</span>
                        <span className="block truncate" title={`${visitTime(visitor.signedInAt)}${visitor.signedOutAt ? `–${visitTime(visitor.signedOutAt)}` : ""}`}>{visitTime(visitor.signedInAt)}{visitor.signedOutAt ? `–${visitTime(visitor.signedOutAt)}` : ""}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {onSite && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" disabled={busyId === visitor.id} aria-label={`Actions for ${visitor.name}`}>
                                {busyId === visitor.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <EllipsisVertical className="size-4" aria-hidden="true" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => void signOut(visitor)}>Sign out</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </main>
  )
}
