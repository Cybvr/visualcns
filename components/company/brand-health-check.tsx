"use client"

import { useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  CalendarDays,
  Check,
  Gavel,
  Loader2,
  Mail,
  Palette,
  Phone,
  Radar,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CompanyLink } from "@/lib/organizations"

type Result = { title: string; meta: string; tag: string; contact: string; phone?: string; email?: string }
type Job = {
  key: string
  name: string
  icon: LucideIcon
  /** One line the agency reads to decide whether to run it. */
  blurb: string
  /** Words that let the ask bar route free text to this job. */
  keywords: string[]
  results: Result[]
}
type JobStatus = "idle" | "running" | "done"

// Prototype data. Swap for the model's response once the backend exists.
const JOBS: Job[] = [
  {
    key: "leads",
    name: "Lead Engine",
    icon: CalendarDays,
    blurb: "Find events and shows where this client could win customers.",
    keywords: ["lead", "event", "expo", "show", "conference"],
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
    blurb: "Spot businesses about to open that will need this client's work.",
    keywords: ["opening", "new", "radar", "launch"],
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
    blurb: "Watch what this client's rivals change — prices, offers, services.",
    keywords: ["competition", "competitor", "rival", "price", "tracker"],
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
    blurb: "Build a mockup from a prospect's brand to open a conversation.",
    keywords: ["pitch", "mockup", "visual", "brand", "design"],
    results: [
      { title: "acmefoods.ng", meta: "Logo + 3 brand colours pulled · mockup ready", tag: "Ready", contact: "sales@acmefoods.ng", email: "sales@acmefoods.ng" },
      { title: "brightlaw.com", meta: "Tagline and palette pulled · needs review", tag: "Draft", contact: "info@brightlaw.com", email: "info@brightlaw.com" },
    ],
  },
  {
    key: "tenders",
    name: "Tender Finder",
    icon: Gavel,
    blurb: "Surface open tenders this client is a fit to bid on.",
    keywords: ["tender", "bid", "procurement", "contract", "rfp"],
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
    blurb: "Assemble a targeted contact list for outreach.",
    keywords: ["b2b", "list", "contacts", "outreach", "prospect"],
    results: [
      { title: "Grand Estates Realty", meta: "Real estate · Lagos", tag: "List", contact: "Bola Martins", email: "bola@grandestates.ng", phone: "+234 806 111 2222" },
      { title: "Mama's Kitchen Group", meta: "Restaurants · 4 branches", tag: "List", contact: "Operations Manager", email: "ops@mamaskitchen.ng" },
      { title: "Okafor & Partners", meta: "Law firm · Abuja", tag: "List", contact: "Ify Okafor", email: "ify@okaforpartners.com", phone: "+234 807 333 4444" },
    ],
  },
]

const resultId = (jobKey: string, title: string) => `${jobKey}::${title}`

export function BrandHealthCheck({
  companyName,
}: {
  companyName: string
  description?: string
  website?: string
  linkedIn?: string
  links?: CompanyLink[]
}) {
  const [status, setStatus] = useState<Record<string, JobStatus>>({})
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const anyRun = useMemo(() => Object.values(status).some((s) => s !== "idle"), [status])

  function runJob(key: string) {
    if (status[key] === "running") return
    setStatus((current) => ({ ...current, [key]: "running" }))
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      setStatus((current) => ({ ...current, [key]: "done" }))
    }, 1100)
  }

  function handleAsk(event: React.FormEvent) {
    event.preventDefault()
    const text = query.trim().toLowerCase()
    if (!text) return
    const match = JOBS.find(
      (job) => job.name.toLowerCase().includes(text) || job.keywords.some((word) => text.includes(word)),
    )
    runJob((match ?? JOBS[0]).key)
    setQuery("")
  }

  function toggleSaved(id: string) {
    setSaved((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function dismiss(id: string) {
    setDismissed((current) => new Set(current).add(id))
  }

  return (
    <section className="mt-5">
      {/* Assistant framing: who it is and what it does for this client. */}
      <div className="rounded-2xl border border-border bg-muted/40 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Business health</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
              Your AI prospector for {companyName}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Tell me what to look for and I&apos;ll bring back leads and opportunities for this client — with contacts
              ready to act on. Pick a job below or ask in your own words.
            </p>
          </div>
        </div>

        <form onSubmit={handleAsk} className="mt-4 flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`e.g. find events near ${companyName}`}
            aria-label={`Ask the assistant to find opportunities for ${companyName}`}
          />
          <Button type="submit" className="shrink-0">
            Find
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </form>
      </div>

      {/* Jobs: each is a thing the assistant does. Run it to see results. */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {JOBS.map((job) => {
          const Icon = job.icon
          const state = status[job.key] ?? "idle"
          const visible = job.results.filter((result) => !dismissed.has(resultId(job.key, result.title)))
          const savedCount = job.results.filter((result) => saved.has(resultId(job.key, result.title))).length

          return (
            <div
              key={job.key}
              className={`flex flex-col rounded-xl border border-border p-4 ${state === "done" ? "sm:col-span-2" : ""}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold tracking-[-0.01em] text-foreground">{job.name}</h3>
                    {savedCount > 0 && (
                      <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                        {savedCount} saved
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{job.blurb}</p>
                </div>

                {state === "idle" && (
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => runJob(job.key)}>
                    Run
                  </Button>
                )}
                {state === "running" && (
                  <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Working…
                  </span>
                )}
                {state === "done" && (
                  <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => runJob(job.key)}>
                    Run again
                  </Button>
                )}
              </div>

              {state === "done" && (
                <ul className="mt-4 space-y-3">
                  {visible.length === 0 && (
                    <li className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      Nothing left here — you cleared them all.
                    </li>
                  )}
                  {visible.map((result) => {
                    const id = resultId(job.key, result.title)
                    const isSaved = saved.has(id)
                    return (
                      <li key={id} className="rounded-lg border border-border p-4">
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

                          {/* Next actions: what the agency does with a result. */}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant={isSaved ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => toggleSaved(id)}
                            >
                              {isSaved ? <Check className="size-4" aria-hidden="true" /> : null}
                              {isSaved ? "Saved as lead" : "Save as lead"}
                            </Button>
                            {result.email && (
                              <Button type="button" variant="outline" size="sm" asChild>
                                <a href={`mailto:${result.email}?subject=${encodeURIComponent(`${companyName} — quick idea`)}`}>
                                  <Mail className="size-4" aria-hidden="true" />
                                  Draft outreach
                                </a>
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground"
                              onClick={() => dismiss(id)}
                            >
                              <X className="size-4" aria-hidden="true" />
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        {anyRun ? "Sample results — live sources connect once the backend is ready." : "Sample assistant. Run a job to preview what it returns."}
      </p>
    </section>
  )
}
