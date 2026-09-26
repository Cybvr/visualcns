"use client"

import { useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowUp,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  FilePlus,
  FileText,
  Gavel,
  Globe,
  Handshake,
  Link2,
  Loader2,
  Megaphone,
  PenLine,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Prototype data. Firecrawl crawls and research will feed these shapes once the backend exists.

type Level = "high" | "medium" | "low"
type Item = {
  id: string
  icon: LucideIcon
  tone?: Hue
  title: string
  detail: string
  meta?: string
  badge?: { label: string; tone: "bad" | "warn" | "good" | "plain" }
  /** Shown when the row is opened: why it matters, where it came from. */
  more?: string
  source?: string
}
type Action = { id: string; priority: Level; title: string; why: string; evidence: string; steps: string[] }

const LEVEL_BADGE: Record<Level, Item["badge"]> = {
  high: { label: "High", tone: "bad" },
  medium: { label: "Medium", tone: "warn" },
  low: { label: "Low", tone: "plain" },
}

function sampleData(name: string, site: string) {
  const attention: Item[] = [
    { id: "i1", icon: FileText, tone: "red", title: "Unclear positioning", detail: `The homepage doesn't say clearly what ${name} does or who it's for.`, badge: LEVEL_BADGE.high, more: `Headline reads "Excellence, delivered". Competitors lead with the service and city.`, source: site },
    { id: "i2", icon: Search, tone: "red", title: "SEO improvements needed", detail: "4 pages have missing descriptions and 6 key searches aren't targeted.", badge: LEVEL_BADGE.medium, more: "Service pages share one title, so search results look identical.", source: `${site}/services` },
    { id: "i3", icon: Link2, tone: "red", title: "Broken internal links", detail: "6 links are broken or redirect to the wrong page.", badge: LEVEL_BADGE.medium, more: "Mostly old blog posts pointing at removed service pages.", source: site },
    { id: "i4", icon: Star, tone: "red", title: "Two unanswered reviews", detail: "Both mention slow replies.", badge: LEVEL_BADGE.medium, more: "Replying publicly softens the impact for new visitors.", source: "Google Business Profile" },
    { id: "i5", icon: AlertCircle, tone: "red", title: "Slow on mobile", detail: "Homepage takes 6.8s to load on phones.", badge: LEVEL_BADGE.low, more: "Large uncompressed hero images.", source: site },
  ]

  const opportunities: Item[] = [
    { id: "o1", icon: Handshake, tone: "green", title: "Potential partners", detail: "5 companies offering related services could be good referral partners.", badge: { label: "New", tone: "good" }, more: "Includes a new co-working space in Lekki listing preferred partners.", source: "LinkedIn, company sites" },
    { id: "o2", icon: Calendar, tone: "purple", title: "Relevant industry events", detail: "3 upcoming events in your target markets with speaker or exhibitor slots.", badge: LEVEL_BADGE.high, more: "West Africa Business Expo, Lagos, in 42 days is the strongest fit.", source: "Event listings" },
    { id: "o3", icon: FileText, tone: "amber", title: "Content opportunities", detail: "10 topics your audience searches for that no local competitor answers well.", badge: LEVEL_BADGE.high, more: `Top gap: "How to choose a…" guides, searched every month.`, source: "Search trends" },
    { id: "o4", icon: Gavel, tone: "green", title: "Open tender", detail: "A state agency is looking for brand and campaign services.", badge: LEVEL_BADGE.high, meta: "Closes in 12 days", more: "Your services match 4 of 5 requirements.", source: "Procurement portal" },
    { id: "o5", icon: TrendingUp, tone: "amber", title: "SME digital growth grant", detail: "Up to ₦5m for small businesses investing in digital tools.", badge: LEVEL_BADGE.medium, meta: "Next review in 3 weeks", more: "You appear to meet the size and sector rules.", source: "Development bank site" },
  ]

  const market: Item[] = [
    { id: "m1", icon: BarChart3, tone: "blue", title: "2 competitors launched new packages", detail: "Fixed-price monthly plans, listed on their pricing pages.", meta: "1 day ago", source: "Competitor sites" },
    { id: "m2", icon: Megaphone, tone: "blue", title: "Growing demand in Abuja", detail: "Searches for your core service are up 38% in 3 months.", meta: "3 days ago", source: "Search trends" },
    { id: "m3", icon: PenLine, tone: "blue", title: "Competitor B repositioned toward SMEs", detail: "Rewrote homepage and about page to target your audience.", meta: "1 week ago", source: "Competitor site" },
    { id: "m4", icon: AlertCircle, tone: "blue", title: "New consent rules for marketing emails", detail: "Consent records required from next month.", meta: "2 weeks ago", source: "Industry news" },
  ]

  const online: Item[] = [
    { id: "p1", icon: Globe, tone: "blue", title: "Website health", detail: "Technical issues: 2 · Pages scanned: 124", badge: { label: "Good", tone: "good" }, more: "Clear layout. Light on proof like case studies." },
    { id: "p2", icon: Search, tone: "blue", title: "Discoverability", detail: "SEO score: 62/100 · 4 missing descriptions", badge: { label: "Needs work", tone: "warn" }, more: `Ranks for "${name}" but not for any service + city searches.` },
    { id: "p3", icon: PenLine, tone: "blue", title: "Messaging", detail: "Headline and about page are generic", badge: { label: "Weak", tone: "bad" }, more: "Hard to tell who you're for within 5 seconds." },
    { id: "p4", icon: FileText, tone: "blue", title: "Products & services", detail: "All services listed · no prices or packages", badge: { label: "Good", tone: "good" }, more: "Competitors now show fixed prices." },
    { id: "p5", icon: Megaphone, tone: "blue", title: "Content", detail: "Blog last updated 5 months ago", badge: { label: "Needs work", tone: "warn" }, more: "Social posts steady, low engagement." },
  ]

  const changes: Item[] = [
    { id: "c1", icon: FilePlus, tone: "green", title: "2 new pages found on your website", detail: "Team page and a new case study.", meta: "2 hours ago" },
    { id: "c2", icon: PenLine, tone: "purple", title: "Homepage content updated", detail: "New hero images added. Mobile load time went from 4.1s to 6.8s.", meta: "1 day ago" },
    { id: "c3", icon: BarChart3, tone: "blue", title: "Competitor B rewrote their homepage", detail: "New headline and services order.", meta: "3 days ago" },
    { id: "c4", icon: Gavel, tone: "green", title: "2 new tenders in your category", detail: "One is a strong fit.", meta: "4 days ago" },
  ]

  const actions: Action[] = [
    { id: "a1", priority: "high", title: "Apply for the state agency tender", why: "Strong match and it closes soon.", evidence: "Closes in 12 days. Your services match 4 of 5 requirements.", steps: ["Download tender pack", "Pick 2 relevant case studies", "Assign someone to write the bid"] },
    { id: "a2", priority: "high", title: "Rewrite the homepage headline", why: "Competitor B is now targeting your customers with clearer words.", evidence: "Generic headline. Competitor repositioned 1 week ago.", steps: ["Say what you do and for whom", "Add city or region", "Add one proof point"] },
    { id: "a3", priority: "medium", title: "Fix service page titles and descriptions", why: "Quick win for showing up in search.", evidence: "4 of 6 service pages share one title.", steps: ["Write one title per service", "Add a short description for each", "Resubmit sitemap"] },
    { id: "a4", priority: "medium", title: "Fix the 6 broken links", why: "Broken links hurt trust and search ranking.", evidence: "Found in old blog posts.", steps: ["Point links to current pages", "Redirect removed pages"] },
    { id: "a5", priority: "low", title: "Reply to recent reviews", why: "Shows you respond, which is the exact complaint.", evidence: "2 reviews unanswered.", steps: ["Thank the reviewer", "Address the delay briefly"] },
  ]

  const summary = `${name} is steady but losing ground online. Your message is less clear than competitors who are moving toward your customers, and a few quick SEO fixes would help you get found. Two strong openings right now: a tender closing in 12 days and a large expo in 6 weeks.`

  return { score: 78, pages: 124, summary, attention, opportunities, market, online, changes, actions }
}

const ASK_SUGGESTIONS = ["Analyse my competitors", "Find relevant grants", "Show upcoming events", "Check my SEO"]

type Answer = { question: string; text: string; sources: string[] }

function sampleAnswer(question: string, name: string, site: string): Answer {
  return {
    question,
    text: `Here's what stands out for ${name}. The biggest gap is how you're found: competitors rank for service + city searches and you don't. Fixing page titles and publishing one strong guide would close most of it within a few months. Two competitors also changed their offer this month — one now lists fixed prices, which makes comparing easy for buyers.`,
    sources: [site, "Competitor pricing pages", "Search trends"],
  }
}

type Hue = "red" | "green" | "blue" | "purple" | "amber"

// Soft tints for icons and tiles, taken from the Business Health mock.
const HUE: Record<Hue, { box: string; icon: string; tile: string }> = {
  red: { box: "bg-red-100 dark:bg-red-950/50", icon: "text-red-500 dark:text-red-400", tile: "bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900/40" },
  green: { box: "bg-emerald-100 dark:bg-emerald-950/50", icon: "text-emerald-600 dark:text-emerald-400", tile: "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40" },
  blue: { box: "bg-blue-100 dark:bg-blue-950/50", icon: "text-blue-600 dark:text-blue-400", tile: "bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40" },
  purple: { box: "bg-violet-100 dark:bg-violet-950/50", icon: "text-violet-600 dark:text-violet-400", tile: "bg-violet-50 border-violet-100 dark:bg-violet-950/30 dark:border-violet-900/40" },
  amber: { box: "bg-amber-100 dark:bg-amber-950/50", icon: "text-amber-600 dark:text-amber-400", tile: "bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40" },
}

const TONE: Record<NonNullable<Item["badge"]>["tone"], string> = {
  bad: "bg-red-500/10 text-red-700 dark:text-red-400",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  plain: "bg-muted text-muted-foreground",
}

function Badge({ badge }: { badge: NonNullable<Item["badge"]> }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium", TONE[badge.tone])}>
      {badge.label}
    </span>
  )
}

