"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Copy, CreditCard, ExternalLink, Loader2, LogOut, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { daysLeft, VISITOR_GRACE_DAYS, VISITOR_PRICE_NAIRA, VISITOR_TRIAL_DAYS, visitorAccess, type VisitorBilling } from "@/lib/visitor-billing"
import { kioskUrl, resetKioskKey, visitDay as day, visitTime as time, setKioskEnabled, signOutVisitor, watchKiosk, watchVisitorBilling, watchVisitors, type Visitor, type VisitorKiosk } from "@/lib/visitors"

const PRICE = `₦${VISITOR_PRICE_NAIRA.toLocaleString("en-NG")}`

/** The company's Visitors tab: who is in now, past visits, and the front-desk tablet link. */
export function CompanyVisitors({ agencyId, companyId, slug }: { agencyId: string; companyId: string; slug: string }) {
  const [visitors, setVisitors] = useState<Visitor[] | null>(null)
  const [kiosk, setKiosk] = useState<VisitorKiosk | null>(null)
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [busyId, setBusyId] = useState("")
  const [kioskBusy, setKioskBusy] = useState(false)
  const [billing, setBilling] = useState<VisitorBilling | null | undefined>(undefined)
  const [billingBusy, setBillingBusy] = useState(false)
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const verified = useRef(false)

  useEffect(() => {
    if (!agencyId || !companyId) return
    const stopVisitors = watchVisitors(
      agencyId,
      companyId,
      (rows) => { setVisitors(rows); setError("") },
      (reason) => { console.error("Visitor list subscription failed", reason); setError("Visitor list unavailable.") },
    )
    const stopKiosk = watchKiosk(companyId, setKiosk, () => undefined)
    const stopBilling = watchVisitorBilling(companyId, setBilling, () => setBilling(null))
    return () => {
      stopVisitors()
      stopKiosk()
      stopBilling()
    }
  }, [agencyId, companyId, retryCount])

  const onSite = useMemo(() => (visitors ?? []).filter((visitor) => visitor.status === "on_site"), [visitors])
  const past = useMemo(() => (visitors ?? []).filter((visitor) => visitor.status !== "on_site"), [visitors])
  const link = kiosk?.enabled && kiosk.key ? kioskUrl(slug, kiosk.key) : ""

  async function billingCall(action: "start" | "subscribe" | "verify" | "manage", extra: Record<string, string> = {}) {
    if (!user) throw new Error("Please sign in again.")
    const response = await fetch("/api/billing/visitors", {
      method: "POST",
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, companyId, ...extra }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.")
    return body as { url?: string }
  }

  /** Subscribe goes to Paystack's checkout; Manage goes to Paystack's page to change card or cancel. */
  async function openPaystack(action: "subscribe" | "manage") {
    setBillingBusy(true)
    try {
      const { url } = await billingCall(action)
      if (url) window.location.assign(url)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
      setBillingBusy(false)
    }
  }

  // A tablet switched on before billing existed starts its trial now.
  useEffect(() => {
    if (kiosk?.enabled && billing === null && user) void billingCall("start").catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kiosk?.enabled, billing === null, user])

  // Back from Paystack: confirm the payment, then tidy the address bar.
  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref")
    if (!user || !reference || verified.current) return
    verified.current = true
    setBillingBusy(true)
    billingCall("verify", { reference })
      .then(() => toast.success("Payment received. Visitor sign-in is on."))
      .catch((reason) => toast.error(reason instanceof Error ? reason.message : "We couldn't confirm the payment."))
      .finally(() => {
        setBillingBusy(false)
        router.replace(`${pathname}?tab=visitors`)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams])

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
            <p className="mt-1 text-sm text-muted-foreground">Use this link at reception. Hosts get an email when visitors sign in.</p>
          </div>
          <Switch id="kiosk-toggle" checked={Boolean(kiosk?.enabled)} onCheckedChange={(checked) => void toggleKiosk(checked)} disabled={kioskBusy} />
        </div>
        {link && (
          <div className="mt-4 space-y-3">
            <p className="truncate rounded-lg bg-card px-3 py-2 font-mono text-xs text-muted-foreground">{link}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(link); toast.success("Link copied") }}>
                <Copy className="size-4" aria-hidden="true" /> Copy link
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={link} target="_blank" rel="noreferrer"><ExternalLink className="size-4" aria-hidden="true" /> Open</a>
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void newLink()} disabled={kioskBusy}>
                <RefreshCw className="size-4" aria-hidden="true" /> New link
              </Button>
            </div>
          </div>
        )}
        <BillingStatus billing={billing} busy={billingBusy} onSubscribe={() => void openPaystack("subscribe")} onManage={() => void openPaystack("manage")} />
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
          <section>
            <h2 className="sidebar-nav-label font-sans text-muted-foreground [font-family:inherit]">In the building now · {onSite.length}</h2>
            {onSite.length ? (
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
                {onSite.map((visitor) => (
                  <li key={visitor.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{visitor.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[visitor.visitorCompany, visitor.hostName && `Visiting ${visitor.hostName}`, visitor.reason, `In at ${time(visitor.signedInAt)}`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void signOut(visitor)} disabled={busyId === visitor.id}>
                      {busyId === visitor.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
                      Sign out
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Nobody is signed in.</p>
            )}
          </section>

          <section>
            <h2 className="sidebar-nav-label font-sans text-muted-foreground [font-family:inherit]">Past visits</h2>
            {past.length ? (
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
                {past.map((visitor) => (
                  <li key={visitor.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{visitor.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[visitor.visitorCompany, visitor.hostName && `Visited ${visitor.hostName}`, visitor.reason, visitor.phone || visitor.email].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-xs text-muted-foreground">
                      {day(visitor.signedInAt)}
                      <br />
                      {time(visitor.signedInAt)}{visitor.signedOutAt ? `–${time(visitor.signedOutAt)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No visits yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function shortDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

/** Trial, paid or paused, with the one button that fits. */
function BillingStatus({ billing, busy, onSubscribe, onManage }: { billing: VisitorBilling | null | undefined; busy: boolean; onSubscribe: () => void; onManage: () => void }) {
  if (billing === undefined) return null
  const access = billing ? visitorAccess(billing) : null
  const subscribed = Boolean(billing?.subscriptionCode)
  const cancelled = billing?.status === "cancelled"

  let title = `${VISITOR_TRIAL_DAYS}-day free trial, then ${PRICE} a month`
  let detail = "The trial starts when you switch the tablet on."
  let tone = "text-muted-foreground"
  if (access?.state === "trial") {
    const left = daysLeft(access.endsAt)
    title = `Free trial · ${left} ${left === 1 ? "day" : "days"} left`
    detail = `Subscribe for ${PRICE} a month to keep the tablet working after ${shortDate(access.endsAt)}.`
  } else if (access?.state === "active") {
    title = cancelled ? `Cancelled · works until ${shortDate(access.endsAt)}` : `Paid · ${PRICE} a month`
    detail = cancelled ? "Subscribe again to keep it going." : `Next payment ${shortDate(billing?.nextPaymentAt?.toMillis?.() ?? access.endsAt)}.`
    tone = cancelled ? "text-amber-600" : "text-emerald-600"
  } else if (access?.state === "grace") {
    const left = daysLeft(access.endsAt)
    title = billing?.status === "past_due" ? "Payment didn't go through" : "Subscription ended"
    detail = `The tablet stops in ${left} ${left === 1 ? "day" : "days"} (${VISITOR_GRACE_DAYS}-day grace). Update your card or subscribe again.`
    tone = "text-amber-600"
  } else if (access?.state === "paused") {
    title = "Paused · the tablet is off"
    detail = `Subscribe for ${PRICE} a month to switch it back on. Past visits are kept.`
    tone = "text-destructive"
  }

  const showSubscribe = !access || access.state === "trial" || access.state === "paused" || cancelled || (access.state === "grace" && !subscribed)
  const showManage = subscribed && !(cancelled && access?.state === "paused")

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${tone}`}>{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="flex gap-2">
        {showManage && (
          <Button type="button" variant="outline" size="sm" onClick={onManage} disabled={busy}>Change card or cancel</Button>
        )}
        {showSubscribe && access && (
          <Button type="button" size="sm" onClick={onSubscribe} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CreditCard className="size-4" aria-hidden="true" />}
            Subscribe · {PRICE}/month
          </Button>
        )}
      </div>
    </div>
  )
}
