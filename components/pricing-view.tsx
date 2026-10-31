"use client"

import { useState } from "react"
import Link from "next/link"

import { OfferCard } from "@/components/offer-card"
import { PricingCompare } from "@/components/pricing-compare"
import { useCart } from "@/components/dashboard/use-cart"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLocalCurrency } from "@/components/use-local-currency"
import { LISTED_SERVICES, serviceFor, type BillingInterval, type CartService } from "@/lib/cart"
import { formatPrice, growthPlanRows } from "@/lib/plans"
import { cn } from "@/lib/utils"

const GROUPS = ["Growth", "Development", "Maintenance"] as const
const FEATURED_ID = "growth-pro"
const FREE_GROWTH = growthPlanRows.find((row) => row.price === "free")

const TRIGGER = "h-9 shrink-0 flex-none rounded-full px-4 text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

/**
 * Everything VisualCNS sells, as cards that go in the cart: Growth plans (which
 * include Pass, Pulse and Ngai), development work and maintenance retainers.
 */
export function PricingView({ cartHref, freeHref, stickyTop }: { cartHref: string; freeHref: string; /** Offset for the comparison table's sticky header. */ stickyTop?: string }) {
  const { items, add, has } = useCart()
  const currency = useLocalCurrency()
  const [tab, setTab] = useState<string>("Growth")
  const [interval, setInterval] = useState<BillingInterval>("monthly")

  function ctaFor(plan: string) {
    const listed = LISTED_SERVICES.find((service) => service.id === `growth-${plan.toLowerCase()}`)
    if (!listed) return { href: freeHref, label: "Get started" }
    const service = serviceFor(listed, interval)
    return { href: cartHref, onClick: () => add(service.id), label: has(service.id) ? "View cart" : "Get started" }
  }

  function card(listed: CartService) {
    const service = serviceFor(listed, interval)
    const inCart = has(service.id)
    const recurring = service.price.suffix === "/mo" || service.price.suffix === "/yr"
    return (
      <OfferCard
        key={listed.id}
        eyebrow={service.group}
        badge={listed.id === FEATURED_ID ? "Most popular" : undefined}
        featured={listed.id === FEATURED_ID}
        title={service.name}
        icon={service.icon}
        price={formatPrice(service.price, currency)}
        timeline={recurring ? undefined : service.timeline || "One-off"}
        description={service.scope}
        features={service.features ?? []}
        ctaLabel={inCart ? "View cart" : "Get started"}
        ctaHref={cartHref}
        onCtaClick={() => add(service.id)}
      />
    )
  }

  return (
    <div className="space-y-8">
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3">
          <span className="text-sm text-foreground">{items.length} in your cart</span>
          <Button asChild><Link href={cartHref}>View cart</Link></Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList aria-label="Pricing categories" className="h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-full border border-border bg-muted/70 p-1 [scrollbar-width:none]">
            {GROUPS.map((group) => <TabsTrigger key={group} value={group} className={TRIGGER}>{group}</TabsTrigger>)}
          </TabsList>
          {tab !== "Development" && (
            <div className="inline-flex rounded-full border border-border bg-muted p-[3px]" role="group" aria-label="Billing">
              {(["monthly", "yearly"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={interval === option}
                  onClick={() => setInterval(option)}
                  className={cn("rounded-full px-[14px] py-[6px] text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring", interval === option ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {option === "monthly" ? "Monthly" : "Yearly · 2 months free"}
                </button>
              ))}
            </div>
          )}
        </div>

        {GROUPS.map((group) => (
          <TabsContent key={group} value={group}>
            <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${group === "Growth" ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>
              {group === "Growth" && FREE_GROWTH && (
                <OfferCard
                  eyebrow="Growth"
                  title={FREE_GROWTH.service}
                  icon={FREE_GROWTH.icon}
                  price="Free"
                  description={FREE_GROWTH.scope}
                  features={FREE_GROWTH.features}
                  ctaLabel="Get started"
                  ctaHref={freeHref}
                />
              )}
              {LISTED_SERVICES.filter((service) => service.group === group).map(card)}
            </div>
            {group === "Growth" && <div className="mt-16"><PricingCompare ctaFor={ctaFor} stickyTop={stickyTop} /></div>}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-lg font-semibold">Need something custom?</p>
          <p className="text-sm text-muted-foreground">Tell us what you need and we&apos;ll send a fixed quote.</p>
        </div>
        <Button asChild><Link href="/contact">Book a call</Link></Button>
      </div>
    </div>
  )
}