function IconBox({ icon: Icon, tone, className }: { icon: LucideIcon; tone?: Hue; className?: string }) {
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone ? HUE[tone].box : "bg-muted", className)}>
      <Icon className={cn("size-5", tone ? HUE[tone].icon : "text-foreground")} aria-hidden="true" />
    </span>
  )
}

/** A tappable row that opens to show more detail and its source. */
function Row({ item, open, onToggle, onDismiss }: { item: Item; open: boolean; onToggle: () => void; onDismiss?: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/50 sm:p-3"
      >
        <IconBox icon={item.icon} tone={item.tone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-foreground">{item.title}</p>
            {item.badge && <Badge badge={item.badge} />}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
          {item.meta && <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>}
        </div>
        <ChevronRight className={cn("mt-2.5 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden="true" />
      </button>
      {open && (item.more || item.source) && (
        <div className="mb-2 ml-[3.25rem] mr-2 rounded-xl bg-muted/50 p-3 text-sm sm:ml-[3.75rem]">
          {item.more && <p className="text-foreground">{item.more}</p>}
          <div className="mt-2 flex items-center gap-2">
            {item.source && <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">Source: {item.source}</p>}
            {onDismiss && (
              <Button type="button" variant="ghost" size="sm" className="ml-auto h-7" onClick={onDismiss}>
                <X className="size-3.5" aria-hidden="true" />
                Dismiss
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

function Card({
  id,
  title,
  total,
  expanded,
  onToggleAll,
  children,
  className,
}: {
  id: string
  title: string
  total?: number
  expanded?: boolean
  onToggleAll?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <div id={`bh-${id}`} className={cn("scroll-mt-24 rounded-2xl border border-border bg-background p-3 sm:p-4", className)}>
      <div className="mb-1 flex items-center justify-between gap-2 px-1 sm:px-0">
        <h3 data-weight="semibold" className="font-semibold tracking-[-0.01em] text-foreground sm:text-lg">{title}</h3>
        {onToggleAll && total !== undefined && (
          <button
            type="button"
            onClick={onToggleAll}
            className="flex shrink-0 items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? "Show less" : `See all (${total})`}
            <ChevronRight className={cn("size-4 transition-transform", expanded && "-rotate-90")} aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-24 shrink-0 sm:size-32" role="img" aria-label={`Health score ${score} out of 100`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <defs>
          <linearGradient id="bh-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-emerald-500/15" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          stroke="url(#bh-ring)"
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
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

export function BusinessHealth({
  companyName,
  website,
}: {
  companyName: string
  website?: string
}) {
  const site = domainOf(website) || "your website"
  const data = useMemo(() => sampleData(companyName, site), [companyName, site])

  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState("2 hours ago")
  const [briefOpen, setBriefOpen] = useState(false)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [openAction, setOpenAction] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
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

  function toggleIn(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visible = (items: Item[]) => items.filter((item) => !dismissed.has(item.id))
  const attention = visible(data.attention)
  const opportunities = visible(data.opportunities)
  const limit = (key: string, items: Item[], count: number) => (expanded.has(key) ? items : items.slice(0, count))
  const rowProps = (item: Item, dismissable = false) => ({
    item,
    open: openRow === item.id,
    onToggle: () => setOpenRow(openRow === item.id ? null : item.id),
    onDismiss: dismissable ? () => toggleIn(setDismissed, item.id) : undefined,
  })

  const openActions = data.actions.filter((action) => !done.has(action.id)).length
  const found = attention.length + opportunities.length

  const stats: { id: string; icon: LucideIcon; tone: Hue; value: number; label: string }[] = [
    { id: "attention", tone: "red", icon: AlertCircle, value: attention.length, label: "Needs attention" },
    { id: "opportunities", tone: "green", icon: TrendingUp, value: opportunities.length, label: "Opportunities" },
    { id: "market", tone: "blue", icon: BarChart3, value: data.market.length, label: "Market & competitors" },
    { id: "online", tone: "purple", icon: Globe, value: data.online.length, label: "Your business online" },
  ]

  function jump(id: string) {
    document.getElementById(`bh-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <section className="mt-5 space-y-3 sm:space-y-4">
      {/* Hero: what this is, the score, and when it last looked. */}
      <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-orange-50 to-emerald-50 p-4 sm:p-6 dark:border-border dark:from-rose-950/30 dark:via-orange-950/20 dark:to-emerald-950/30">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Business health</p>
            <h2 data-weight="semibold" className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">
              AI intelligence for {companyName}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:text-base">
              Discover what matters, fix issues, and find opportunities for growth.
            </p>
          </div>
          <ScoreRing score={data.score} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Last updated {lastScan} · Scanned {data.pages} pages
          </p>
          <Button type="button" variant="outline" size="sm" onClick={scan} disabled={scanning} className="bg-background">
            {scanning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
            {scanning ? "Scanning…" : "Run new scan"}
          </Button>
        </div>
      </div>

      {/* Briefing: opens to the summary and prioritised actions. */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-violet-50 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-violet-950/30">
        <button
          type="button"
          onClick={() => setBriefOpen((open) => !open)}
          aria-expanded={briefOpen}
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <IconBox icon={Sparkles} tone="blue" className="bg-background dark:bg-background" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">Here&apos;s what I found</p>
            <p className="text-sm text-muted-foreground">
              {found} things worth your attention · {openActions} recommended actions
            </p>
          </div>
          <ChevronRight className={cn("size-5 shrink-0 text-muted-foreground transition-transform", briefOpen && "rotate-90")} aria-hidden="true" />
        </button>
        {briefOpen && (
          <div className="border-t border-blue-100 p-4 dark:border-blue-900/40">
            <p className="max-w-3xl text-[15px] leading-7 text-foreground">{data.summary}</p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Recommended actions · {done.size} of {data.actions.length} done
            </p>
            <ol className="mt-2 divide-y divide-border">
              {data.actions.map((action, index) => {
                const isDone = done.has(action.id)
                const isOpen = openAction === action.id
                return (
                  <li key={action.id} className="py-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={isDone ? "Mark as not done" : "Mark as done"}
                        onClick={() => toggleIn(setDone, action.id)}
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
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("font-medium text-foreground", isDone && "text-muted-foreground line-through")}>
                            {index + 1}. {action.title}
                          </p>
                          <Badge badge={LEVEL_BADGE[action.priority]!} />
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{action.why}</p>
                      </button>
                    </div>
                    {isOpen && !isDone && (
                      <div className="ml-8 mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl bg-muted/50 p-3">
                          <p className="text-xs font-medium text-muted-foreground">Evidence</p>
                          <p className="mt-1 text-sm text-foreground">{action.evidence}</p>
                        </div>
                        <div className="rounded-xl bg-muted/50 p-3">
                          <p className="text-xs font-medium text-muted-foreground">Next steps</p>
                          <ul className="mt-1 space-y-0.5">
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
        )}
      </div>

      {/* Counts that jump to each section. */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <button
            key={stat.id}
            type="button"
            onClick={() => jump(stat.id)}
            className={cn("flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-opacity hover:opacity-80 sm:p-4", HUE[stat.tone].tile)}
          >
            <stat.icon className={cn("mt-1 size-5 shrink-0", HUE[stat.tone].icon)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-semibold leading-tight text-foreground">{stat.value}</p>
              <p className="text-sm leading-5 text-muted-foreground">{stat.label}</p>
            </div>
            <ChevronRight className="mt-1.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ))}
      </div>

      {/* Needs attention */}
      <Card
        id="attention"
        title="Needs attention"
        total={attention.length}
        expanded={expanded.has("attention")}
        onToggleAll={attention.length > 3 ? () => toggleIn(setExpanded, "attention") : undefined}
      >
        {attention.length === 0 ? (
          <p className="px-1 py-4 text-sm text-muted-foreground">Nothing needs attention right now.</p>
        ) : (
          <ul>
            {limit("attention", attention, 3).map((item) => (
              <Row key={item.id} {...rowProps(item, true)} />
            ))}
          </ul>
        )}
      </Card>

      {/* Top opportunities: cards in a row on desktop, stacked on mobile. */}
      <Card
        id="opportunities"
        title="Top opportunities"
        total={opportunities.length}
        expanded={expanded.has("opportunities")}
        onToggleAll={opportunities.length > 3 ? () => toggleIn(setExpanded, "opportunities") : undefined}
      >
        {opportunities.length === 0 ? (
          <p className="px-1 py-4 text-sm text-muted-foreground">No open opportunities right now.</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {limit("opportunities", opportunities, 3).map((item) => {
              const open = openRow === item.id
              return (
                <li key={item.id} className="flex flex-col rounded-xl border border-border p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() => setOpenRow(open ? null : item.id)}
                    aria-expanded={open}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <IconBox icon={item.icon} tone={item.tone} className="size-9" />
                      <div className="flex items-center gap-1">
                        {item.badge && <Badge badge={item.badge} />}
                        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden="true" />
                      </div>
                    </div>
                    <p className="mt-3 font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
                    {item.meta && <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>}
                  </button>
                  {open && (
                    <div className="mt-3 border-t border-border pt-3 text-sm">
                      {item.more && <p className="text-foreground">{item.more}</p>}
                      <div className="mt-2 flex items-center gap-2">
                        {item.source && <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">Source: {item.source}</p>}
                        <Button type="button" variant="ghost" size="sm" className="ml-auto h-7" onClick={() => toggleIn(setDismissed, item.id)}>
                          <X className="size-3.5" aria-hidden="true" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Market and online presence side by side on desktop. */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card
          id="market"
          title="Market & competitors"
          total={data.market.length}
          expanded={expanded.has("market")}
          onToggleAll={() => toggleIn(setExpanded, "market")}
        >
          <ul>
            {limit("market", data.market, 2).map((item) => (
              <Row key={item.id} {...rowProps(item)} />
            ))}
          </ul>
        </Card>
        <Card
          id="online"
          title="Your business online"
          total={data.online.length}
          expanded={expanded.has("online")}
          onToggleAll={() => toggleIn(setExpanded, "online")}
        >
          <ul>
            {limit("online", data.online, 2).map((item) => (
              <Row key={item.id} {...rowProps(item)} />
            ))}
          </ul>
        </Card>
      </div>

      {/* Recent changes since the last scan. */}
      <Card
        id="changes"
        title="Recent changes"
        total={data.changes.length}
        expanded={expanded.has("changes")}
        onToggleAll={() => toggleIn(setExpanded, "changes")}
      >
        <ul className="grid sm:grid-cols-2 sm:gap-x-3">
          {limit("changes", data.changes, 2).map((item) => (
            <Row key={item.id} {...rowProps(item)} />
          ))}
        </ul>
      </Card>

      {/* Ask AI */}
      <div className="rounded-2xl border border-border bg-background p-3 sm:p-4">
        {(asking || answers.length > 0) && (
          <div className="mb-3 space-y-2">
            {answers.map((answer, index) => (
              <div key={`${answer.question}-${index}`} className="rounded-xl bg-muted/50 p-3 sm:p-4">
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
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{answer.text}</p>
                <p className="mt-2 text-xs text-muted-foreground">Sources: {answer.sources.join(" · ")}</p>
              </div>
            ))}
            {asking && (
              <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Researching…
              </p>
            )}
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            ask(query)
          }}
          className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 py-1.5 pl-3 pr-1.5"
        >
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`What should I look into for ${companyName}?`}
            aria-label={`Ask AI about ${companyName}`}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={asking || !query.trim()}
            aria-label="Ask"
            className="size-9 shrink-0 rounded-lg bg-foreground text-background hover:bg-foreground/90"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </Button>
        </form>
        <div className="scrollbar-none -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {ASK_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => ask(suggestion)}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <p className="px-1 text-xs text-muted-foreground">Sample data. Live results arrive once web research is connected.</p>
    </section>
  )
}
