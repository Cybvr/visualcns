"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { NGAI_APP_URL } from "@/lib/ngai"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

// TODO(pricing): placeholder prices and limits — replace with real Ngai plans before launch.
const PLANS = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    blurb: "Try Ngai and build your first project.",
    features: ["1 published app", "Daily build credits", "Ngai subdomain"],
  },
  {
    name: "Starter",
    monthly: 10, // TODO(pricing)
    annual: 8, // TODO(pricing)
    blurb: "For a single site or side project.",
    features: ["5 published apps", "More monthly credits", "Custom domain", "Remove Ngai badge"],
  },
  {
    name: "Professional",
    monthly: 25, // TODO(pricing)
    annual: 20, // TODO(pricing)
    blurb: "For businesses running on what they build.",
    features: ["Unlimited apps", "Priority generation", "Online store features", "Version history"],
    featured: true,
  },
  {
    name: "Ultimate",
    monthly: 60, // TODO(pricing)
    annual: 48, // TODO(pricing)
    blurb: "For teams and agencies building for clients.",
    features: ["Everything in Professional", "Team seats", "Client handover", "Priority support"],
  },
]

export function NgaiPricing() {
  const [annual, setAnnual] = useState(true)

  return (
    <>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Label htmlFor="ngai-billing">Monthly</Label>
        <Switch id="ngai-billing" checked={annual} onCheckedChange={setAnnual} />
        <Label htmlFor="ngai-billing">Annual</Label>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const price = annual ? plan.annual : plan.monthly
          return (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-6 ${plan.featured ? "border-foreground" : "border-border"}`}
            >
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
              <p className="mt-6">
                <span className="text-4xl font-semibold tracking-tight">${price}</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </p>
              <p className="mt-1 h-5 text-xs text-muted-foreground">
                {price > 0 && annual ? "Billed annually" : price > 0 ? "Billed monthly" : ""}
              </p>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="mt-6" variant={plan.featured ? "default" : "outline"} asChild>
                <a href={NGAI_APP_URL}>{price === 0 ? "Start for Free" : `Choose ${plan.name}`}</a>
              </Button>
            </div>
          )
        })}
      </div>
    </>
  )
}
