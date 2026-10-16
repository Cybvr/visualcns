"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { currentPlan, daysLeft, GRACE_DAYS, isPlanInterval, isPlanKey, naira, PLAN_KEYS, PLANS, planAccess, planPrice, staffLabel, TRIAL_DAYS, type PlanInterval, type PlanKey, type Subscription } from "@/lib/subscription"
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
 * The company's VisualCNS plan: trial, paid or paused, with the three tiers
 * monthly or yearly. Also confirms a payment when Paystack sends the payer back.
 */
export function CompanyPlan({ companyId, billing, seats = null, className, expanded = false, showSummary = true, showPlans = true }: { companyId: string; billing: Subscription | null | undefined; seats?: number | null; className?: string; /** Shows the plans straight away with no toggle, for use inside a modal. */ expanded?: boolean; /** Hides the current-plan summary when the plan picker is displayed separately. */ showSummary?: boolean; /** Hides the plan picker when only the current-plan summary is needed. */ showPlans?: boolean }) {
  const call = usePlanBilling(companyId)
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [plansOpen, setPlansOpen] = useState(false)
  const [interval, setInterval] = useState<PlanInterval>("monthly")

  usePaymentReturn(companyId, setBusy)

  async function openPaystack(action: "subscribe" | "manage", plan?: PlanKey) {
    setBusy(true)
    try {
      const params = new URLSearchParams(searchParams?.toString())
      const returnTo = params.size ? `${pathname}?${params}` : pathname
      const { url } = await call(action, plan ? { plan, interval, returnTo } : {})
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
  const planLabel = plan ? `${PLANS[plan].name} · ${naira(planPrice(plan, paidInterval))} a ${paidInterval === "yearly" ? "year" : "month"}` : ""

  let title = `${TRIAL_DAYS}-day free trial`
  let detail = "No card needed."
  let tone = "text-muted-foreground"
  if (access?.state === "trial") {
    const left = daysLeft(access.endsAt)
    title = `Free trial · ${left} ${left === 1 ? "day" : "days"} left`
    detail = `Choose a plan to keep going after ${shortDate(access.endsAt)}.`
  } else if (access?.state === "active") {
    title = cancelled ? `Cancelled · works until ${shortDate(access.endsAt)}` : `Paid · ${planLabel}`
    detail = cancelled ? "Choose a plan to keep it going." : `Next payment ${shortDate(billing?.nextPaymentAt?.toMillis?.() ?? access.endsAt)}.`
    tone = cancelled ? "text-amber-600" : "text-emerald-600"
  } else if (access?.state === "grace") {
    const left = daysLeft(access.endsAt)
    title = billing?.status === "past_due" ? "Payment didn't go through" : "Subscription ended"
    detail = `Everything stops in ${left} ${left === 1 ? "day" : "days"} (${GRACE_DAYS}-day grace). Update your card or choose a plan.`
    tone = "text-amber-600"
  } else if (access?.state === "paused") {
    title = "Paused"
    detail = "Choose a plan to switch Pass and Reports back on. Your records are kept."
    tone = "text-destructive"
  }

  const choosePlan = !access || access.state === "trial" || access.state === "paused" || cancelled || (access.state === "grace" && !subscribed)
  const upgrades = plan ? PLAN_KEYS.slice(PLAN_KEYS.indexOf(plan) + 1) : []
  const plansToShow: PlanKey[] = expanded ? PLAN_KEYS : choosePlan ? PLAN_KEYS : access?.state === "active" ? upgrades : []
  const currentPaidPlan = access && (access.state === "active" || access.state === "grace") ? plan : null
  const appliedPlan = currentPlan(billing)
  const paidPlan = currentPaidPlan ? PLANS[appliedPlan] : null
  const expandedPlanName = access?.state === "trial" ? "Free trial" : paidPlan?.name ?? "No active plan"
  const expandedPrice = paidPlan ? naira(planPrice(appliedPlan, paidInterval)) : "Free"
  const expandedCycle = paidPlan ? (paidInterval === "yearly" ? "Yearly" : "Monthly") : "Trial"
  const expandedDateLabel = access?.state === "trial" ? `Ends ${shortDate(access.endsAt)}` : paidPlan ? `Next charge ${shortDate(billing?.nextPaymentAt?.toMillis?.() ?? access?.endsAt ?? Date.now())}` : "Choose a plan to continue"
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
                <p className="surface-metric mt-3">{expandedPrice}{paidPlan && <span className="surface-body ml-1 font-normal">/ {paidInterval === "yearly" ? "year" : "month"}</span>}</p>
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
            {plansToShow.length > 0 && !expanded && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPlansOpen((open) => !open)} aria-expanded={plansOpen}>
                {plansOpen ? "Hide plans" : choosePlan ? "View plans" : "Upgrade plan"}
              </Button>
            )}
            {showManage && (
              <Button type="button" variant="outline" size={expanded ? "default" : "sm"} onClick={() => void openPaystack("manage")} disabled={busy}>Manage billing</Button>
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
      {showPlans && (plansOpen || expanded) && plansToShow.length > 0 && (
        <div className="mt-5 space-y-3">
          {expanded && showSummary && (
            <div>
              <h3 className="surface-body font-semibold text-foreground">Plans</h3>
              <p className="surface-body mt-1">Upgrade or downgrade any time. Changes take effect on your next charge.</p>
            </div>
          )}
          <Tabs value={interval} onValueChange={(value) => setInterval(value as typeof interval)}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly · 2 months free</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-2 sm:grid-cols-3">
            {plansToShow.map((key) => {
              const option = PLANS[key]
              const tooSmall = seats !== null && seats > option.staff
              const isCurrentPlan = expanded && currentPaidPlan === key
              return (
                <div key={key} className={cn("flex h-full flex-col gap-2 rounded-xl border p-3", isCurrentPlan ? "border-primary bg-primary/5" : "border-border", tooSmall && "opacity-50")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="surface-body font-semibold text-foreground">{option.name}</span>
                    {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
                  </div>
                  <span className="surface-body font-medium text-foreground">{naira(planPrice(key, interval))}<span className="font-normal text-muted-foreground">/{interval === "yearly" ? "yr" : "mo"}</span></span>
                  <span className="surface-body">{tooSmall ? `You have ${seats} staff` : `VisualCNS Pass for ${staffLabel(option.staff).toLowerCase()}`}</span>
                  <ul className="surface-body space-y-1">
                    {option.features.slice(1).map((feature) => (
                      <li key={feature} className="flex gap-1.5"><Check className="mt-0.5 size-3 shrink-0" aria-hidden="true" />{feature}</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant={isCurrentPlan ? "secondary" : "outline"}
                    className="mt-auto w-full"
                    onClick={() => void openPaystack("subscribe", key)}
                    disabled={busy || tooSmall || isCurrentPlan}
                  >
                    {busy && !isCurrentPlan && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    {isCurrentPlan ? "Your plan" : currentPaidPlan && PLAN_KEYS.indexOf(key) < PLAN_KEYS.indexOf(currentPaidPlan) ? "Downgrade" : currentPaidPlan ? "Upgrade" : "Choose plan"}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
