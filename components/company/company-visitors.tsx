"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Copy, Download, ExternalLink, Loader2, LogOut, RefreshCw, Settings, Eye } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { SectionAddButton } from "@/components/company/section-add-button"
import { CollectionView } from "@/components/dashboard/collection-view"
import { InitialAvatar } from "@/components/dashboard/compact-list-row"
import type { ItemActions } from "@/components/dashboard/item-menu"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { usePlanBilling, useSubscription } from "@/components/company/company-plan"
import { SettingRow, VisitorExtras } from "@/components/company/visitor-extras"
import { PlanPricing } from "@/components/company/plan-pricing"
import { SectionHeader } from "@/components/dashboard/section-header"
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
  // People still on site first, then past visits in the order they arrive.
  const rows = useMemo(() => [...allVisitors.filter((visitor) => visitor.status === "on_site"), ...allVisitors.filter((visitor) => visitor.status !== "on_site")], [allVisitors])
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

  /** Sign out is the only action, and only for someone still on site. */
  function visitorActions(visitor: Visitor): ItemActions | undefined {
    if (visitor.status !== "on_site") return undefined
    return {
      noun: "visitor",
      name: visitor.name,
      extra: (
        <DropdownMenuItem onSelect={() => void signOut(visitor)} disabled={busyId === visitor.id}>
          {busyId === visitor.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
          Sign out
        </DropdownMenuItem>
      ),
    }
  }

  function visitTimes(visitor: Visitor) {
    return visitor.status === "on_site"
      ? `On site · in at ${time(visitor.signedInAt)}`
      : `${day(visitor.signedInAt)} · ${time(visitor.signedInAt)}${visitor.signedOutAt ? `–${time(visitor.signedOutAt)}` : ""}`
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
            <DialogTitle>Pass settings</DialogTitle>
            <DialogDescription className="sr-only">How visitors sign in, and who hears about it.</DialogDescription>
          </DialogHeader>
          <div>
            <SettingRow
              title="Front desk sign-in"
              description="A sign-in page for a tablet at reception."
              control={<Switch checked={Boolean(kiosk?.enabled)} onCheckedChange={(checked) => void toggleKiosk(checked)} disabled={kioskBusy} aria-label="Front desk sign-in" />}
            >
              {link && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input value={link} readOnly aria-label="Sign-in link" className="font-mono text-xs text-muted-foreground" onFocus={(event) => event.target.select()} />
                    <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" onClick={() => { void navigator.clipboard.writeText(link); toast.success("Link copied") }} aria-label="Copy link" title="Copy link">
                      <Copy className="size-4" aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" asChild>
                      <a href={link} target="_blank" rel="noreferrer" aria-label="Open sign-in page" title="Open"><ExternalLink className="size-4" aria-hidden="true" /></a>
                    </Button>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void newLink()} disabled={kioskBusy} className="-ml-3 text-muted-foreground">
                    <RefreshCw className="size-4" aria-hidden="true" /> Reset link
                  </Button>
                </div>
              )}
            </SettingRow>
            {link && <VisitorExtras companyId={companyId} slug={slug} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Until front desk sign-in is on, Pass opens on its plans, with a free start first. */}
      {!kiosk?.enabled && (
        <section aria-labelledby="pass-pricing-heading">
          <PlanPricing
            companyId={companyId}
            billing={billing}
            header={<SectionHeader id="pass-pricing-heading" title="Choose how to start Pass" />}
            free={{
              label: "Continue with free",
              onSelect: () => toggleKiosk(true),
              busy: kioskBusy,
            }}
            onBeforeSubscribe={async () => { await setKioskEnabled(agencyId, companyId, true, kiosk) }}
          />
        </section>
      )}

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p className="text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => { setError(""); setVisitors(null); setRetryCount((count) => count + 1) }}>
            Try again
          </Button>
        </div>
      ) : (
        <CollectionView
          className=""
          items={rows}
          getKey={(visitor) => visitor.id}
          searchFields={(visitor) => [visitor.name, visitor.visitorCompany, visitor.hostName, visitor.reason, visitor.email, visitor.phone, visitor.agreement?.title]}
          searchPlaceholder="Search visitors"
          viewKey="company-visitors"
          loading={visitors === null}
          empty={{ icon: Eye, title: "No visitors yet", description: "People who sign in at the front desk will appear here." }}
          actions={<>
            {allVisitors.length > 0 && (
            <Button type="button" variant="outline" onClick={() => void exportCsv()} disabled={exporting} className="h-11 rounded-full px-5">
              {exporting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
              Export CSV
            </Button>
            )}
            <SectionAddButton
              label="Sign someone in"
              onClick={() => { if (link) window.open(link, "_blank", "noopener,noreferrer"); else setShareOpen(true) }}
            />
          </>}
          card={(visitor) => {
            const here = visitor.status === "on_site"
            const details = [visitor.visitorCompany, visitor.hostName && `${here ? "Visiting" : "Visited"} ${visitor.hostName}`, visitor.reason].filter(Boolean).join(" · ")
            return {
              icon: <InitialAvatar text={visitor.name} className="size-6 text-xs" />,
              title: visitor.name,
              subtitle: visitTimes(visitor),
              preview: (
                <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center">
                  <InitialAvatar text={visitor.name} className="size-16 text-2xl" />
                  {details && <p className="line-clamp-2 text-sm text-muted-foreground">{details}</p>}
                </div>
              ),
              menuLabel: here ? `Actions for ${visitor.name}` : undefined,
              actions: visitorActions(visitor),
            }
          }}
          listItem={(visitor) => {
            const here = visitor.status === "on_site"
            return (
              <MobileDataCard
                surface="list"
                variant="inline"
                iconShape="circle"
                icon={<InitialAvatar text={visitor.name} className="size-8" />}
                title={visitor.name}
                subtitle={[visitor.visitorCompany, visitor.hostName && `${here ? "Visiting" : "Visited"} ${visitor.hostName}`, visitor.reason, visitor.agreement && `Agreed to ${visitor.agreement.title}`, !here && (visitor.phone || visitor.email)].filter(Boolean).join(" · ") || "—"}
                trailing={visitTimes(visitor)}
                menuLabel={here ? `Actions for ${visitor.name}` : undefined}
                actions={visitorActions(visitor)}
              />
            )
          }}
        />
      )}
    </div>
  )
}
