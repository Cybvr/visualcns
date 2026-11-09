"use client"

import Link from "next/link"
import { useState } from "react"
import { ShoppingCart, X } from "lucide-react"

import { CurrencySelect } from "@/components/currency-select"
import { useCart } from "@/components/dashboard/use-cart"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cartTotal, formatMoney } from "@/lib/cart"
import { useLocalCurrency } from "@/components/use-local-currency"
import { formatPrice } from "@/lib/plans"

/** The cart in the header, with the currency picker beside it: what's in it, the total, and the way to the cart page. */
export function CartButton({ cartHref, servicesHref, showCurrency = true }: { cartHref: string; servicesHref: string; /** The public site keeps the currency picker in its footer instead. */ showCurrency?: boolean }) {
  const { items, remove } = useCart()
  const currency = useLocalCurrency()
  const [open, setOpen] = useState(false)
  const count = items.length
  const total = formatMoney(cartTotal(items, currency), currency)

  return (
    <div className="flex items-center">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={count ? "default" : "icon"}
          aria-label={count ? `Cart, ${count} item${count === 1 ? "" : "s"}, ${total}` : "Cart"}
          title="Cart"
          className={`rounded-full text-foreground hover:bg-muted/50 active:bg-muted/50 ${count ? "gap-2 px-2.5 max-sm:size-9 max-sm:px-0" : ""}`}
        >
          <span className="relative">
            <ShoppingCart className="size-[18px]" aria-hidden="true" />
            {count > 0 && <span className="absolute -top-2 -right-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">{count}</span>}
          </span>
          {/* Phones show just the icon and count; the total is in the popup. */}
          {count > 0 && <span className="text-sm font-semibold tabular-nums max-sm:hidden">{total}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">Cart</div>
        {count === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href={servicesHref} onClick={() => setOpen(false)}>See pricing</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(item.price, currency)}</p>
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
                <span className="font-semibold">{total}</span>
              </div>
              <Button asChild className="w-full">
                <Link href={cartHref} onClick={() => setOpen(false)}>View cart</Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
    {showCurrency && <CurrencySelect />}
    </div>
  )
}
