"use client"

import { chooseCurrency, useLocalCurrency } from "@/components/use-local-currency"
import type { BillingCurrency } from "@/lib/subscription"

/** Naira or dollars for every price on the site; starts from the visitor's location. Sits beside the cart. */
export function CurrencySelect() {
  const currency = useLocalCurrency()
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        onChange={(event) => chooseCurrency(event.target.value as BillingCurrency)}
        aria-label="Currency"
        title="Currency"
        className="h-9 cursor-pointer rounded-full bg-transparent px-2 text-sm font-medium text-foreground outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="NGN">₦ NGN</option>
        <option value="USD">$ USD</option>
      </select>
    </label>
  )
}
