import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { AuthProvider } from "@/components/auth-provider"
import { PricingView } from "@/components/pricing-view"

/**
 * The pricing page's plans as a home page section: the same cards and cart,
 * without the page header. Switching tabs here leaves the address alone.
 */
export function HomePricing() {
  return (
    <section aria-labelledby="home-pricing" className="mx-auto max-w-7xl px-4 py-14 sm:px-8 md:px-20 md:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mb-14">
        <h2 id="home-pricing" className="tracking-[-0.03em] text-foreground">Pricing</h2>
        <Link
          href="/pricing"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          View all
          <ArrowUpRight className="size-4 transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </div>
      {/* Signed-in buyers pay for Naira Growth plans straight through Paystack, as on the pricing page. */}
      <AuthProvider>
        <PricingView cartHref="/cart" freeHref="/signup" />
      </AuthProvider>
    </section>
  )
}
