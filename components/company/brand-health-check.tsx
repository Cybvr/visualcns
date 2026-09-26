"use client"

import {
  CalendarDays,
  Gavel,
  Mail,
  Palette,
  Phone,
  Printer,
  Radar,
  TrendingUp,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CompanyLink } from "@/lib/organizations"

type Result = { title: string; meta: string; tag: string; contact: string; phone?: string; email?: string }
type Tool = { key: string; name: string; icon: LucideIcon; results: Result[] }

// Prototype data. Swap for the model's response once the backend exists.
const TOOLS: Tool[] = [
  {
    key: "leads",
    name: "Lead Engine",
    icon: CalendarDays,
    results: [
      { title: "West Africa Food & Beverage Expo", meta: "Lagos · in 42 days · 200+ exhibitors", tag: "Event", contact: "Ada Okoro, Organiser", email: "ada@wafbexpo.com", phone: "+234 801 234 5678" },
      { title: "Abuja Property & Home Show", meta: "Abuja · in 55 days", tag: "Event", contact: "Musa Bello, Sponsorships", email: "musa@abujahomeshow.ng", phone: "+234 802 345 6789" },
      { title: "Startup Grind Conference", meta: "Lagos · in 33 days · sponsor slots open", tag: "Event", contact: "Chidi Eze, Partnerships", email: "chidi@startupgrind.ng" },
    ],
  },
  {
    key: "radar",
    name: "Opening Soon Radar",
    icon: Radar,
    results: [
      { title: "Sabor Kitchen — new branch", meta: "Lekki · fit-out underway · opening ~3 weeks", tag: "New", contact: "Front desk", phone: "+234 803 456 7890" },
      { title: "Bloom Pharmacy", meta: "Victoria Island · signage permit filed", tag: "New", contact: "Ngozi Umeh, Owner", email: "hello@bloompharm.ng" },
      { title: "Coreflex Gym", meta: "Ikeja · hiring staff · pre-launch", tag: "New", contact: "Tunde A., Manager", phone: "+234 805 678 9012" },
    ],
  },
  {
    key: "competition",
    name: "Competition Tracker",
    icon: TrendingUp,
    results: [
      { title: "PrintHouse dropped flyer price", meta: "500 flyers: ₦18k → ₦14k · 2 days ago", tag: "Price ↓", contact: "printhouse.ng" },
      { title: "QuickBanners launched a promo", meta: "\"Free design this month\" · on homepage", tag: "Offer", contact: "quickbanners.com" },
      { title: "Vinyl Pro added same-day service", meta: "New service page · faster turnaround", tag: "Change", contact: "vinylpro.ng" },
    ],
  },
  {
    key: "pitch",
    name: "Visual Pitch Generator",
    icon: Palette,
    results: [
      { title: "acmefoods.ng", meta: "Logo + 3 brand colours pulled · mockup ready", tag: "Ready", contact: "sales@acmefoods.ng", email: "sales@acmefoods.ng" },
      { title: "brightlaw.com", meta: "Tagline and palette pulled · needs review", tag: "Draft", contact: "info@brightlaw.com", email: "info@brightlaw.com" },
    ],
  },
  {
    key: "tenders",
    name: "Tender Finder",
    icon: Gavel,
    results: [
      { title: "State schools — printing & publications", meta: "Deadline in 12 days · est. ₦8m", tag: "Open", contact: "Procurement Office", email: "procurement@lagosstate.gov.ng" },
      { title: "City council — outdoor signage", meta: "Deadline in 20 days · est. ₦15m", tag: "Open", contact: "Tenders Desk", email: "tenders@citycouncil.gov.ng" },
      { title: "Community college — branded merch", meta: "Closed 3 days ago", tag: "Closed", contact: "Supplies Unit" },
    ],
  },
  {
    key: "b2b",
    name: "B2B List Builder",
    icon: Users,
    results: [
      { title: "Grand Estates Realty", meta: "Real estate · Lagos", tag: "List", contact: "Bola Martins", email: "bola@grandestates.ng", phone: "+234 806 111 2222" },
      { title: "Mama's Kitchen Group", meta: "Restaurants · 4 branches", tag: "List", contact: "Operations Manager", email: "ops@mamaskitchen.ng" },
      { title: "Okafor & Partners", meta: "Law firm · Abuja", tag: "List", contact: "Ify Okafor", email: "ify@okaforpartners.com", phone: "+234 807 333 4444" },
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
  return (
    <section className="mt-5 print:mt-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Business health</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">Opportunities for {companyName}</h2>
        </div>
        <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />
          Print
        </Button>
      </div>

      <div className="divide-y divide-border">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <div key={tool.key} className="py-7 print:break-inside-avoid">
              <div className="flex items-center gap-2.5">
                <Icon className="size-5 text-foreground" aria-hidden="true" />
                <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">{tool.name}</h3>
                <span className="ml-auto text-xs text-muted-foreground">{tool.results.length}</span>
              </div>

              <ul className="mt-4 space-y-3">
                {tool.results.map((result) => (
                  <li
                    key={result.title}
                    className="rounded-lg border border-border p-4 print:break-inside-avoid"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{result.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{result.meta}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {result.tag}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-sm font-medium text-foreground">{result.contact}</p>
                      <div className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-4">
                        {result.email && (
                          <a href={`mailto:${result.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                            {result.email}
                          </a>
                        )}
                        {result.phone && (
                          <a href={`tel:${result.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                            <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                            {result.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="pb-2 text-xs text-muted-foreground">Sample data.</p>
    </section>
  )
}
