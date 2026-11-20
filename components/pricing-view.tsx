"use client"

import { useEffect, useState, type MouseEvent } from "react"
import { toast } from "sonner"
import Link from "next/link"

import { OfferCard } from "@/components/offer-card"
import { PricingCompare } from "@/components/pricing-compare"
import { useCart } from "@/components/dashboard/use-cart"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLocalCurrency } from "@/components/use-local-currency"
import { usePolarCheckout } from "@/components/use-polar-checkout"
import { usePaystackCheckout } from "@/components/use-paystack-checkout"
import { LISTED_SERVICES, PRICING_TABS, serviceFor, type BillingInterval, type CartService } from "@/lib/cart"
import { formatPrice } from "@/lib/plans"
import { TRIAL_DAYS } from "@/lib/subscription"
import { cn } from "@/lib/utils"

const GROUPS = Object.values(PRICING_TABS)
const TAB_SLUG: Record<string, string> = Object.fromEntries(Object.entries(PRICING_TABS).map(([slug, group]) => [group, slug]))
/** The "Most popular" plan in each tab. */
const FEATURED_IDS = new Set(["growth-max", "marketing-pro"])
/** Features per card on the home page; the rest are behind "+N more". */
const HOME_FEATURES = 5

/** One line under each tab that explains it. */
const TAB_INTROS: Record<string, string> = {
  Marketing: "AI runs your marketing for you: it writes and schedules your posts, works your SEO, replies to reviews and builds your ads.",
  Growth: "Let our team run your marketing for you. Every plan includes Marketing Advanced.",
}

const TRIGGER = "h-9 shrink-0 flex-none rounded-full px-4 text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

/**
 * Everything VisualCNS sells, as cards that go in the cart: Growth plans (which
 * include Pass, Pulse and Ngai), development work and G&D (Growth and Development) Support.
 */
