"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { Plus, ShoppingCart, X } from "lucide-react"

import { useCart } from "@/components/dashboard/use-cart"
import { SectionHeader } from "@/components/dashboard/section-header"
import { ServiceArt } from "@/components/dashboard/service-art"
import { Button } from "@/components/ui/button"
import { CART_SERVICES, cartTotal } from "@/lib/cart"
import { formatPrice } from "@/lib/plans"

const RECOMMENDATION_COUNT = 3

/**
 * The cart: each service in it with its price and a remove button, a subtotal
 * card with the way to checkout, then a few services to add.
 */
export function CartView({ checkoutHref, servicesHref }: { checkoutHref: string; servicesHref: string }) {
  const { items, ids, add, remove, clear, replace } = useCart()
  const loaded = useRef(false)

  // The address carries the cart (?items=a,b), so a cart link opens the same cart.
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true
      const fromUrl = new URLSearchParams(window.location.search).get("items")
      if (fromUrl !== null) {
        replace(fromUrl.split(",").filter(Boolean))
        return
      }
    }
    const url = new URL(window.location.href)
    if (ids.length) url.searchParams.set("items", ids.join(","))
    else url.searchParams.delete("items")
    window.history.replaceState(window.history.state, "", url.toString().replace(/%2C/g, ","))
  }, [ids, replace])
  const total = cartTotal(items)
  // Others from the groups already in the cart first, then anything else.
  const groups = new Set(items.map((item) => item.group))
  const recommendations = CART_SERVICES
    .filter((service) => !ids.includes(service.id))
    .sort((a, b) => Number(groups.has(b.group)) - Number(groups.has(a.group)))
    .slice(0, RECOMMENDATION_COUNT)

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="min-w-0 space-y-10">
        <section aria-labelledby="cart-items-heading">
          <SectionHeader id="cart-items-heading" title={`Your cart${items.length ? ` (${items.length})` : ""}`}>
            {items.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={clear}>Empty cart</Button>}
          </SectionHeader>
          {items.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-muted/50 px-6 py-12 text-center">
              <ShoppingCart className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
              <div className="mt-3 text-sm text-foreground">Your cart is empty.</div>
              <Button asChild variant="outline" className="mt-4"><Link href={servicesHref}>Browse services</Link></Button>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-4 py-5">
                  <div className="min-w-0 flex-1">
                    <div className="surface-record-title">{item.name}</div>
                    <div className="surface-body mt-1">{item.scope}</div>
                    <div className="surface-caption mt-2">{item.group}{item.price.suffix === "/mo" ? " · Billed monthly" : " · One-off"}</div>
                  </div>
                  <div className="shrink-0 text-right text-base font-semibold text-foreground">{formatPrice(item.price, "NGN")}</div>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.name}`}
                    title="Remove"
                    className="-mt-1 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {recommendations.length > 0 && (
          <section aria-labelledby="cart-recommended-heading">
            <SectionHeader id="cart-recommended-heading" title="Recommended for you" href={servicesHref} linkLabel="See all services" />
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {recommendations.map((service, index) => (
                <div key={service.id} className="flex flex-col rounded-2xl border border-border bg-card p-2.5">
                  <ServiceArt service={service} index={index} />
                  <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
                    <div className="truncate text-sm font-semibold text-foreground">{service.name}</div>
                    <div className="surface-caption mt-0.5">{formatPrice(service.price, "NGN")}</div>
                    <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => add(service.id)}>
                      <Plus aria-hidden="true" />
                      Add to cart
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="overflow-hidden rounded-2xl bg-muted/50 lg:sticky lg:top-4">
        <div className="bg-neutral-900 px-5 py-4 text-base font-semibold text-white">Your subtotal</div>
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="surface-body">Subtotal</span>
            <span className="text-lg font-semibold text-foreground">{formatPrice({ amount: total }, "NGN")}</span>
          </div>
          <div className="border-t border-border" />
          {items.length > 0 ? (
            <Button asChild className="h-11 w-full"><Link href={checkoutHref}>Checkout</Link></Button>
          ) : (
            <Button type="button" className="h-11 w-full" disabled>Checkout</Button>
          )}
          <div className="text-center"><Link href={servicesHref} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">Keep shopping</Link></div>
        </div>
      </aside>
    </main>
  )
}
