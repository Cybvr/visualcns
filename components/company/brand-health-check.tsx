"use client"

import { useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  Eye,
  Globe,
  History,
  Lightbulb,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { CompanyLink } from "@/lib/organizations"

// Prototype data. Firecrawl crawls and research will feed these shapes once the backend exists.

type Level = "high" | "medium" | "low"

type Issue = { id: string; area: string; title: string; detail: string; level: Level; source: string }
type Opportunity = { id: string; kind: string; title: string; detail: string; when: string; fit: Level; source: string }
type MarketItem = { id: string; who: string; kind: string; title: string; detail: string; when: string }
type PresenceArea = { key: string; label: string; status: "good" | "fair" | "weak"; note: string }
type Change = { id: string; scope: "Business" | "Market"; title: string; detail: string; when: string }
type Action = { id: string; priority: Level; title: string; why: string; evidence: string; steps: string[] }

function sampleData(name: string, site: string) {
  const issues: Issue[] = [
    { id: "i1", area: "Website", title: "Homepage takes 6.8s to load on mobile", detail: "Large uncompressed hero images. Most visitors leave before it finishes.", level: "high", source: `${site}` },
    { id: "i2", area: "SEO", title: "Services pages have no page titles or descriptions", detail: "4 of 6 service pages show the same title in search results.", level: "high", source: `${site}/services` },
    { id: "i3", area: "Positioning", title: "Headline doesn't say what you do", detail: `"Excellence, delivered" could describe any company. Competitors lead with the service and city.`, level: "medium", source: `${site}` },
    { id: "i4", area: "Reputation", title: "Two unanswered reviews in the last month", detail: "Both mention slow replies. Replying publicly softens the impact.", level: "medium", source: "Google Business Profile" },
    { id: "i5", area: "Technical", title: "Contact form sends no confirmation", detail: "Form submits but shows no message, so people may send it twice or give up.", level: "low", source: `${site}/contact` },
  ]

  const opportunities: Opportunity[] = [
    { id: "o1", kind: "Tender", title: "State agency — brand and campaign services", detail: "Open call for agencies with public sector work. Matches your services list.", when: "Closes in 12 days", fit: "high", source: "Public procurement portal" },
    { id: "o2", kind: "Event", title: "West Africa Business Expo, Lagos", detail: "Exhibitor and speaker slots open. 200+ exhibitors, strong buyer turnout last year.", when: "In 42 days", fit: "high", source: "wabexpo.com" },
    { id: "o3", kind: "Grant", title: "SME digital growth grant", detail: "Up to ₦5m for small businesses investing in digital tools. You appear to qualify.", when: "Rolling, next review in 3 weeks", fit: "medium", source: "Development bank site" },
    { id: "o4", kind: "Partnership", title: "Co-working space looking for service partners", detail: "Newly opened space in Lekki is listing preferred partners for members.", when: "Posted 5 days ago", fit: "medium", source: "LinkedIn post" },
    { id: "o5", kind: "Content", title: `"How to choose a …" guide gap`, detail: "People search this monthly and no local competitor has a good answer.", when: "Ongoing", fit: "medium", source: "Search trends" },
    { id: "o6", kind: "Market", title: "Demand rising in Abuja", detail: "Searches for your core service in Abuja are up 38% in 3 months.", when: "Last 90 days", fit: "low", source: "Search trends" },
  ]

  const market: MarketItem[] = [
    { id: "m1", who: "Competitor A", kind: "Launch", title: "Launched a monthly retainer package", detail: "Fixed price, clearly listed on their pricing page.", when: "4 days ago" },
    { id: "m2", who: "Competitor B", kind: "Positioning", title: "Now calls itself a 'growth partner for SMEs'", detail: "Rewrote homepage and about page. Moving toward your audience.", when: "1 week ago" },
    { id: "m3", who: "Competitor C", kind: "Pricing", title: "Cut entry price by 20%", detail: "Starter plan dropped from ₦250k to ₦200k.", when: "2 weeks ago" },
    { id: "m4", who: "Industry", kind: "Trend", title: "Short video overtaking static posts", detail: "Most-shared local business content this quarter is short video.", when: "This quarter" },
    { id: "m5", who: "Industry", kind: "Development", title: "New data privacy rules for marketing emails", detail: "Consent records now required. Affects newsletters and outreach.", when: "Takes effect next month" },
  ]

  const presence: PresenceArea[] = [
    { key: "website", label: "Website", status: "fair", note: "Clear layout, but slow on mobile and light on proof like case studies." },
    { key: "offer", label: "Products & services", status: "good", note: "All services listed. Prices and packages are missing." },
    { key: "messaging", label: "Messaging", status: "weak", note: "Headline and about page are generic. Hard to tell who you're for." },
    { key: "discover", label: "Discoverability", status: "weak", note: `Ranks for "${name}" but not for any service + city searches.` },
    { key: "content", label: "Content", status: "fair", note: "Blog last updated 5 months ago. Social posts steady, low engagement." },
  ]

  const changes: Change[] = [
    { id: "c1", scope: "Business", title: "New team page added to your site", detail: "3 new profiles. Search engines have picked it up.", when: "Since last scan" },
    { id: "c2", scope: "Business", title: "Mobile load time got worse", detail: "4.1s → 6.8s after new homepage images.", when: "Since last scan" },
    { id: "c3", scope: "Market", title: "Competitor B rewrote their homepage", detail: "New headline and services order.", when: "Since last scan" },
    { id: "c4", scope: "Market", title: "2 new tenders in your category", detail: "One is a strong fit (see Opportunities).", when: "Since last scan" },
    { id: "c5", scope: "Business", title: "One new Google review (4 stars)", detail: "Mentions good work, slow replies.", when: "Last week" },
  ]

  const actions: Action[] = [
    { id: "a1", priority: "high", title: "Fix mobile speed on the homepage", why: "It's the first thing most visitors see, and it got worse this month.", evidence: "Load time 6.8s on mobile (was 4.1s).", steps: ["Compress hero images", "Lazy-load images below the fold", "Re-check speed after changes"] },
    { id: "a2", priority: "high", title: "Apply for the state agency tender", why: "Strong match and it closes soon.", evidence: "Closes in 12 days. Your services match 4 of 5 requirements.", steps: ["Download tender pack", "Gather 2 relevant case studies", "Assign someone to write the bid"] },
    { id: "a3", priority: "medium", title: "Rewrite the homepage headline", why: "Competitor B is now targeting the same customers with clearer words.", evidence: "Generic headline; competitor repositioned 1 week ago.", steps: ["Say what you do and for whom", "Add city or region", "Add one proof point"] },
    { id: "a4", priority: "medium", title: "Add titles and descriptions to service pages", why: "Quick win for showing up in search.", evidence: "4 of 6 service pages share one title.", steps: ["Write one title per service", "Add a short description for each", "Resubmit sitemap"] },
    { id: "a5", priority: "low", title: "Reply to recent reviews", why: "Shows you respond, which is the exact complaint.", evidence: "2 reviews unanswered in the last month.", steps: ["Thank the reviewer", "Address the delay briefly", "Invite them to get in touch"] },
  ]

  const briefing = {
    summary: `${name} is in a steady position but losing ground online. Your site is slower than last month and your message is less clear than competitors who are moving toward your customers. There are two strong openings right now: a public tender closing in 12 days and a large expo in 6 weeks.`,
    points: [
      "Competitor B repositioned toward SMEs — your core audience.",
      "Mobile speed dropped after the new homepage images.",
      "A tender matching your services closes in 12 days.",
    ],
  }

  return { briefing, issues, opportunities, market, presence, changes, actions }
}

const ASK_SUGGESTIONS = [
  "What are competitors doing differently?",
  "Find events we should attend",
  "Why aren't we showing up in search?",
  "Which tenders fit us best?",
]

type Answer = { question: string; text: string; sources: string[] }

function sampleAnswer(question: string, name: string, site: string): Answer {
  return {
    question,
    text: `Here's what stands out for ${name}. The biggest gap is how you're found: competitors rank for service + city searches and you don't. Fixing page titles and publishing one strong guide would close most of it within a few months. Meanwhile, two competitors changed their offer this month — one now lists fixed-price packages, which makes comparison easy for buyers. Worth deciding whether to show prices too.`,
    sources: [site, "Competitor A pricing page", "Search trends", "Google Business Profile"],
  }
}

const LEVEL_STYLES: Record<Level, string> = {
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
}

const STATUS_STYLES: Record<PresenceArea["status"], { label: string; dot: string }> = {
  good: { label: "Good", dot: "bg-emerald-500" },
  fair: { label: "Fair", dot: "bg-amber-500" },
  weak: { label: "Weak", dot: "bg-red-500" },
}

const NAV = [
  { id: "briefing", label: "Briefing" },
  { id: "actions", label: "Actions" },
  { id: "attention", label: "Needs attention" },
  { id: "opportunities", label: "Opportunities" },
  { id: "market", label: "Market" },
  { id: "presence", label: "Online presence" },
  { id: "changes", label: "Changes" },
] as const

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  )
}

