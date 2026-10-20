"use client"

import { useState, type ReactNode } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { usePaymentReturn, usePlanBilling } from "@/components/company/company-plan"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { billingMoney, isPlanKey, PLAN_KEYS, PLANS, planAccess, planPrice, staffLabel, type PlanInterval, type PlanKey, type Subscription } from "@/lib/subscription"
import { useLocalCurrency } from "@/components/use-local-currency"
import { cn } from "@/lib/utils"

const POPULAR: PlanKey = "business"

/** What a plan adds on top of the one below it. The first feature is the staff line, shown separately. */
function planBullets(key: PlanKey) {
  const index = PLAN_KEYS.indexOf(key)
  const own = PLANS[key].features.slice(1)
  if (index === 0) return ["VisualCNS Pass", ...own]
  const below = new Set(PLANS[PLAN_KEYS[index - 1]].features.slice(1))
  return own.filter((feature) => !below.has(feature))
}

function Bullets({ items }: { items: string[] }) {
  return (
    <div className="mt-4">
      <ul className="surface-table-cell space-y-2.5 text-foreground">
        {items.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A free way in, shown as a button above the plans, e.g. "Continue with free". */
export type FreePlanCard = {
  label: string
  onSelect: () => void | Promise<void>
  busy?: boolean
}

/**
 * The VisualCNS plans as cards, monthly or yearly, each opening Paystack. Used
 * by the upgrade window and anywhere else a company picks a plan. `free` adds a
 * button above them; `onBeforeSubscribe` runs before Paystack opens.
 */
export function PlanPricing({ companyId, billing, seats = null, free, onBeforeSubscribe, header }: {
  companyId: string
  billing: Subscription | null | undefined
  seats?: number | null
  free?: FreePlanCard
  onBeforeSubscribe?: () => Promise<void>
  /** Shown beside the monthly/yearly switch. */
  header?: ReactNode
}) {
  const call = usePlanBilling(companyId)
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState<PlanKey | "">("")
  const [interval, setInterval] = useState<PlanInterval>("monthly")
  const currency = useLocalCurrency()
  const money = (amount: number) => billingMoney(amount, currency)
  usePaymentReturn(companyId)

  async function subscribe(plan: PlanKey) {
    setBusy(plan)
    try {
      await onBeforeSubscribe?.()
      const params = new URLSearchParams(searchParams?.toString())
      const returnTo = params.size ? `${pathname}?${params}` : pathname
      const { url } = await call("subscribe", { plan, interval, returnTo })
      if (url) window.location.assign(url)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
      setBusy("")
    }
  }

  const access = billing ? planAccess(billing) : null
  const cancelled = billing?.status === "cancelled"
  const current: PlanKey | null = access?.state === "active" && !cancelled && isPlanKey(billing?.plan) ? billing.plan : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {header ?? <span />}
        <div className="inline-flex shrink-0 rounded-lg bg-muted p-0.5 text-xs font-medium">
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
      </div>

      {free && (
        <Button type="button" variant="outline" className="h-10" disabled={busy !== "" || free.busy} onClick={() => void free.onSelect()}>
          {free.busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {free.label}
        </Button>
      )}

      <div className="grid gap-3 pt-2 md:grid-cols-3">
        {PLAN_KEYS.map((key, index) => {
          const option = PLANS[key]
          const isCurrent = current === key
          const lower = current !== null && PLAN_KEYS.indexOf(current) > index
          const tooSmall = seats !== null && seats > option.staff
          const popular = key === POPULAR
          const disabled = busy !== "" || Boolean(free?.busy) || isCurrent || lower || tooSmall
          return (
            <div key={key} className={cn("flex flex-col rounded-xl border p-5", popular ? "border-2 border-primary" : "border-border")}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="surface-record-title">{option.name}</h3>
                {popular && <Badge>Most popular</Badge>}
              </div>
              <div className="surface-body mt-0.5">{staffLabel(option.staff)}</div>
              <div className="surface-metric mt-4">
                {money(planPrice(key, interval, currency))}
                <span className="surface-body ml-1">/{interval === "yearly" ? "yr" : "mo"}</span>
              </div>
              <div className="surface-body mt-1">
                {interval === "yearly" ? "Billed yearly" : "Billed monthly"}
              </div>
              <Button
                type="button"
                variant={popular ? "default" : "outline"}
                className="mt-4 h-10 w-full text-sm"
                disabled={disabled}
                onClick={() => void subscribe(key)}
              >
                {busy === key && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isCurrent ? "Current plan" : tooSmall ? `You have ${seats} staff` : `Choose ${option.name}`}
              </Button>
              <Bullets items={[...(index === 0 ? [] : [`Everything in ${PLANS[PLAN_KEYS[index - 1]].name}`]), ...planBullets(key)]} />
            </div>
          )
        })}
      </div>

      <p className="surface-caption text-center">
        {currency === "USD" ? "Prices in US dollars. Tax may apply." : "Prices in Naira. VAT may apply."}
      </p>
    </div>
  )
}
