"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  Pencil,
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
import { ANALYSE_AREAS, BusinessHealthIntro, type BusinessDetails } from "@/components/company/business-health-intro"
import { useAuth } from "@/components/auth-provider"
import type { BHAction, BHAnswer, BHIcon, BHItem, BHLevel, BHReport, BHState } from "@/lib/business-health"

type Level = BHLevel
type Item = Omit<BHItem, "icon"> & { icon: LucideIcon }
type Action = BHAction
type Answer = BHAnswer

const LEVEL_BADGE: Record<Level, Item["badge"]> = {
  high: { label: "High", tone: "bad" },
  medium: { label: "Medium", tone: "warn" },
  low: { label: "Low", tone: "plain" },
}

const ICON: Record<BHIcon, LucideIcon> = {
  positioning: FileText,
  seo: Search,
  technical: Link2,
  reputation: Star,
  content: FileText,
  market: BarChart3,
  partner: Handshake,
  event: Calendar,
  tender: Gavel,
  grant: TrendingUp,
  competitor: BarChart3,
  trend: TrendingUp,
  news: Megaphone,
  launch: Megaphone,
  website: Globe,
  messaging: PenLine,
  offer: FileText,
  page: FilePlus,
  change: PenLine,
}

const toItem = (item: BHItem): Item => ({ ...item, icon: ICON[item.icon] ?? FileText })

