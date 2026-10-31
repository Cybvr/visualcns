"use client"

import Link from "next/link"

import { OfferCard } from "@/components/offer-card"
import { useCart } from "@/components/dashboard/use-cart"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLocalCurrency } from "@/components/use-local-currency"
import { CART_SERVICES, type CartService } from "@/lib/cart"
import { formatPrice, growthPlanRows } from "@/lib/plans"

const GROUPS = ["Growth", "Development", "Maintenance"] as const
const FEATURED_ID = "growth-pro"
const FREE_GROWTH = growthPlanRows.find((row) => row.price === "free")

const TRIGGER = "h-9 shrink-0 flex-none rounded-full px-4 text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

/**
 * Everything VisualCNS sells, as cards that go in the cart: Growth plans (which
 * include Pass, Pulse and Ngai), development work and maintenance retainers.
 */
export function PricingView({ cartHref, freeHref }: { cartHref: string; freeHref: string }) {
  const { items, add, has } = useCart()
  const currency = useLocalCurrency()

  function card(service: CartService) {
    const inCart = has(service.id)
    const monthly = service.price.suffix === "/mo"
    return (
      <OfferCard
        key={service.id}
        eyebrow={service.group}
        badge={service.id === FEATURED_ID ? "Most popular" : undefined}
        featured={service.id === FEATURED_ID}
        title={service.name}
        icon={service.icon}
        price={formatPrice(service.price, currency)}
        timeline={monthly ? "Billed monthly" : service.timeline || "One-off"}
        description={service.scope}
        features={service.features ?? []}
        ctaLabel={inCart ? "View cart" : "Add to cart"}
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

      <Tabs defaultValue="Growth" className="gap-8">
        <TabsList aria-label="Pricing categories" className="h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-full border border-border bg-muted/70 p-1 [scrollbar-width:none]">
          {GROUPS.map((group) => <TabsTrigger key={group} value={group} className={TRIGGER}>{group}</TabsTrigger>)}
        </TabsList>

        {GROUPS.map((group) => (
          <TabsContent key={group} value={group}>
            <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${group === "Growth" ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>
              {group === "Growth" && FREE_GROWTH && (
                <OfferCard
                  eyebrow="Growth"
                  title={FREE_GROWTH.service}
                  icon={FREE_GROWTH.icon}
                  price="Free"
                  timeline="No card needed"
                  description={FREE_GROWTH.scope}
                  features={FREE_GROWTH.features}
                  ctaLabel="Start free"
                  ctaHref={freeHref}
                />
              )}
              {CART_SERVICES.filter((service) => service.group === group).map(card)}
            </div>
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
