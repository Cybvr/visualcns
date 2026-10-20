"use client"

import Link from "next/link"
import { useState } from "react"
import { ShoppingCart, X } from "lucide-react"

import { useCart } from "@/components/dashboard/use-cart"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cartTotal } from "@/lib/cart"
import { formatPrice } from "@/lib/plans"

/** The cart in the dashboard header: what's in it, the total, and the way to checkout. */
export function CartButton({ checkoutHref = "/dashboard/checkout" }: { checkoutHref?: string } = {}) {
  const { items, remove } = useCart()
  const [open, setOpen] = useState(false)
  const count = items.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={count ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
          title="Cart"
          className="relative rounded-full text-foreground hover:bg-muted/50 active:bg-muted/50"
        >
          <ShoppingCart className="size-[18px]" aria-hidden="true" />
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">{count}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">Cart</div>
        {count === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href={checkoutHref} onClick={() => setOpen(false)}>Browse services</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(item.price, "NGN")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.name}`}
                    title="Remove"
                    className="rounded-sm p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-border px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{formatPrice({ amount: cartTotal(items) }, "NGN")}</span>
              </div>
              <Button asChild className="w-full">
                <Link href={checkoutHref} onClick={() => setOpen(false)}>Checkout</Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
