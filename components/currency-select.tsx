"use client"

import { Check } from "lucide-react"

import { chooseCurrency, useLocalCurrency } from "@/components/use-local-currency"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { BillingCurrency } from "@/lib/subscription"

const OPTIONS: { value: BillingCurrency; sign: string; name: string }[] = [
  { value: "NGN", sign: "₦", name: "Naira" },
  { value: "USD", sign: "$", name: "US dollar" },
]

/** Naira or dollars for every price on the site; starts from the visitor's location. Just the sign, after the cart. */
export function CurrencySelect() {
  const currency = useLocalCurrency()
  const current = OPTIONS.find((option) => option.value === currency) ?? OPTIONS[1]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Currency: ${current.name}`} title="Currency" className="rounded-full text-base font-semibold text-foreground hover:bg-muted/50 active:bg-muted/50">
          {current.sign}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => chooseCurrency(option.value)}>
            <span className="w-4 font-semibold">{option.sign}</span>
            {option.name}
            {option.value === currency && <Check className="ml-auto size-4" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