export function PricingView({ cartHref, freeHref, stickyTop, basePath, initialTab, showCompare = true, compact = false, only }: {
  cartHref: string
  freeHref: string
  /** Offset for the comparison table's sticky header. */
  stickyTop?: string
  /** The pricing page's address; switching tabs moves to basePath/<tab>. Leave out where the address should stay put, as on the home page. */
  basePath?: string
  /** The tab's slug from the address, e.g. "development". */
  initialTab?: string
  /** The full "Compare plans" table under the Growth plans; off where only the plan cards fit, as on the home page. */
  showCompare?: boolean
  /** Home page version: no cart bar or custom quote box, and the cards swipe sideways on phones. */
  compact?: boolean
  /** Show just this tab, with no tab list, e.g. "Marketing" on the Marketing Suite page. */
  only?: string
}) {
  const { items, add, has } = useCart()
  const currency = useLocalCurrency()
  const [tab, setTab] = useState<string>(only ?? PRICING_TABS[initialTab ?? ""] ?? "Marketing")
  const groups = only ? [only] : GROUPS

  function changeTab(next: string) {
    setTab(next)
    const slug = TAB_SLUG[next]
    if (slug && basePath) window.history.replaceState(window.history.state, "", `${basePath}/${slug}${window.location.search}`)
  }
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  const polar = usePolarCheckout()
  // Naira Growth plans go straight to Paystack for signed-in buyers; everything else uses the cart.
  const paystack = usePaystackCheckout(cartHref.replace(/\/cart$/, "/checkout"))
  // Dollar buyers go straight to Polar for the one item; Naira buyers use the cart.
  const dollars = currency === "USD"

  // Back from Polar: say it worked and tidy the address.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get("paid") !== "polar") return
    toast.success("Payment received. Your plan will be on in a moment.")
    url.searchParams.delete("paid")
    url.searchParams.delete("checkout_id")
    window.history.replaceState(window.history.state, "", url.toString())
  }, [])

  function buy(serviceId: string) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      if (dollars) {
        event.preventDefault()
        if (!polar.opening) void polar.open(serviceId)
        return
      }
      if (serviceId.startsWith("growth-") || serviceId.startsWith("marketing-")) {
        event.preventDefault()
        if (paystack.opening) return
        void paystack.open(serviceId).then((opened) => {
          if (opened) return
          add(serviceId)
          window.location.assign(cartHref)
        })
        return
      }
      add(serviceId)
    }
  }

  function label(serviceId: string) {
    if (dollars) return polar.opening === serviceId ? "Opening checkout…" : "Get started"
    if (paystack.opening === serviceId) return "Opening checkout…"
    return has(serviceId) ? "View cart" : "Get started"
  }

  function ctaFor(plan: string) {
    const listed = LISTED_SERVICES.find((service) => service.id === `growth-${plan.toLowerCase()}`)
    if (!listed) return { href: freeHref, label: "Get started" }
    const service = serviceFor(listed, interval)
    return { href: cartHref, onClick: buy(service.id), label: label(service.id) }
  }

  function card(listed: CartService) {
    const service = serviceFor(listed, interval)
    const recurring = service.price.suffix === "/mo" || service.price.suffix === "/yr"
    return (
      <OfferCard
        key={listed.id}
        badge={FEATURED_IDS.has(listed.id) ? "Most popular" : undefined}
        featured={FEATURED_IDS.has(listed.id)}
        title={service.name}
        icon={service.icon}
        price={formatPrice(service.price, currency)}
        description={service.description ?? service.scope}
        features={listed.group === "Growth" ? ["Includes Marketing Advanced", ...(service.features ?? [])] : recurring || !service.timeline ? service.features ?? [] : [...(service.features ?? []), `Delivery: ${service.timeline}`]}
        ctaLabel={label(service.id)}
        ctaHref={cartHref}
        onCtaClick={buy(service.id)}
        maxFeatures={compact ? HOME_FEATURES : undefined}
        moreHref={compact ? "/pricing" : undefined}
      />
    )
  }

  return (
    <div className="space-y-8">
      {!compact && items.length > 0 && !dollars && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3">
          <span className="text-sm text-foreground">{items.length} in your cart</span>
          <Button asChild><Link href={cartHref}>View cart</Link></Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={changeTab} className="gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {!only && (
            <TabsList aria-label="Pricing categories" className="h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-full border border-border bg-muted/70 p-1 [scrollbar-width:none]">
              {GROUPS.map((group) => <TabsTrigger key={group} value={group} className={TRIGGER}>{group}</TabsTrigger>)}
            </TabsList>
          )}
          {!compact && tab !== "Development" && (
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

        {groups.map((group) => (
          <TabsContent key={group} value={group}>
            {TAB_INTROS[group] && <p className="max-w-2xl text-base text-muted-foreground">{TAB_INTROS[group]}</p>}
            <div
              className={cn(
                "grid grid-cols-1 gap-6 pt-3 md:grid-cols-2",
                group === "Marketing" ? "xl:grid-cols-4" : "lg:grid-cols-3",
                compact && "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:grid md:gap-6 md:overflow-visible md:px-0 md:pb-0 [&>*]:h-auto [&>*]:w-[85%] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto",
              )}
            >
              {group === "Marketing" && (
                <OfferCard
                  title="Free trial"
                  icon="pulse"
                  price="Free"
                  description={`${TRIAL_DAYS} days of every Marketing feature. No card needed.`}
                  features={["Social Media and SEO", "Reviews in one place", "Google Ads tracking", "Marketing insights and score", "Pass for up to 5 staff"]}
                  ctaLabel="Start free trial"
                  ctaHref={freeHref}
                  maxFeatures={compact ? HOME_FEATURES : undefined}
                  moreHref={compact ? "/pricing" : undefined}
                />
              )}
              {LISTED_SERVICES.filter((service) => service.group === group).map(card)}
            </div>
            {group === "Growth" && showCompare && <div className="mt-16"><PricingCompare ctaFor={ctaFor} stickyTop={stickyTop} /></div>}
          </TabsContent>
        ))}
      </Tabs>

      {!compact && !only && (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-lg font-semibold">Need something custom?</p>
          <p className="text-sm text-muted-foreground">Tell us what you need and we&apos;ll send a fixed quote.</p>
        </div>
        <Button asChild><Link href="/contact">Talk to us</Link></Button>
      </div>
      )}
    </div>
  )
}
