"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, Download, ExternalLink, Loader2, LogOut, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { InitialAvatar } from "@/components/dashboard/compact-list-row"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CompanyPlan, usePlanBilling, useSubscription } from "@/components/company/company-plan"
import type { PlanKey } from "@/lib/subscription"
import { VisitorExtras } from "@/components/company/visitor-extras"
import { getAllVisitors, kioskUrl, resetKioskKey, visitorsCsv, visitDay as day, visitTime as time, setKioskEnabled, signOutVisitor, watchKiosk, watchVisitors, type Visitor, type VisitorKiosk } from "@/lib/visitors"

type StaffInfo = { staff: { id: string; name: string; email: string }[]; pending: { id: string; email: string }[]; seats: number; limit: number | null; plan: PlanKey | null }

/** The company's Visitors tab: who is in now, past visits, and the front-desk tablet link. */
export function CompanyVisitors({ agencyId, companyId, slug }: { agencyId: string; companyId: string; slug: string }) {
  const [visitors, setVisitors] = useState<Visitor[] | null>(null)
  const [kiosk, setKiosk] = useState<VisitorKiosk | null>(null)
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [busyId, setBusyId] = useState("")
  const [kioskBusy, setKioskBusy] = useState(false)
  const billing = useSubscription(companyId)
  const billingCall = usePlanBilling(companyId)
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!agencyId || !companyId) return
    const stopVisitors = watchVisitors(
      agencyId,
      companyId,
      (rows) => { setVisitors(rows); setError("") },
      (reason) => { console.error("Visitor list subscription failed", reason); setError("Visitor list unavailable.") },
    )
    const stopKiosk = watchKiosk(companyId, setKiosk, () => undefined)
    return () => {
      stopVisitors()
      stopKiosk()
    }
  }, [agencyId, companyId, retryCount])

  const [exporting, setExporting] = useState(false)

  async function exportCsv() {
    setExporting(true)
    try {
      const all = await getAllVisitors(agencyId, companyId)
      const url = URL.createObjectURL(new Blob([visitorsCsv(all)], { type: "text/csv;charset=utf-8" }))
      const link = document.createElement("a")
      link.href = url
      link.download = `visitors-${slug}-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Couldn't export visitors. Try again.")
    } finally {
      setExporting(false)
    }
  }

  const onSite = useMemo(() => (visitors ?? []).filter((visitor) => visitor.status === "on_site"), [visitors])
  const past = useMemo(() => (visitors ?? []).filter((visitor) => visitor.status !== "on_site"), [visitors])
  const link = kiosk?.enabled && kiosk.key ? kioskUrl(slug, kiosk.key) : ""

  async function staffCall(method: "GET" | "POST" | "DELETE", body?: Record<string, string>) {
    if (!user) throw new Error("Please sign in again.")
    const response = await fetch(method === "GET" ? `/api/visitors/staff?companyId=${encodeURIComponent(companyId)}` : "/api/visitors/staff", {
      method,
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify({ companyId, ...body }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.")
    return data
  }

  async function reloadStaff() {
    try {
      setStaffInfo(await staffCall("GET") as StaffInfo)
    } catch {
      setStaffInfo(null)
    }
  }

  // Staff and the plan's limit change when someone is invited or the site pays.
  useEffect(() => {
    if (user && companyId) void reloadStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, companyId, billing?.plan, billing?.paidUntil?.toMillis?.()])

  // A tablet switched on before billing existed starts its trial now.
  useEffect(() => {
    if (kiosk?.enabled && billing === null && user) void billingCall("start").catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kiosk?.enabled, billing === null, user])

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

  async function toggleKiosk(enabled: boolean) {
    setKioskBusy(true)
    try {
      await setKioskEnabled(agencyId, companyId, enabled, kiosk)
      // Switching the tablet on for the first time starts the free trial.
      if (enabled && !billing) await billingCall("start").catch(() => undefined)
    } catch {
      toast.error("Couldn't change the sign-in link. Try again.")
    } finally {
      setKioskBusy(false)
    }
  }

  async function newLink() {
    setKioskBusy(true)
    try {
      await resetKioskKey(agencyId, companyId)
      toast.success("New link made. The old one no longer works.")
    } catch {
      toast.error("Couldn't make a new link. Try again.")
    } finally {
      setKioskBusy(false)
    }
  }

  return (
    <div className="mt-5 space-y-8">
      <section className="rounded-2xl border border-border bg-background p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label htmlFor="kiosk-toggle" className="text-sm font-semibold text-foreground">Front desk sign-in</Label>
            <p className="mt-1 text-sm text-muted-foreground">Share the link with reception.</p>
          </div>
          <Switch id="kiosk-toggle" checked={Boolean(kiosk?.enabled)} onCheckedChange={(checked) => void toggleKiosk(checked)} disabled={kioskBusy} />
        </div>
        {link && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => { void navigator.clipboard.writeText(link); toast.success("Link copied") }}>
                <Copy className="size-4" aria-hidden="true" /> Copy link
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={link} target="_blank" rel="noreferrer"><ExternalLink className="size-4" aria-hidden="true" /> Open</a>
              </Button>
            </div>
            <details className="mt-3 text-sm text-muted-foreground">
              <summary className="w-fit cursor-pointer rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">Link settings</summary>
              <div className="mt-3 space-y-2">
                <p className="break-all text-xs">{link}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => void newLink()} disabled={kioskBusy}>
                  <RefreshCw className="size-4" aria-hidden="true" /> Make a new link
                </Button>
              </div>
            </details>
          </div>
        )}
        {link && <VisitorExtras companyId={companyId} slug={slug} />}
        <CompanyPlan companyId={companyId} billing={billing} seats={staffInfo?.seats ?? null} className="mt-4" />
      </section>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p className="text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => { setError(""); setVisitors(null); setRetryCount((count) => count + 1) }}>
            Try again
          </Button>
        </div>
      ) : visitors === null ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading visitors" />
      ) : (
        <>
          {visitors.length > 0 && (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => void exportCsv()} disabled={exporting}>
                {exporting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
                Export CSV
              </Button>
            </div>
          )}
          <section>
            <h2 className="text-sm font-semibold text-foreground">On site · {onSite.length}</h2>
            {onSite.length ? (
              <div className="mt-3 space-y-2">
                {onSite.map((visitor) => (
                  <MobileDataCard
                    key={visitor.id}
                    surface="muted"
                    iconShape="circle"
                    icon={<InitialAvatar text={visitor.name} className="size-11" />}
                    title={visitor.name}
                    subtitle={[visitor.visitorCompany, visitor.hostName && `Visiting ${visitor.hostName}`, visitor.reason, visitor.agreement && `Agreed to ${visitor.agreement.title}`].filter(Boolean).join(" · ")}
                    trailing={`In at ${time(visitor.signedInAt)}`}
                    menuLabel={`Actions for ${visitor.name}`}
                    menu={<DropdownMenuItem onSelect={() => void signOut(visitor)} disabled={busyId === visitor.id}>
                      {busyId === visitor.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
                      Sign out
                    </DropdownMenuItem>}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No visitors right now.</p>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground">Past visits</h2>
            {past.length ? (
              <div className="mt-3 space-y-2">
                {past.map((visitor) => (
                  <MobileDataCard
                    key={visitor.id}
                    surface="muted"
                    iconShape="circle"
                    icon={<InitialAvatar text={visitor.name} className="size-11" />}
                    title={visitor.name}
                    subtitle={[visitor.visitorCompany, visitor.hostName && `Visited ${visitor.hostName}`, visitor.reason, visitor.agreement && `Agreed to ${visitor.agreement.title}`, visitor.phone || visitor.email].filter(Boolean).join(" · ") || "—"}
                    trailing={<>{day(visitor.signedInAt)}<br />{time(visitor.signedInAt)}{visitor.signedOutAt ? `–${time(visitor.signedOutAt)}` : ""}</>}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No visits yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