const ASK_SUGGESTIONS = ["Analyse my competitors", "Find relevant grants", "Show upcoming events", "Check my SEO"]

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (!Number.isFinite(minutes) || minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

function Source({ source }: { source: string }) {
  const isUrl = /^https?:\/\//.test(source)
  return (
    <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
      Source:{" "}
      {isUrl ? (
        <a href={source} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-foreground hover:underline">
          {source.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      ) : (
        source
      )}
    </p>
  )
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
            {item.source && <Source source={item.source} />}
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

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

export function BusinessHealth({
  companyId,
  details,
  onSave,
}: {
  companyId: string
  details: BusinessDetails
  onSave?: (patch: Partial<BusinessDetails>) => Promise<void>
}) {
  const companyName = details.name
  const { user } = useAuth()

  const [report, setReport] = useState<BHReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState("")
  const [view, setView] = useState<"intro" | "dashboard">("intro")
  const [step, setStep] = useState(0)
  const [briefOpen, setBriefOpen] = useState(false)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [openAction, setOpenAction] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")
  const [asking, setAsking] = useState(false)
  const [answers, setAnswers] = useState<Answer[]>([])
  const progress = useRef<ReturnType<typeof setInterval> | null>(null)

  const call = useCallback(
    async (init?: { method: "POST"; body: Record<string, unknown> }) => {
      if (!user) throw new Error("Please sign in to use Business Health.")
      const token = await user.getIdToken()
      const response = await fetch(init ? "/api/business-health" : `/api/business-health?companyId=${encodeURIComponent(companyId)}`, {
        method: init?.method ?? "GET",
        headers: { Authorization: `Bearer ${token}`, ...(init ? { "content-type": "application/json" } : {}) },
        ...(init ? { body: JSON.stringify({ companyId, ...init.body }) } : {}),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || "Something went wrong. Please try again.")
      return body
    },
    [companyId, user],
  )

  function applyState(state: BHState) {
    setReport(state.report)
    setDone(new Set(state.done))
    setDismissed(new Set(state.dismissed))
    setView(state.report ? "dashboard" : "intro")
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    call()
      .then((state: BHState) => active && applyState(state))
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [call])

  useEffect(() => () => {
    if (progress.current) clearInterval(progress.current)
  }, [])

  async function scan() {
    if (scanning) return
    setScanning(true)
    setError("")
    setStep(0)
    // The scan is one request; tick through the areas so people can see it working.
    progress.current = setInterval(() => setStep((current) => Math.min(current + 1, ANALYSE_AREAS.length - 1)), 9000)
    try {
      const state = (await call({ method: "POST", body: { action: "scan" } })) as BHState
      setStep(ANALYSE_AREAS.length)
      applyState(state)
      setExpanded(new Set())
      setOpenRow(null)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      if (progress.current) clearInterval(progress.current)
      setScanning(false)
    }
  }

  async function ask(text: string) {
    const question = text.trim()
    if (!question || asking) return
    setQuery("")
    setAsking(true)
    try {
      const body = await call({ method: "POST", body: { action: "ask", question } })
      setAnswers((current) => [body.answer as Answer, ...current])
    } catch (reason) {
      setAnswers((current) => [{ question, text: (reason as Error).message, sources: [] }, ...current])
    } finally {
      setAsking(false)
    }
  }

  function toggleIn(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Done and dismissed marks are saved with the report so they stick across visits.
  function mark(kind: "done" | "dismissed", id: string) {
    const current = kind === "done" ? done : dismissed
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    ;(kind === "done" ? setDone : setDismissed)(next)
    void call({ method: "POST", body: { action: "update", [kind]: Array.from(next) } }).catch(() => undefined)
  }

  const data = useMemo(
    () => ({
      score: report?.score ?? 0,
      pages: report?.pages ?? 0,
      summary: report?.summary ?? "",
      attention: (report?.attention ?? []).map(toItem),
      opportunities: (report?.opportunities ?? []).map(toItem),
      market: (report?.market ?? []).map(toItem),
      online: (report?.online ?? []).map(toItem),
      changes: (report?.changes ?? []).map(toItem),
      actions: report?.actions ?? [],
    }),
    [report],
  )

  const visible = (items: Item[]) => items.filter((item) => !dismissed.has(item.id))
  const attention = visible(data.attention)
  const opportunities = visible(data.opportunities)
  const limit = (key: string, items: Item[], count: number) => (expanded.has(key) ? items : items.slice(0, count))
  const rowProps = (item: Item, dismissable = false) => ({
    item,
    open: openRow === item.id,
    onToggle: () => setOpenRow(openRow === item.id ? null : item.id),
    onDismiss: dismissable ? () => mark("dismissed", item.id) : undefined,
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

  if (loading) {
    return (
      <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading Business Health…
      </p>
    )
  }

  if (view === "intro" || !report) {
    return (
      <div>
        {error && <ErrorNote message={error} />}
        <BusinessHealthIntro
          details={details}
          onSave={onSave}
          onAnalyse={() => void scan()}
          onBack={report ? () => setView("dashboard") : undefined}
          scanning={scanning}
          step={step}
        />
      </div>
    )
  }

  return (
    <section className="mt-5 space-y-3 sm:space-y-4">
      {error && <ErrorNote message={error} />}
      {scanning && (
        <p className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          Scanning your website and the web. This takes a minute or two; the report updates when it&apos;s done.
        </p>
      )}
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
            Last updated {timeAgo(report.scannedAt)} · Scanned {data.pages} pages · {report.sources} sources
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setView("intro")}>
              <Pencil className="size-4" aria-hidden="true" />
              Business details
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={scan} disabled={scanning} className="bg-background">
              {scanning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
              {scanning ? "Scanning…" : "Run new scan"}
            </Button>
          </div>
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
                        onClick={() => mark("done", action.id)}
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
                        {item.source && <Source source={item.source} />}
                        <Button type="button" variant="ghost" size="sm" className="ml-auto h-7" onClick={() => mark("dismissed", item.id)}>
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
          onToggleAll={data.market.length > 2 ? () => toggleIn(setExpanded, "market") : undefined}
        >
          {data.market.length === 0 && <p className="px-1 py-4 text-sm text-muted-foreground">No competitor or market news found this time.</p>}
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
          onToggleAll={data.online.length > 2 ? () => toggleIn(setExpanded, "online") : undefined}
        >
          {data.online.length === 0 && <p className="px-1 py-4 text-sm text-muted-foreground">Nothing to report yet.</p>}
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
        onToggleAll={data.changes.length > 2 ? () => toggleIn(setExpanded, "changes") : undefined}
      >
        {data.changes.length === 0 && <p className="px-1 py-4 text-sm text-muted-foreground">Changes show up here after your next scan.</p>}
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
                {answer.sources.length > 0 && (
                  <div className="mt-2 flex flex-col gap-0.5">
                    {answer.sources.map((source) => (
                      <Source key={source} source={source} />
                    ))}
                  </div>
                )}
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

      <p className="px-1 text-xs text-muted-foreground">Built from your website and public web sources. Check anything important before acting on it.</p>
    </section>
  )
}
