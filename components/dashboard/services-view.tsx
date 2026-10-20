"use client"

import Link from "next/link"
import { Check, Code2, Globe, Plus, TrendingUp, Workflow, Wrench, type LucideIcon } from "lucide-react"

import { useCart } from "@/components/dashboard/use-cart"
import { SectionHeader } from "@/components/dashboard/section-header"
import { ServiceArt } from "@/components/dashboard/service-art"
import { useLocalCurrency } from "@/components/use-local-currency"
import { Button } from "@/components/ui/button"
import { CART_SERVICES, type CartService } from "@/lib/cart"
import { formatPrice } from "@/lib/plans"
import { cn } from "@/lib/utils"

/** Each group's icon, for the featured cards. */
const GROUP_ICON: Record<string, LucideIcon> = { Development: Code2, Platforms: Globe, Growth: TrendingUp, Workflows: Workflow, Maintenance: Wrench }

/** The two offers shown large at the top. */
const FEATURED_IDS = ["growth-visualhq-pro", "development-full-web-app"]

const GROUPS = [...new Set(CART_SERVICES.map((service) => service.group))]

function CartToggle({ service, variant }: { service: CartService; variant: "dark" | "outline" }) {
  const { has, add, remove } = useCart()
  const inCart = has(service.id)
  return (
    <Button
      type="button"
      variant={variant === "dark" ? "default" : "outline"}
      className={cn(
        "h-10 px-5",
        variant === "dark" && "bg-neutral-950 text-white hover:bg-neutral-800",
        variant === "outline" && "w-full text-violet-700 dark:text-violet-300",
      )}
      onClick={() => (inCart ? remove(service.id) : add(service.id))}
      aria-label={inCart ? `Remove ${service.name} from cart` : `Add ${service.name} to cart`}
    >
      {inCart ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
      {inCart ? "In cart" : "Add to cart"}
    </Button>
  )
}

/** A big white-to-lavender deal card with an icon tile, the pitch, the price and a dark button. */
function FeaturedCard({ service, price }: { service: CartService; price: string }) {
  const Icon = GROUP_ICON[service.group] ?? Code2
  return (
    <div className="relative flex min-h-56 flex-col overflow-hidden rounded-3xl border border-border bg-[linear-gradient(110deg,var(--card)_35%,rgba(196,181,253,0.55)_100%)] p-6 sm:p-8">
      <span className="grid size-12 -rotate-6 place-items-center rounded-2xl bg-violet-500 text-white shadow-[0_10px_24px_rgba(124,58,237,0.4)]" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <div className="mt-5 max-w-md text-lg leading-snug text-foreground">{service.scope}</div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
        <div>
          <div className="surface-caption">{service.name}</div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{price}</div>
        </div>
        <CartToggle service={service} variant="dark" />
      </div>
    </div>
  )
}

function ServiceCard({ service, price, index }: { service: CartService; price: string; index: number }) {
  const monthly = service.price.suffix === "/mo"
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-card p-3">
      <div className="relative">
        <ServiceArt service={service} index={index} />
        {monthly && <span className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-2xl bg-card px-3 py-1.5 text-sm font-medium text-violet-700 dark:text-violet-300">Monthly</span>}
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <h3 className="surface-record-title">{service.name}</h3>
        <div className="surface-body mt-2 line-clamp-3">{service.scope}</div>
        <div className="mt-4 text-lg font-semibold text-foreground">{price}</div>
        <div className="mt-auto pt-4">
          <CartToggle service={service} variant="outline" />
        </div>
      </div>
    </div>
  )
}

/** Every service on the rate card as deal cards, added to the cart from here. */
export function ServicesView({ checkoutHref }: { checkoutHref: string }) {
  const currency = useLocalCurrency()
  const { items } = useCart()
  const price = (service: CartService) => formatPrice(service.price, currency)
  const featured = FEATURED_IDS.map((id) => CART_SERVICES.find((service) => service.id === id)).filter((service): service is CartService => Boolean(service))

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 pt-4 pb-12 sm:px-6">
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3">
          <span className="text-sm text-foreground">{items.length} in your cart</span>
          <Button asChild><Link href={checkoutHref}>Checkout</Link></Button>
        </div>
      )}

      {featured.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2" aria-label="Featured">
          {featured.map((service) => <FeaturedCard key={service.id} service={service} price={price(service)} />)}
        </section>
      )}

      {GROUPS.map((group) => (
        <section key={group} aria-labelledby={`services-${group}`}>
          <SectionHeader id={`services-${group}`} title={group} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CART_SERVICES.filter((service) => service.group === group).map((service, index) => <ServiceCard key={service.id} service={service} price={price(service)} index={index} />)}
          </div>
        </section>
      ))}
    </main>
  )
}
