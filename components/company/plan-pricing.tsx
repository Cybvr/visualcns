"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useOptionalCompanyPage } from "@/components/company/company-page-context"
import { useCart } from "@/components/dashboard/use-cart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLocalCurrency } from "@/components/use-local-currency"
import { GROWTH_APP_PLAN, GROWTH_TIERS } from "@/lib/cart"
import { formatPrice } from "@/lib/plans"
import { PLANS, planAccess, type Subscription } from "@/lib/subscription"
import { cn } from "@/lib/utils"

const POPULAR = "growth-pro"

/** The Growth plan a company is on now, if it bought one and it hasn't run out. */
export function activeGrowthTier(billing: Subscription | null | undefined) {
  const access = billing ? planAccess(billing) : null
  if (!access || (access.state !== "active" && access.state !== "grace")) return null
  return GROWTH_TIERS.find((tier) => tier.id === billing?.growthTier) ?? null
}

/** A free way in, shown as a button above the plans, e.g. "Continue with free". */
export type FreePlanCard = {
  label: string
  onSelect: () => void | Promise<void>
  busy?: boolean
}

/**
 * The Growth plans (which include Pass, Pulse and Ngai) as cards that go in the
 * company's cart. `free` adds a button above them; `onBeforeSubscribe` runs
 * before going to the cart.
 */
export function PlanPricing({ billing, seats = null, free, onBeforeSubscribe, header }: {
  companyId?: string
  billing: Subscription | null | undefined
  seats?: number | null
  free?: FreePlanCard
  onBeforeSubscribe?: () => Promise<void>
  /** Shown above the plans. */
  header?: ReactNode
}) {
  const page = useOptionalCompanyPage()
  const router = useRouter()
  const { add, has } = useCart()
  const currency = useLocalCurrency()
  const [busy, setBusy] = useState("")
  const cartHref = page ? `/${encodeURIComponent(page.company.slug || page.company.id)}/cart` : "/cart"
  const current = activeGrowthTier(billing)

  async function choose(id: string) {
    setBusy(id)
    try {
      await onBeforeSubscribe?.()
      add(id)
      router.push(cartHref)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
      setBusy("")
    }
  }

  return (
    <div className="space-y-3">
      {header}

      {free && (
        <Button type="button" variant="outline" className="h-10" disabled={busy !== "" || free.busy} onClick={() => void free.onSelect()}>
          {free.busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {free.label}
        </Button>
      )}

      <div className="grid gap-3 pt-2 md:grid-cols-3">
        {GROWTH_TIERS.map((tier) => {
          const staff = PLANS[GROWTH_APP_PLAN[tier.id] ?? "business"].staff
          const isCurrent = current?.id === tier.id
          const tooSmall = seats !== null && seats > staff
          const popular = tier.id === POPULAR
          const inCart = has(tier.id)
          return (
            <div key={tier.id} className={cn("flex flex-col rounded-xl border p-5", popular ? "border-2 border-primary" : "border-border", isCurrent && "bg-primary/5")}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="surface-record-title">{tier.name}</h3>
                {isCurrent ? <Badge variant="secondary">Current</Badge> : popular && <Badge>Most popular</Badge>}
              </div>
              <div className="surface-body mt-0.5">{tier.scope}</div>
              <div className="surface-metric mt-4">{formatPrice(tier.price, currency)}</div>
              <div className="surface-body mt-1">Billed monthly</div>
              <Button
                type="button"
                variant={popular ? "default" : "outline"}
                className="mt-4 h-10 w-full text-sm"
                disabled={busy !== "" || Boolean(free?.busy) || tooSmall}
                onClick={() => void choose(tier.id)}
              >
                {busy === tier.id && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {tooSmall ? `You have ${seats} staff` : isCurrent ? "Renew" : inCart ? "View cart" : `Choose ${tier.name}`}
              </Button>
              <ul className="surface-table-cell mt-4 space-y-2.5 text-foreground">
                {(tier.features ?? []).map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="surface-caption text-center">
        {currency === "USD" ? "Prices in US dollars. Tax may apply." : "Prices in Naira. VAT may apply."} Each plan runs for a month from payment.
      </p>
    </div>
  )
}
