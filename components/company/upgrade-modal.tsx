"use client"

import { useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { usePaymentReturn, usePlanBilling } from "@/components/company/company-plan"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  daysLeft,
  GRACE_DAYS,
  isPlanInterval,
  isPlanKey,
  naira,
  PLAN_KEYS,
  PLANS,
  planAccess,
  planPrice,
  staffLabel,
  TRIAL_DAYS,
  type PlanInterval,
  type PlanKey,
  type Subscription,
} from "@/lib/subscription"
import { cn } from "@/lib/utils"

const POPULAR: PlanKey = "business"

function shortDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

/** What a plan adds on top of the one below it. The first feature is the staff line, shown separately. */
function planBullets(key: PlanKey) {
  const index = PLAN_KEYS.indexOf(key)
  const own = PLANS[key].features.slice(1)
  if (index === 0) return ["VisualCNS Pass", ...own]
  const below = new Set(PLANS[PLAN_KEYS[index - 1]].features.slice(1))
  return own.filter((feature) => !below.has(feature))
}

/** Pick a plan: three cards, monthly or yearly, with the current plan and trial state above them. */
export function UpgradeModal({ open, onOpenChange, companyId, companyName, billing, seats = null }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  billing: Subscription | null | undefined
  seats?: number | null
}) {
  const call = usePlanBilling(companyId)
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState<PlanKey | "manage" | "">("")
  const [interval, setInterval] = useState<PlanInterval>("monthly")
  usePaymentReturn(companyId)

  async function openPaystack(action: "subscribe" | "manage", plan?: PlanKey) {
    setBusy(plan ?? "manage")
    try {
      const params = new URLSearchParams(searchParams?.toString())
      const returnTo = params.size ? `${pathname}?${params}` : pathname
      const { url } = await call(action, plan ? { plan, interval, returnTo } : {})
      if (url) window.location.assign(url)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
      setBusy("")
    }
  }

  const access = billing ? planAccess(billing) : null
  const subscribed = Boolean(billing?.subscriptionCode)
  const cancelled = billing?.status === "cancelled"
  const current: PlanKey | null = access?.state === "active" && !cancelled && isPlanKey(billing?.plan) ? billing.plan : null
  const paidInterval: PlanInterval = isPlanInterval(billing?.interval) ? billing.interval : "monthly"

  let badge = "Free trial"
  let headline = `${TRIAL_DAYS} days free`
  let detail = "No card needed."
  if (access?.state === "trial") {
    const left = daysLeft(access.endsAt)
    headline = `${left} ${left === 1 ? "day" : "days"} left`
    detail = `Choose a plan to keep going after ${shortDate(access.endsAt)}.`
  } else if (access?.state === "active") {
    badge = cancelled ? "Cancelled" : "Active"
    headline = cancelled ? `Works until ${shortDate(access.endsAt)}` : `${PLANS[current ?? "starter"].name} · ${paidInterval === "yearly" ? "yearly" : "monthly"}`
    detail = cancelled ? "Choose a plan to keep it going." : `Next payment ${shortDate(billing?.nextPaymentAt?.toMillis?.() ?? access.endsAt)}.`
  } else if (access?.state === "grace") {
    const left = daysLeft(access.endsAt)
    badge = billing?.status === "past_due" ? "Payment failed" : "Ended"
    headline = `${left} ${left === 1 ? "day" : "days"} left`
    detail = `Everything stops after the ${GRACE_DAYS}-day grace. Update your card or choose a plan.`
  } else if (access?.state === "paused") {
    badge = "Paused"
    headline = "Switched off"
    detail = "Choose a plan to switch Pass and Pulse back on. Your records are kept."
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl gap-3 overflow-y-auto p-4 sm:p-5">
        <DialogHeader className="gap-4 text-left sm:flex-row sm:items-start sm:justify-between">
          <div>
            <DialogTitle className="text-lg">Upgrade {companyName}</DialogTitle>
            <DialogDescription className="sr-only">Pick a plan. Change or cancel any time.</DialogDescription>
          </div>
          <div className="mr-8 inline-flex shrink-0 self-start rounded-lg bg-muted p-0.5 text-[11px] font-medium">
            {(["monthly", "yearly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setInterval(option)}
                aria-pressed={interval === option}
                className={cn("rounded-md px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring", interval === option ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
              >
                {option === "monthly" ? "Monthly" : <>Yearly <span className="ml-1 font-semibold text-emerald-600">2 months free</span></>}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-blue-50 px-3 py-2 text-xs dark:bg-blue-950/30">
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">{badge}</span>
          <span className="font-semibold text-foreground">{headline}</span>
          <span className="text-muted-foreground">{detail}</span>
          {subscribed && (
            <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => void openPaystack("manage")} disabled={busy !== ""}>
              {busy === "manage" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Manage billing
            </Button>
          )}
        </div>

        <div className="grid gap-3 pt-2 md:grid-cols-3">
          {PLAN_KEYS.map((key, index) => {
            const option = PLANS[key]
            const isCurrent = current === key
            const lower = current !== null && PLAN_KEYS.indexOf(current) > index
            const tooSmall = seats !== null && seats > option.staff
            const popular = key === POPULAR
            const disabled = busy !== "" || isCurrent || lower || tooSmall
            return (
              <div key={key} className={cn("relative flex flex-col rounded-xl border p-4", popular ? "border-2 border-blue-600" : "border-border")}>
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Most popular</span>
                )}
                <h3 className="text-base font-semibold text-foreground">{option.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{staffLabel(option.staff)}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  {naira(planPrice(key, interval))}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">/{interval === "yearly" ? "yr" : "mo"}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{interval === "yearly" ? "Billed yearly" : "Billed monthly"}</p>
                <Button
                  type="button"
                  variant={popular ? "default" : "outline"}
                  className={cn("mt-3 h-8 w-full text-xs", popular && "bg-blue-600 text-white hover:bg-blue-600/90")}
                  disabled={disabled}
                  onClick={() => void openPaystack("subscribe", key)}
                >
                  {busy === key && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {isCurrent ? "Current plan" : tooSmall ? `You have ${seats} staff` : `Choose ${option.name}`}
                </Button>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {index === 0 ? "Includes" : `Everything in ${PLANS[PLAN_KEYS[index - 1]].name}, plus`}
                  </p>
                  <ul className="mt-2.5 space-y-2 text-xs text-foreground">
                    {planBullets(key).map((feature) => (
                      <li key={feature} className="flex gap-2.5">
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
                          <Check className="size-2.5" aria-hidden="true" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">Prices in Naira. VAT may apply.</p>
      </DialogContent>
    </Dialog>
  )
}
