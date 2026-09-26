"use client"

import { useMemo, useRef, useState } from "react"
import {
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
  /** Short, natural label shown as a suggestion chip. */
  chip: string
  /** Words that let the ask bar route free text to this job. */
  keywords: string[]
  results: Result[]
}
type JobStatus = "running" | "done"

// Prototype data. Swap for the model's response once the backend exists.
const JOBS: Job[] = [
  {
    key: "leads",
    name: "Lead Engine",
    icon: CalendarDays,
    chip: "Events near them",
    keywords: ["lead", "event", "expo", "show", "conference", "near"],
    results: [
      { title: "West Africa Food & Beverage Expo", meta: "Lagos · in 42 days · 200+ exhibitors", tag: "Event", contact: "Ada Okoro, Organiser", email: "ada@wafbexpo.com", phone: "+234 801 234 5678" },
      { title: "Abuja Property & Home Show", meta: "Abuja · in 55 days", tag: "Event", contact: "Musa Bello, Sponsorships", email: "musa@abujahomeshow.ng", phone: "+234 802 345 6789" },
      { title: "Startup Grind Conference", meta: "Lagos · in 33 days · sponsor slots open", tag: "Event", contact: "Chidi Eze, Partnerships", email: "chidi@startupgrind.ng" },
    ],
  },
  {
    key: "tenders",
    name: "Tender Finder",
    icon: Gavel,
    chip: "Open tenders",
    keywords: ["tender", "bid", "procurement", "contract", "rfp", "grant"],
    results: [
      { title: "State schools — printing & publications", meta: "Deadline in 12 days · est. ₦8m", tag: "Open", contact: "Procurement Office", email: "procurement@lagosstate.gov.ng" },
      { title: "City council — outdoor signage", meta: "Deadline in 20 days · est. ₦15m", tag: "Open", contact: "Tenders Desk", email: "tenders@citycouncil.gov.ng" },
      { title: "Community college — branded merch", meta: "Closed 3 days ago", tag: "Closed", contact: "Supplies Unit" },
    ],
  },
  {
    key: "radar",
    name: "Opening Soon Radar",
    icon: Radar,
    chip: "Opening soon",
    keywords: ["opening", "new", "radar", "launch", "soon"],
    results: [
      { title: "Sabor Kitchen — new branch", meta: "Lekki · fit-out underway · opening ~3 weeks", tag: "New", contact: "Front desk", phone: "+234 803 456 7890" },
      { title: "Bloom Pharmacy", meta: "Victoria Island · signage permit filed", tag: "New", contact: "Ngozi Umeh, Owner", email: "hello@bloompharm.ng" },
      { title: "Coreflex Gym", meta: "Ikeja · hiring staff · pre-launch", tag: "New", contact: "Tunde A., Manager", phone: "+234 805 678 9012" },
    ],
  },
  {
    key: "b2b",
    name: "B2B List Builder",
    icon: Users,
    chip: "New partners",
    keywords: ["b2b", "list", "contacts", "outreach", "prospect", "partner"],
    results: [
      { title: "Grand Estates Realty", meta: "Real estate · Lagos", tag: "List", contact: "Bola Martins", email: "bola@grandestates.ng", phone: "+234 806 111 2222" },
      { title: "Mama's Kitchen Group", meta: "Restaurants · 4 branches", tag: "List", contact: "Operations Manager", email: "ops@mamaskitchen.ng" },
      { title: "Okafor & Partners", meta: "Law firm · Abuja", tag: "List", contact: "Ify Okafor", email: "ify@okaforpartners.com", phone: "+234 807 333 4444" },
    ],
  },
  {
    key: "competition",
    name: "Competition Tracker",
    icon: TrendingUp,
    chip: "Track competitors",
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
    chip: "Draft a visual pitch",
    keywords: ["pitch", "mockup", "visual", "brand", "design"],
    results: [
      { title: "acmefoods.ng", meta: "Logo + 3 brand colours pulled · mockup ready", tag: "Ready", contact: "sales@acmefoods.ng", email: "sales@acmefoods.ng" },
      { title: "brightlaw.com", meta: "Tagline and palette pulled · needs review", tag: "Draft", contact: "info@brightlaw.com", email: "info@brightlaw.com" },
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

  // Jobs appear below the hero in the order they were first run.
  const [order, setOrder] = useState<string[]>([])
  const ran = order.length > 0

  function runJob(key: string) {
    setOrder((current) => (current.includes(key) ? current : [...current, key]))
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

  const runList = useMemo(
    () => order.map((key) => JOBS.find((job) => job.key === key)!).filter(Boolean),
    [order],
  )

  return (
    <section className="mt-5">
      {/* Assistant hero: who it is, what it does, and how to ask. */}
      <div className="rounded-2xl border border-border bg-muted/40 p-5 sm:p-7">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Business health</p>
        </div>

        <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
          Your AI prospector for {companyName}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
          Tell me what to look for and I&apos;ll bring back leads and opportunities, with contacts ready to act on.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {JOBS.map((job) => (
            <button
              key={job.key}
              type="button"
              onClick={() => runJob(job.key)}
              className="rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              {job.chip}
            </button>
          ))}
        </div>

        <form onSubmit={handleAsk} className="mt-4 flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`e.g. find events near ${companyName}`}
            aria-label={`Ask the assistant to find opportunities for ${companyName}`}
            className="bg-background"
          />
          <Button
            type="submit"
            className="shrink-0 bg-foreground text-background hover:bg-foreground/90"
          >
            Find
          </Button>
        </form>
      </div>

      {/* Results stream: each job the assistant has run. */}
      {!ran ? (
        <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Pick a suggestion or ask above — results land here with contacts you can act on.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {runList.map((job) => {
            const Icon = job.icon
            const state = status[job.key]
            const visible = job.results.filter((result) => !dismissed.has(resultId(job.key, result.title)))
            const savedCount = job.results.filter((result) => saved.has(resultId(job.key, result.title))).length

            return (
              <div key={job.key}>
                <div className="flex items-center gap-2.5">
                  <Icon className="size-5 shrink-0 text-foreground" aria-hidden="true" />
                  <h3 className="font-semibold tracking-[-0.01em] text-foreground">{job.name}</h3>
                  {savedCount > 0 && (
                    <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                      {savedCount} saved
                    </span>
                  )}
                  <div className="ml-auto">
                    {state === "running" ? (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Working…
                      </span>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" onClick={() => runJob(job.key)}>
                        Run again
                      </Button>
                    )}
                  </div>
                </div>

                {state === "done" && (
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.length === 0 && (
                      <li className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
                        Nothing left here — you cleared them all.
                      </li>
                    )}
                    {visible.map((result) => {
                      const id = resultId(job.key, result.title)
                      const isSaved = saved.has(id)
                      return (
                        <li key={id} className="flex flex-col rounded-xl border border-border p-4">
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
                            <div className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
                              {result.email && (
                                <a href={`mailto:${result.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                                  <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{result.email}</span>
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

                          {/* Next actions: what the agency does with a result. */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 pt-0">
                            <Button
                              type="button"
                              variant={isSaved ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => toggleSaved(id)}
                            >
                              {isSaved ? <Check className="size-4" aria-hidden="true" /> : null}
                              {isSaved ? "Saved" : "Save as lead"}
                            </Button>
                            {result.email && (
                              <Button type="button" variant="ghost" size="sm" asChild>
                                <a href={`mailto:${result.email}?subject=${encodeURIComponent(`${companyName} — quick idea`)}`}>
                                  <Mail className="size-4" aria-hidden="true" />
                                  Draft
                                </a>
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-auto text-muted-foreground"
                              onClick={() => dismiss(id)}
                            >
                              <X className="size-4" aria-hidden="true" />
                            </Button>
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
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        {ran ? "Sample results — live sources connect once the backend is ready." : "Sample assistant. Run a job to preview what it returns."}
      </p>
    </section>
  )
}
