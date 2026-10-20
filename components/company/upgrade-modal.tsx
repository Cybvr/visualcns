"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { usePlanBilling } from "@/components/company/company-plan"
import { PlanPricing } from "@/components/company/plan-pricing"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  daysLeft,
  GRACE_DAYS,
  isPlanInterval,
  isPlanKey,
  PLANS,
  planAccess,
  TRIAL_DAYS,
  type PlanInterval,
  type PlanKey,
  type Subscription,
} from "@/lib/subscription"

function shortDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

/** Pick a plan: the plan cards, with the current plan and trial state above them. */
export function UpgradeModal({ open, onOpenChange, companyId, companyName, billing, seats = null }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
  billing: Subscription | null | undefined
  seats?: number | null
}) {
  const call = usePlanBilling(companyId)
  const [managing, setManaging] = useState(false)

  async function manage() {
    setManaging(true)
    try {
      const { url } = await call("manage", {})
      if (url) window.location.assign(url)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
      setManaging(false)
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
    detail = "Choose a plan to switch Pass and Reports back on. Your records are kept."
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl gap-3 overflow-y-auto p-4 sm:p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg">Upgrade {companyName}</DialogTitle>
          <DialogDescription className="sr-only">Pick a plan. Change or cancel any time.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-blue-50 px-3 py-2 text-xs dark:bg-blue-950/30">
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">{badge}</span>
          <span className="font-semibold text-foreground">{headline}</span>
          <span className="text-muted-foreground">{detail}</span>
          {subscribed && (
            <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => void manage()} disabled={managing}>
              {managing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Manage billing
            </Button>
          )}
        </div>

        <PlanPricing companyId={companyId} billing={billing} seats={seats} />
      </DialogContent>
    </Dialog>
  )
}
