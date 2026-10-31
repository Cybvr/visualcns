"use client"

import { Fragment } from "react"
import Link from "next/link"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GROWTH_COMPARISON, growthPlanRows, type ComparisonCell } from "@/lib/plans"
import { cn } from "@/lib/utils"

function Cell({ value }: { value: ComparisonCell }) {
  if (value === true) return <Check className="mx-auto size-5 text-emerald-600" aria-label="Included" />
  if (value === false) return <X className="mx-auto size-4 text-muted-foreground" aria-label="Not included" />
  return <span className="inline-block rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{value}</span>
}

/**
 * Free, Pro, Max and Ultra side by side, section by section. The plan names and
 * buttons stay at the top while the table scrolls under them.
 */
export function PricingCompare({ ctaFor, stickyTop = "top-20" }: {
  /** Where each plan's "Get started" goes, and what it does on the way (e.g. add to cart). */
  ctaFor: (plan: string) => { href: string; onClick?: () => void; label: string }
  /** The sticky header's offset under the page's own header. */
  stickyTop?: string
}) {
  const plans = growthPlanRows

  return (
    <section aria-labelledby="compare-heading" className="space-y-4">
      <h2 id="compare-heading" className="font-serif text-3xl tracking-tight">Compare plans</h2>
      <div className="max-md:overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={cn("sticky z-20 bg-background py-4 text-left align-bottom max-md:left-0", stickyTop)}>
                <span className="sr-only">Feature</span>
              </th>
              {plans.map((plan) => {
                const cta = ctaFor(plan.service)
                return (
                  <th key={plan.service} scope="col" className={cn("sticky z-10 w-[18%] bg-background px-2 py-4 text-center align-bottom font-normal", stickyTop)}>
                    <div className="font-serif text-2xl text-foreground">{plan.service}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{plan.scope}</div>
                    <Button asChild size="sm" variant={plan.service === "Pro" ? "default" : "outline"} className="mt-3 w-full max-w-36">
                      <Link href={cta.href} onClick={cta.onClick}>{cta.label}</Link>
                    </Button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {GROWTH_COMPARISON.map((section) => (
              <Fragment key={section.title}>
                <tr>
                  <th scope="colgroup" colSpan={5} className="bg-background pb-3 pt-10 text-left font-serif text-2xl font-normal tracking-tight text-foreground max-md:sticky max-md:left-0">
                    {section.title}
                  </th>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <th scope="row" className="bg-background py-3.5 pr-4 text-left font-medium text-foreground max-md:sticky max-md:left-0 max-md:z-10">{row.label}</th>
                    {row.cells.map((cell, index) => (
                      <td key={plans[index]?.service ?? index} className="px-2 py-3.5 text-center"><Cell value={cell} /></td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
