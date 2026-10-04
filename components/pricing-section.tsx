"use client"

import { useState } from "react"
import Link from "next/link"

import { OfferCard } from "@/components/offer-card"
import { Button } from "@/components/ui/button"
import { naira, PLAN_KEYS, PLANS, planPrice, TRIAL_DAYS, type PlanInterval } from "@/lib/subscription"
import { cn } from "@/lib/utils"

/** The three VisualCNS plans, monthly or yearly. Consulting work is on the rate card. */
export function PricingSection() {
  const [interval, setInterval] = useState<PlanInterval>("monthly")

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Every plan starts with a {TRIAL_DAYS}-day free trial. No card needed.</p>
        <div className="inline-flex rounded-full border border-border bg-muted p-[3px]">
          {(["monthly", "yearly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={interval === option}
              onClick={() => setInterval(option)}
              className={cn("rounded-full px-[14px] py-[6px] text-xs font-bold", interval === option ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
            >
              {option === "monthly" ? "Monthly" : "Yearly · 2 months free"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLAN_KEYS.map((key) => {
          const plan = PLANS[key]
          return (
            <OfferCard
              key={key}
              eyebrow="Plan"
              badge={key === "business" ? "Most popular" : undefined}
              featured={key === "business"}
              title={plan.name}
              price={`${naira(planPrice(key, interval))}/${interval === "yearly" ? "yr" : "mo"}`}
              timeline={interval === "yearly" ? "Billed yearly" : "Billed monthly"}
              description={plan.summary}
              features={plan.features}
              ctaLabel="Start free trial"
              ctaHref="/signup"
            />
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-lg font-semibold">Need us to build something?</p>
          <p className="text-sm text-muted-foreground">
            Websites, apps, brand and campaign work are priced on our{" "}
            <Link href="/ratecard" className="underline underline-offset-2">rate card</Link>.
          </p>
        </div>
        <Button asChild>
          <Link href="/contact">Book a call</Link>
        </Button>
      </div>
    </div>
  )
}
