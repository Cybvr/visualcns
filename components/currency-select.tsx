"use client"

import { chooseCurrency, useLocalCurrency } from "@/components/use-local-currency"
import type { BillingCurrency } from "@/lib/subscription"

/** Naira or dollars for every price on the site; starts from the visitor's location. */
export function CurrencySelect() {
  const currency = useLocalCurrency()
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        onChange={(event) => chooseCurrency(event.target.value as BillingCurrency)}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="NGN">₦ NGN</option>
        <option value="USD">$ USD</option>
      </select>
    </label>
  )
}
