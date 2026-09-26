"use client"

import { useMemo, useState } from "react"
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Gavel,
  Palette,
  Radar,
  Search,
  TrendingUp,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CompanyLink } from "@/lib/organizations"
import { cn } from "@/lib/utils"

type Result = { title: string; meta: string; tag: string; href?: string }
type Tool = {
  key: string
  name: string
  icon: LucideIcon
  blurb: string
  prompt: string
  results: Result[]
}

// Prototype data. Swap for the model's response once the backend exists.
const TOOLS: Tool[] = [
  {
    key: "leads",
    name: "Lead Engine",
    icon: CalendarDays,
    blurb: "Events and expos coming up that need what you sell.",
    prompt: "e.g. trade shows in Lagos next quarter",
    results: [
      { title: "West Africa Food & Beverage Expo", meta: "Lagos · in 42 days · 200+ exhibitors", tag: "Event" },
      { title: "Abuja Property & Home Show", meta: "Abuja · in 55 days · organiser email found", tag: "Event" },
      { title: "Startup Grind Conference", meta: "Lagos · in 33 days · sponsor slots open", tag: "Event" },
    ],
  },
  {
    key: "radar",
    name: "Opening Soon Radar",
    icon: Radar,
    blurb: "New businesses opening near you, before rivals reach them.",
    prompt: "e.g. new restaurants opening in Lekki",
    results: [
      { title: "Sabor Kitchen — new branch", meta: "Lekki · fit-out underway · opening ~3 weeks", tag: "New" },
      { title: "Bloom Pharmacy", meta: "Victoria Island · signage permit filed", tag: "New" },
      { title: "Coreflex Gym", meta: "Ikeja · hiring staff · pre-launch", tag: "New" },
    ],
  },
  {
    key: "competition",
    name: "Competition Tracker",
    icon: TrendingUp,
    blurb: "Watch rivals' prices and offers, get told when they change.",
    prompt: "e.g. track prints.ng and 2 others",
    results: [
      { title: "PrintHouse dropped flyer price", meta: "500 flyers: ₦18k → ₦14k · 2 days ago", tag: "Price ↓" },
      { title: "QuickBanners launched a promo", meta: "\"Free design this month\" · on homepage", tag: "Offer" },
      { title: "Vinyl Pro added same-day service", meta: "New service page · faster turnaround", tag: "Change" },
    ],
  },
  {
    key: "pitch",
    name: "Visual Pitch Generator",
    icon: Palette,
    blurb: "Pull a prospect's logo and colours to mock up a pitch.",
    prompt: "paste a prospect's website",
    results: [
      { title: "acmefoods.ng", meta: "Logo + 3 brand colours pulled · mockup ready", tag: "Ready" },
      { title: "brightlaw.com", meta: "Tagline and palette pulled · needs review", tag: "Draft" },
    ],
  },
  {
    key: "tenders",
    name: "Tender Finder",
    icon: Gavel,
    blurb: "Contracts and tenders you can bid on.",
    prompt: "e.g. signage tenders, Lagos State",
    results: [
      { title: "State schools — printing & publications", meta: "Deadline in 12 days · est. ₦8m", tag: "Open" },
      { title: "City council — outdoor signage", meta: "Deadline in 20 days · est. ₦15m", tag: "Open" },
      { title: "Community college — branded merch", meta: "Closed 3 days ago", tag: "Closed" },
    ],
  },
  {
    key: "b2b",
    name: "B2B List Builder",
    icon: Users,
    blurb: "Contact lists for outreach in any industry.",
    prompt: "e.g. law firms in Abuja with emails",
    results: [
      { title: "42 real estate agencies", meta: "Lagos · names + office emails", tag: "List" },
      { title: "18 restaurant chains", meta: "3+ branches each · manager contacts", tag: "List" },
      { title: "26 law firms", meta: "Abuja · partner emails found", tag: "List" },
    ],
  },
]

export function BrandHealthCheck({
  companyName,
}: {
  companyName: string
  description?: string
  website?: string
  linkedIn?: string
  links?: CompanyLink[]
}) {
  const [activeKey, setActiveKey] = useState(TOOLS[0].key)
  const [query, setQuery] = useState("")

  const active = useMemo(() => TOOLS.find((tool) => tool.key === activeKey) ?? TOOLS[0], [activeKey])

  return (
    <section className="mt-5">
      <div className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Business health</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">Find opportunities for {companyName}.</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Pick a tool, tell it what you want, and it pulls fresh leads from the web.</p>
      </div>

      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          const selected = tool.key === activeKey
          return (
            <button
              key={tool.key}
              type="button"
              onClick={() => setActiveKey(tool.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {tool.name}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        <p className="text-sm text-muted-foreground">{active.blurb}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={active.prompt}
              className="pl-9"
            />
          </div>
          <Button type="button" className="shrink-0">
            Find leads
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Latest results</h3>
          <span className="text-xs text-muted-foreground">{active.results.length} found · sample</span>
        </div>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {active.results.map((result) => (
            <li key={result.title} className="flex items-center gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{result.title}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{result.meta}</p>
              </div>
              <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {result.tag}
              </span>
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Sample data. Live results connect later.</p>
      </div>
    </section>
  )
}
