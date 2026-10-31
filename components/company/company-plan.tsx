"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { activeGrowthTier, PlanPricing } from "@/components/company/plan-pricing"
import { useLocalCurrency } from "@/components/use-local-currency"
import { serviceFor } from "@/lib/cart"
import { formatPrice } from "@/lib/plans"
import { currentPlan, daysLeft, GRACE_DAYS, isPlanInterval, isPlanKey, naira, PLANS, planAccess, planPrice, staffLabel, TRIAL_DAYS, type PlanInterval, type PlanKey, type Subscription } from "@/lib/subscription"
import { watchSubscription } from "@/lib/visitors"
import { cn } from "@/lib/utils"

function shortDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

/** Calls /api/billing/plan for one company. */
export function usePlanBilling(companyId: string) {
  const { user } = useAuth()
  return async function call(action: "start" | "subscribe" | "verify" | "manage", extra: Record<string, string> = {}) {
    if (!user) throw new Error("Please sign in again.")
    const response = await fetch("/api/billing/plan", {
      method: "POST",
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, companyId, ...extra }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.")
    return body as { url?: string }
  }
}

/** The company's subscription, live. undefined while loading, null before the trial starts. */
export function useSubscription(companyId: string) {
  const [billing, setBilling] = useState<Subscription | null | undefined>(undefined)
  useEffect(() => watchSubscription(companyId, setBilling, () => setBilling(null)), [companyId])
  return billing
}

/** References already sent for confirmation, so two plan panels on one page confirm a payment once. */
const confirmedReferences = new Set<string>()

/** Back from Paystack: confirms the payment, then tidies the address bar. */
export function usePaymentReturn(companyId: string, setBusy?: (busy: boolean) => void) {
  const { user } = useAuth()
  const call = usePlanBilling(companyId)
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()

  useEffect(() => {
    const reference = searchParams?.get("reference") || searchParams?.get("trxref")
    if (!user || !reference || confirmedReferences.has(reference)) return
    confirmedReferences.add(reference)
    setBusy?.(true)
    call("verify", { reference })
      .then(() => toast.success("Payment received. Your plan is on."))
      .catch((reason) => toast.error(reason instanceof Error ? reason.message : "We couldn't confirm the payment."))
      .finally(() => {
        setBusy?.(false)
        const params = new URLSearchParams(searchParams?.toString())
        params.delete("reference")
        params.delete("trxref")
        router.replace(params.size ? `${pathname}?${params}` : pathname)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams])
}

/**
 * The company's VisualCNS plan: trial, paid or paused, with the Growth plans to
 * buy through the cart. Also confirms a payment when Paystack sends a payer of
 * an older subscription back.
 */
export function CompanyPlan({ companyId, billing, seats = null, className, expanded = false, showSummary = true, showPlans = true }: { companyId: string; billing: Subscription | null | undefined; seats?: number | null; className?: string; /** Shows the plans straight away with no toggle, for use inside a modal. */ expanded?: boolean; /** Hides the current-plan summary when the plan picker is displayed separately. */ showSummary?: boolean; /** Hides the plan picker when only the current-plan summary is needed. */ showPlans?: boolean }) {
  const call = usePlanBilling(companyId)
  const currency = useLocalCurrency()
  const [busy, setBusy] = useState(false)
  const [plansOpen, setPlansOpen] = useState(false)

  usePaymentReturn(companyId, setBusy)

  async function manage() {
    setBusy(true)
    try {
      const { url } = await call("manage", {})
      if (url) window.location.assign(url)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
      setBusy(false)
    }
  }

  if (billing === undefined) return null
  const access = billing ? planAccess(billing) : null
  const subscribed = Boolean(billing?.subscriptionCode)
  const cancelled = billing?.status === "cancelled"
  const plan: PlanKey | null = isPlanKey(billing?.plan) ? billing.plan : null
  const paidInterval: PlanInterval = isPlanInterval(billing?.interval) ? billing.interval : "monthly"
  const growth = activeGrowthTier(billing)
  // A Growth plan bought through the cart, or an older Starter/Business/Pro subscription.
  const paidName = growth?.name ?? (plan ? PLANS[plan].name : "")
  const paidPrice = growth ? formatPrice(serviceFor(growth, paidInterval).price, currency) : plan ? `${naira(planPrice(plan, paidInterval))}/${paidInterval === "yearly" ? "yr" : "mo"}` : ""
  const endsLabel = (ms: number) => growth && !subscribed ? `Runs until ${shortDate(ms)}. Buy again to keep it going.` : `Next payment ${shortDate(billing?.nextPaymentAt?.toMillis?.() ?? ms)}.`

  let title = `${TRIAL_DAYS}-day free trial`
  let detail = "No card needed."
  let tone = "text-muted-foreground"
  if (access?.state === "trial") {
    const left = daysLeft(access.endsAt)
    title = `Free trial · ${left} ${left === 1 ? "day" : "days"} left`
    detail = `Choose a plan to keep going after ${shortDate(access.endsAt)}.`
  } else if (access?.state === "active") {
    title = cancelled ? `Cancelled · works until ${shortDate(access.endsAt)}` : `Paid · ${paidName} · ${paidPrice}`
    detail = cancelled ? "Choose a plan to keep it going." : endsLabel(access.endsAt)
    tone = cancelled ? "text-amber-600" : "text-emerald-600"
  } else if (access?.state === "grace") {
    const left = daysLeft(access.endsAt)
    title = billing?.status === "past_due" ? "Payment didn't go through" : "Plan ended"
    detail = `Everything stops in ${left} ${left === 1 ? "day" : "days"} (${GRACE_DAYS}-day grace). Choose a plan to keep going.`
    tone = "text-amber-600"
  } else if (access?.state === "paused") {
    title = "Paused"
    detail = "Choose a plan to switch Pass and Reports back on. Your records are kept."
    tone = "text-destructive"
  }

  const paid = access && (access.state === "active" || access.state === "grace")
  const appliedPlan = currentPlan(billing)
  const expandedPlanName = access?.state === "trial" ? "Free trial" : paid && paidName ? paidName : "No active plan"
  const expandedPrice = paid && paidPrice ? paidPrice : "Free"
  const expandedCycle = paid ? (paidInterval === "yearly" ? "Yearly" : "Monthly") : "Trial"
  const expandedDateLabel = access?.state === "trial" ? `Ends ${shortDate(access.endsAt)}` : paid && access ? (growth && !subscribed ? `Runs until ${shortDate(access.endsAt)}` : `Next charge ${shortDate(billing?.nextPaymentAt?.toMillis?.() ?? access.endsAt)}`) : "Choose a plan to continue"
  const seatLimit = PLANS[appliedPlan].staff
  const seatPercent = seats !== null && Number.isFinite(seatLimit) ? Math.min(100, Math.round((seats / seatLimit) * 100)) : 0
  const showManage = subscribed && !(cancelled && access?.state === "paused")

  return (
    <div className={cn(!expanded && "border-t border-border pt-4", className)}>
      {showSummary && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="surface-caption uppercase">Current plan</p>
            {expanded ? (
              <>
                <p className="surface-record-title mt-1">{expandedPlanName}</p>
                <p className="surface-metric mt-3">{expandedPrice}</p>
                <p className={`surface-body mt-2 font-medium ${tone}`}>{title}</p>
                <p className="surface-body mt-1">{detail}</p>
              </>
            ) : (
              <>
                <p className={`surface-body font-semibold ${tone}`}>{title}</p>
                <p className="surface-body mt-0.5">{detail}</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!expanded && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPlansOpen((open) => !open)} aria-expanded={plansOpen}>
                {plansOpen ? "Hide plans" : paid ? "Change plan" : "View plans"}
              </Button>
            )}
            {showManage && (
              <Button type="button" variant="outline" size={expanded ? "default" : "sm"} onClick={() => void manage()} disabled={busy}>Manage billing</Button>
            )}
          </div>
        </div>
      )}
      {showSummary && expanded && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-3">
            <div>
              <p className="surface-caption uppercase">Status date</p>
              <p className="surface-body mt-1 font-medium text-foreground">{expandedDateLabel}</p>
            </div>
            <div>
              <p className="surface-caption uppercase">Billing cycle</p>
              <p className="surface-body mt-1 font-medium text-foreground">{expandedCycle}</p>
            </div>
            <div>
              <p className="surface-caption uppercase">Team seats</p>
              <p className="surface-body mt-1 font-medium text-foreground">{seats === null ? "—" : `${seats} of ${staffLabel(seatLimit).replace(/^Up to /, "")}`}</p>
            </div>
          </div>
          {seats !== null && Number.isFinite(seatLimit) && (
            <div className="mt-5">
              <div className="surface-body flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">Team members in use</span>
                <span className="tabular-nums">{seats} of {seatLimit}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Team members in use" aria-valuemin={0} aria-valuemax={seatLimit} aria-valuenow={seats}>
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${seatPercent}%` }} />
              </div>
            </div>
          )}
        </>
      )}
      {showPlans && (plansOpen || expanded) && (
        <div className="mt-5">
          <PlanPricing companyId={companyId} billing={billing} seats={seats} />
        </div>
      )}
    </div>
  )
}