function SectionHead({ id, icon: Icon, title, hint, right }: { id: string; icon: LucideIcon; title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div id={`bh-${id}`} className="flex scroll-mt-24 flex-wrap items-end justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <Icon className="size-5 shrink-0 text-foreground" aria-hidden="true" />
        <div>
          <h3 className="font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

function domainOf(url?: string) {
  if (!url) return ""
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function BrandHealthCheck({
  companyName,
  website,
}: {
  companyName: string
  description?: string
  website?: string
  linkedIn?: string
  links?: CompanyLink[]
}) {
  const site = domainOf(website) || "your website"
  const data = useMemo(() => sampleData(companyName, site), [companyName, site])

  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState("2 hours ago")
  const [done, setDone] = useState<Set<string>>(new Set())
  const [openAction, setOpenAction] = useState<string | null>(data.actions[0]?.id ?? null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [kind, setKind] = useState<string>("All")
  const [changeScope, setChangeScope] = useState<"All" | Change["scope"]>("All")
  const [query, setQuery] = useState("")
  const [asking, setAsking] = useState(false)
  const [answers, setAnswers] = useState<Answer[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms))
  }

  function scan() {
    setScanning(true)
    later(() => {
      setScanning(false)
      setLastScan("just now")
    }, 1400)
  }

  function ask(text: string) {
    const question = text.trim()
    if (!question || asking) return
    setQuery("")
    setAsking(true)
    later(() => {
      setAnswers((current) => [sampleAnswer(question, companyName, site), ...current])
      setAsking(false)
    }, 1200)
  }

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const issues = data.issues.filter((issue) => !dismissed.has(issue.id))
  const kinds = ["All", ...Array.from(new Set(data.opportunities.map((item) => item.kind)))]
  const opportunities = data.opportunities.filter(
    (item) => !dismissed.has(item.id) && (kind === "All" || item.kind === kind),
  )
  const changes = data.changes.filter((item) => changeScope === "All" || item.scope === changeScope)
  const openActions = data.actions.filter((action) => !done.has(action.id)).length
  const competitors = data.market.filter((item) => item.who !== "Industry")
  const industry = data.market.filter((item) => item.who === "Industry")

  const stats = [
    { id: "attention", label: "Need attention", value: issues.length },
    { id: "opportunities", label: "Opportunities", value: data.opportunities.filter((o) => !dismissed.has(o.id)).length },
    { id: "changes", label: "Changes", value: data.changes.length },
    { id: "actions", label: "Open actions", value: openActions },
  ]

  function jump(id: string) {
    document.getElementById(`bh-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <section className="mt-5 space-y-8">
      {/* Header: what this is and when it last looked. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">Business Health</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Watching {companyName}, its website and its market. Last scan {lastScan} · 64 pages · 18 sources
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={scan} disabled={scanning}>
          {scanning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
          {scanning ? "Scanning…" : "Scan now"}
        </Button>
      </div>

      {/* Ask AI */}
      <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            ask(query)
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`What should I look into for ${companyName}?`}
              aria-label={`Ask AI about ${companyName}`}
              className="bg-background pl-9"
            />
          </div>
          <Button type="submit" disabled={asking} className="shrink-0 bg-foreground text-background hover:bg-foreground/90">
            {asking ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
            Ask
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {ASK_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => ask(suggestion)}
              className="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {(asking || answers.length > 0) && (
          <div className="mt-4 space-y-3">
            {asking && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Researching…
              </p>
            )}
            {answers.map((answer, index) => (
              <div key={`${answer.question}-${index}`} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{answer.question}</p>
                  <button
                    type="button"
                    aria-label="Remove answer"
                    onClick={() => setAnswers((current) => current.filter((_, i) => i !== index))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer.text}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {answer.sources.map((source) => (
                    <Pill key={source} className="border border-border text-muted-foreground">{source}</Pill>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jump links */}
      <nav aria-label="Business Health sections" className="scrollbar-none -mb-4 flex gap-2 overflow-x-auto">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => jump(item.id)}
            className="shrink-0 rounded-full px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Business Briefing */}
      <div className="space-y-4">
        <SectionHead id="briefing" icon={Sparkles} title="Business briefing" hint="What matters right now" />
        <div className="rounded-2xl border border-border p-5">
          <p className="max-w-3xl text-[15px] leading-7 text-foreground">{data.briefing.summary}</p>
          <ul className="mt-4 space-y-1.5">
            {data.briefing.points.map((point) => (
              <li key={point} className="flex gap-2 text-sm text-muted-foreground">
                <ArrowRight className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((stat) => (
              <button
                key={stat.id}
                type="button"
                onClick={() => jump(stat.id)}
                className="rounded-xl bg-muted/50 px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <p className="text-xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="space-y-4">
        <SectionHead
          id="actions"
          icon={Target}
          title="Recommended actions"
          hint="In order of priority, with the evidence behind each"
          right={<span className="text-sm text-muted-foreground">{done.size} of {data.actions.length} done</span>}
        />
        <ol className="divide-y divide-border rounded-2xl border border-border">
          {data.actions.map((action, index) => {
            const isDone = done.has(action.id)
            const isOpen = openAction === action.id
            return (
              <li key={action.id} className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label={isDone ? "Mark as not done" : "Mark as done"}
                    onClick={() => toggle(setDone, action.id)}
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isDone ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                    )}
                  >
                    {isDone && <Check className="size-3" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenAction(isOpen ? null : action.id)}
                    aria-expanded={isOpen}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">{index + 1}.</span>
                      <p className={cn("font-medium text-foreground", isDone && "text-muted-foreground line-through")}>{action.title}</p>
                      <Pill className={LEVEL_STYLES[action.priority]}>{action.priority}</Pill>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{action.why}</p>
                  </button>
                </div>
                {isOpen && !isDone && (
                  <div className="ml-8 mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence</p>
                      <p className="mt-1 text-sm text-foreground">{action.evidence}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next steps</p>
                      <ul className="mt-1 space-y-1">
                        {action.steps.map((step) => (
                          <li key={step} className="text-sm text-foreground">• {step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Needs Attention */}
        <div className="space-y-4">
          <SectionHead id="attention" icon={AlertTriangle} title="Needs attention" hint="Problems found on your site and online" />
          <ul className="space-y-2">
            {issues.length === 0 && (
              <li className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing left here.
              </li>
            )}
            {issues.map((issue) => (
              <li key={issue.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill className={LEVEL_STYLES[issue.level]}>{issue.level}</Pill>
                      <span className="text-xs text-muted-foreground">{issue.area}</span>
                    </div>
                    <p className="mt-1.5 font-medium text-foreground">{issue.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{issue.detail}</p>
                    <p className="mt-2 truncate text-xs text-muted-foreground">Found on {issue.source}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => toggle(setDismissed, issue.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Opportunities */}
        <div className="space-y-4">
          <SectionHead id="opportunities" icon={Lightbulb} title="Opportunities" hint="Ways to grow found this week" />
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
            {kinds.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setKind(item)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  kind === item ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {opportunities.length === 0 && (
              <li className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing here right now.
              </li>
            )}
            {opportunities.map((item) => {
              const isSaved = saved.has(item.id)
              return (
                <li key={item.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill className="border border-border text-foreground">{item.kind}</Pill>
                    <Pill className={LEVEL_STYLES[item.fit]}>{item.fit} fit</Pill>
                    <span className="ml-auto text-xs text-muted-foreground">{item.when}</span>
                  </div>
                  <p className="mt-1.5 font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{item.source}</span>
                    <Button type="button" variant={isSaved ? "secondary" : "outline"} size="sm" onClick={() => toggle(setSaved, item.id)}>
                      {isSaved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" aria-label="Dismiss" onClick={() => toggle(setDismissed, item.id)}>
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Market & Competitors */}
      <div className="space-y-4">
        <SectionHead id="market" icon={TrendingUp} title="Market & competitors" hint="What others in your space are doing" />
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {competitors.map((item) => (
              <li key={item.id} className="flex gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                  {item.who.slice(-1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.who}</p>
                    <Pill className="bg-muted text-muted-foreground">{item.kind}</Pill>
                    <span className="ml-auto text-xs text-muted-foreground">{item.when}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Industry & trends</p>
            <ul className="mt-3 space-y-4">
              {industry.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center gap-2">
                    <Pill className="bg-background text-muted-foreground">{item.kind}</Pill>
                    <span className="text-xs text-muted-foreground">{item.when}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Online Presence */}
      <div className="space-y-4">
        <SectionHead id="presence" icon={Globe} title="Online presence" hint={`How ${site} and your content come across`} />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.presence.map((area) => {
            const status = STATUS_STYLES[area.status]
            return (
              <li key={area.key} className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-foreground">{area.label}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("size-2 rounded-full", status.dot)} aria-hidden="true" />
                  {status.label}
                </p>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{area.note}</p>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Changes & Monitoring */}
      <div className="space-y-4">
        <SectionHead
          id="changes"
          icon={History}
          title="Changes & monitoring"
          hint="What's different since the last scan"
          right={
            <div className="flex gap-1.5">
              {(["All", "Business", "Market"] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setChangeScope(scope)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    changeScope === scope ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {scope}
                </button>
              ))}
            </div>
          }
        />
        <ol className="relative space-y-4 border-l border-border pl-5">
          {changes.map((item) => (
            <li key={item.id} className="relative">
              <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-background bg-foreground" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <Pill className="bg-muted text-muted-foreground">{item.scope}</Pill>
              </div>
              <p className="text-sm text-muted-foreground">{item.detail} · {item.when}</p>
            </li>
          ))}
        </ol>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="size-3.5" aria-hidden="true" />
          Watching your site, 3 competitors, reviews, tenders and industry news. Scans weekly.
        </p>
      </div>

      <p className="border-t border-border pt-4 text-xs text-muted-foreground">
        Sample data. Live results arrive once web research is connected.
      </p>
    </section>
  )
}
