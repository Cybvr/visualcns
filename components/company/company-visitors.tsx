"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Copy, Download, ExternalLink, Loader2, LogOut, RefreshCw, Settings, Eye } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { CompanyEmptyState } from "@/components/company/empty-state"
import { InitialAvatar } from "@/components/dashboard/compact-list-row"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { Button } from "@/components/ui/button"
import { ListSearch, useListSearch } from "@/components/dashboard/list-search"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { usePlanBilling, useSubscription } from "@/components/company/company-plan"
import { VisitorExtras } from "@/components/company/visitor-extras"
import { getAllVisitors, kioskUrl, resetKioskKey, visitorsCsv, visitDay as day, visitTime as time, setKioskEnabled, signOutVisitor, watchKiosk, watchVisitors, type Visitor, type VisitorKiosk } from "@/lib/visitors"

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
  const { user } = useAuth()
  const [shareOpen, setShareOpen] = useState(false)
  // The page title row (in the company shell) has a spot for page actions.
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null)
  useEffect(() => { setTitleSlot(document.getElementById("company-title-actions")) }, [])

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

  const allVisitors = useMemo(() => visitors ?? [], [visitors])
  const { query, setQuery, results } = useListSearch(allVisitors, (visitor) => [visitor.name, visitor.visitorCompany, visitor.hostName, visitor.reason, visitor.email, visitor.phone, visitor.agreement?.title])
  // People still on site first, then past visits in the order they arrive.
  const rows = useMemo(() => [...results.filter((visitor) => visitor.status === "on_site"), ...results.filter((visitor) => visitor.status !== "on_site")], [results])
  const link = kiosk?.enabled && kiosk.key ? kioskUrl(slug, kiosk.key) : ""

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

  const actions = (
    <>
      <Button type="button" onClick={() => setShareOpen(true)}>
        <Settings className="size-4" aria-hidden="true" /> Settings
      </Button>
    </>
  )

  return (
    <div className="mt-5 space-y-8">
      {titleSlot ? createPortal(actions, titleSlot) : <div className="flex justify-end gap-2">{actions}</div>}

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Front desk sign-in. Share the link with reception.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="kiosk-toggle" className="text-sm font-medium text-foreground">Sign-in link on</Label>
            <Switch id="kiosk-toggle" checked={Boolean(kiosk?.enabled)} onCheckedChange={(checked) => void toggleKiosk(checked)} disabled={kioskBusy} />
          </div>
          {link && (
            <div>
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
        </DialogContent>
      </Dialog>

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
          <div className="flex items-center justify-between gap-3">
            <ListSearch value={query} onChange={setQuery} placeholder="Search visitors" className="max-w-sm flex-1" />
            {visitors.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => void exportCsv()} disabled={exporting}>
                {exporting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
                Export CSV
              </Button>
            )}
          </div>
          {visitors.length === 0 ? (
            <CompanyEmptyState icon={Eye} title="No visitors yet" description="People who sign in at the front desk will appear here." />
          ) : rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches your search.</p>
          ) : (
            <div>
              {rows.map((visitor) => {
                const here = visitor.status === "on_site"
                return (
                  <MobileDataCard
                    key={visitor.id}
                    surface="list"
                    variant="inline"
                    iconShape="circle"
                    icon={<InitialAvatar text={visitor.name} className="size-8" />}
                    title={visitor.name}
                    subtitle={[visitor.visitorCompany, visitor.hostName && `${here ? "Visiting" : "Visited"} ${visitor.hostName}`, visitor.reason, visitor.agreement && `Agreed to ${visitor.agreement.title}`, !here && (visitor.phone || visitor.email)].filter(Boolean).join(" · ") || "—"}
                    trailing={here ? `On site · in at ${time(visitor.signedInAt)}` : `${day(visitor.signedInAt)} · ${time(visitor.signedInAt)}${visitor.signedOutAt ? `–${time(visitor.signedOutAt)}` : ""}`}
                    menuLabel={here ? `Actions for ${visitor.name}` : undefined}
                    menu={here ? <DropdownMenuItem onSelect={() => void signOut(visitor)} disabled={busyId === visitor.id}>
                      {busyId === visitor.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
                      Sign out
                    </DropdownMenuItem> : undefined}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
