"use client"

import Link from "next/link"
import { Check, Code2, Globe, Plus, TrendingUp, Workflow, Wrench, type LucideIcon } from "lucide-react"

import { useCart } from "@/components/dashboard/use-cart"
import { useLocalCurrency } from "@/components/use-local-currency"
import { SectionHeader } from "@/components/dashboard/section-header"
import { ServiceArt } from "@/components/dashboard/service-art"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CART_SERVICES, type CartService } from "@/lib/cart"
import { formatPrice } from "@/lib/plans"

/** Each group's icon, for the featured cards. */
const GROUP_ICON: Record<string, LucideIcon> = { Development: Code2, Platforms: Globe, Growth: TrendingUp, Workflows: Workflow, Maintenance: Wrench }

/** The two offers shown large at the top. */
const FEATURED_IDS = ["growth-visualhq-pro", "development-full-web-app"]

const GROUPS = [...new Set(CART_SERVICES.map((service) => service.group))]

/** A big white-to-lavender deal card with an icon tile, the pitch, the price and a dark button. */
function FeaturedCard({ service, price, cartHref, inCart, onSelect }: { service: CartService; price: string; cartHref: string; inCart: boolean; onSelect: () => void }) {
  const Icon = GROUP_ICON[service.group] ?? Code2
  return (
    <Link href={cartHref} onClick={onSelect} aria-label={inCart ? `View cart with ${service.name}` : `Add ${service.name} to cart and view cart`} className="relative flex min-h-56 flex-col overflow-hidden rounded-3xl border border-border bg-[linear-gradient(110deg,var(--card)_35%,rgba(196,181,253,0.55)_100%)] p-6 outline-none transition-colors hover:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-500 sm:p-8">
      <span className="grid size-12 -rotate-6 place-items-center rounded-2xl bg-violet-500 text-white shadow-[0_10px_24px_rgba(124,58,237,0.4)]" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <div className="mt-5 max-w-md text-lg leading-snug text-foreground">{service.scope}</div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
        <div>
          <div className="surface-caption">{service.name}</div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{price}</div>
        </div>
        <span className="inline-flex h-10 items-center gap-2 rounded-md bg-neutral-950 px-5 text-sm font-medium text-white">
          {inCart ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {inCart ? "View cart" : "Add to cart"}
        </span>
      </div>
    </Link>
  )
}

function ServiceCard({ service, price, index, cartHref, inCart, onSelect }: { service: CartService; price: string; index: number; cartHref: string; inCart: boolean; onSelect: () => void }) {
  const monthly = service.price.suffix === "/mo"
  return (
    <Link href={cartHref} onClick={onSelect} aria-label={inCart ? `View cart with ${service.name}` : `Add ${service.name} to cart and view cart`} className="flex flex-col rounded-3xl border border-border bg-card p-3 outline-none transition-colors hover:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-500">
      <div className="relative">
        <ServiceArt service={service} index={index} />
        {monthly && <span className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-2xl bg-card px-3 py-1.5 text-sm font-medium text-violet-700 dark:text-violet-300">Monthly</span>}
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <h3 className="surface-record-title">{service.name}</h3>
        <div className="surface-body mt-2 line-clamp-3">{service.scope}</div>
        <div className="mt-4 text-lg font-semibold text-foreground">{price}</div>
        <div className="mt-auto pt-4">
          <span className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input px-5 text-sm font-medium text-violet-700 dark:text-violet-300">
            {inCart ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
            {inCart ? "View cart" : "Add to cart"}
          </span>
        </div>
      </div>
    </Link>
  )
}

function ServiceGroup({ group, cartHref, price, has, add }: {
  group: string
  cartHref: string
  price: (service: CartService) => string
  has: (id: string) => boolean
  add: (id: string) => void
}) {
  return (
    <section aria-labelledby={`services-${group}`}>
      <SectionHeader id={`services-${group}`} title={group} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CART_SERVICES.filter((service) => service.group === group).map((service, index) => (
          <ServiceCard key={service.id} service={service} price={price(service)} index={index} cartHref={cartHref} inCart={has(service.id)} onSelect={() => add(service.id)} />
        ))}
      </div>
    </section>
  )
}

/** Every service on the rate card as deal cards that lead to the cart. */
export function ServicesView({ cartHref }: { cartHref: string }) {
  const { items, add, has } = useCart()
  const currency = useLocalCurrency()
  const price = (service: CartService) => formatPrice(service.price, currency)
  const featured = FEATURED_IDS.map((id) => CART_SERVICES.find((service) => service.id === id)).filter((service): service is CartService => Boolean(service))

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 pt-4 pb-12 sm:px-6">
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3">
          <span className="text-sm text-foreground">{items.length} in your cart</span>
          <Button asChild><Link href={cartHref}>View cart</Link></Button>
        </div>
      )}

      <Tabs defaultValue="all" className="gap-8">
        <TabsList aria-label="Service categories" className="h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-full border border-border bg-muted/70 p-1 [scrollbar-width:none]">
          <TabsTrigger value="all" className="h-9 shrink-0 flex-none rounded-full px-4 text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground focus-visible:ring-2 focus-visible:ring-ring">All services</TabsTrigger>
          {GROUPS.map((group) => (
            <TabsTrigger key={group} value={group} className="h-9 shrink-0 flex-none rounded-full px-4 text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{group}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-10">
          {featured.length > 0 && (
            <section className="grid gap-4 md:grid-cols-2" aria-label="Featured">
              {featured.map((service) => <FeaturedCard key={service.id} service={service} price={price(service)} cartHref={cartHref} inCart={has(service.id)} onSelect={() => add(service.id)} />)}
            </section>
          )}
          {GROUPS.map((group) => <ServiceGroup key={group} group={group} cartHref={cartHref} price={price} has={has} add={add} />)}
        </TabsContent>

        {GROUPS.map((group) => (
          <TabsContent key={group} value={group}>
            <ServiceGroup group={group} cartHref={cartHref} price={price} has={has} add={add} />
          </TabsContent>
        ))}
      </Tabs>
    </main>
  )
}
