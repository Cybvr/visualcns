"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Calendar,
  ChartColumn,
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
import { Skeleton } from "@/components/ui/skeleton"
import { SectionAddButton } from "@/components/company/section-add-button"
import { CollectionView } from "@/components/dashboard/collection-view"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useCompanyPage } from "@/components/company/company-page-context"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { cn } from "@/lib/utils"
import { ANALYSE_AREAS, PulseIntro, type BusinessDetails } from "@/components/company/pulse-intro"
import { useAuth } from "@/components/auth-provider"
import type { PulseAction, PulseAnswer, PulseIcon, PulseItem, PulseLevel, PulseReport, PulseReportSummary, PulseState } from "@/lib/pulse"

type Level = PulseLevel
type Item = Omit<PulseItem, "icon"> & { icon: LucideIcon }
type Action = PulseAction
type Answer = PulseAnswer

const LEVEL_BADGE: Record<Level, Item["badge"]> = {
  high: { label: "High", tone: "bad" },
  medium: { label: "Medium", tone: "warn" },
  low: { label: "Low", tone: "plain" },
}

const ICON: Record<PulseIcon, LucideIcon> = {
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

const toItem = (item: PulseItem): Item => ({ ...item, icon: ICON[item.icon] ?? FileText })

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

// The report is plain black and grey: every tone looks the same.
const PLAIN = { box: "", icon: "text-muted-foreground", tile: "" }
const HUE: Record<Hue, { box: string; icon: string; tile: string }> = { red: PLAIN, green: PLAIN, blue: PLAIN, purple: PLAIN, amber: PLAIN }

const BADGE = "border border-border text-muted-foreground"
const TONE: Record<NonNullable<Item["badge"]>["tone"], string> = { bad: BADGE, warn: BADGE, good: BADGE, plain: BADGE }

function Badge({ badge }: { badge: NonNullable<Item["badge"]> }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium", TONE[badge.tone])}>
      {badge.label}
    </span>
  )
}

function IconBox({ icon: Icon, tone, className }: { icon: LucideIcon; tone?: Hue; className?: string }) {
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center", tone ? HUE[tone].box : "", className)}>
      <Icon className={cn("size-5", tone ? HUE[tone].icon : "text-muted-foreground")} aria-hidden="true" />
    </span>
  )
}

/** A tappable row that opens to show more detail and its source. */
function Row({ item, open, onToggle, onDismiss }: { item: Item; open: boolean; onToggle: () => void; onDismiss?: () => void }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 py-3 text-left"
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
        <div className="mb-3 ml-[3.25rem] text-sm">
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
    <div id={`bh-${id}`} className={cn("scroll-mt-24 border-b border-border py-5", className)}>
      <div className="mb-1 flex items-center justify-between gap-2">
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
      <svg viewBox="0 0 100 100" className="size-full -rotate-90 text-foreground">
        <defs>
          <linearGradient id="bh-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-border" />
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
    <p role="alert" className="mt-5 flex items-start gap-2 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

/** One saved report, opened from the list at ?report={id}. */
function ReportView({
  companyId,
  details,
  onSave,
  reportId,
  onBack,
  onScanned,
}: {
  companyId: string
  details: BusinessDetails
  onSave?: (patch: Partial<BusinessDetails>) => Promise<void>
  reportId: string
  onBack: () => void
  onScanned: (id: string) => void
}) {
  const companyName = details.name

  const [report, setReport] = useState<PulseReport | null>(null)
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

  const { call, ready, signedOut } = useReportsApi(companyId, reportId)

  function applyState(state: PulseState) {
    setReport(state.report)
    setDone(new Set(state.done))
    setDismissed(new Set(state.dismissed))
    setView(state.report ? "dashboard" : "intro")
  }

  useEffect(() => {
    if (signedOut) {
      setError("Please sign in to use Reports.")
      setLoading(false)
      return
    }
    if (!ready) return
    let active = true
    setLoading(true)
    call()
      .then((state: PulseState) => active && applyState(state))
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [call, ready, signedOut])

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
      const state = (await call({ method: "POST", body: { action: "scan" } })) as PulseState
      setStep(ANALYSE_AREAS.length)
      applyState(state)
      if (state.id) onScanned(state.id)
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
  const { market, online, changes, actions } = data
  const limit = (key: string, items: Item[], count: number) => (expanded.has(key) ? items : items.slice(0, count))
  const rowProps = (item: Item, dismissable = false) => ({
    item,
    open: openRow === item.id,
    onToggle: () => setOpenRow(openRow === item.id ? null : item.id),
    onDismiss: dismissable ? () => mark("dismissed", item.id) : undefined,
  })

  const openActions = actions.filter((action) => !done.has(action.id)).length
  const found = attention.length + opportunities.length

  const stats: { id: string; icon: LucideIcon; tone: Hue; value: number; label: string }[] = [
    { id: "attention", tone: "red", icon: AlertCircle, value: attention.length, label: "Needs attention" },
    { id: "opportunities", tone: "green", icon: TrendingUp, value: opportunities.length, label: "Opportunities" },
    { id: "market", tone: "blue", icon: BarChart3, value: market.length, label: "Market & competitors" },
    { id: "online", tone: "purple", icon: Globe, value: online.length, label: "Your business online" },
  ]

  function jump(id: string) {
    document.getElementById(`bh-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (loading) return <ReportSkeleton />

  if (view === "intro" || !report) {
    return (
      <div>
        {error && <ErrorNote message={error} />}
        <PulseIntro
          details={details}
          onSave={onSave}
          onAnalyse={() => void scan()}
          onBack={report ? () => setView("dashboard") : onBack}
          scanning={scanning}
          step={step}
        />
      </div>
    )
  }

  return (
    <section className="mt-5">
      <div className="mb-4 flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Reports"
          title="Back to Reports"
          className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h2 className="min-w-0 truncate text-xl font-semibold tracking-[-0.02em]">Report · {reportDate(report.scannedAt)}</h2>
      </div>
      {error && <ErrorNote message={error} />}
      {scanning && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          Scanning your website and the web. This takes a minute or two; the report updates when it&apos;s done.
        </p>
      )}
      {/* Hero: what this is, the score, and when it last looked. */}
      <div className="border-b border-border py-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Reports</p>
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
            <Button type="button" variant="outline" size="sm" onClick={scan} disabled={scanning}>
              {scanning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
              {scanning ? "Scanning…" : "Run new scan"}
            </Button>
          </div>
        </div>
      </div>

      {/* Briefing: opens to the summary and prioritised actions. */}
      <div className="border-b border-border">
        <button
          type="button"
          onClick={() => setBriefOpen((open) => !open)}
          aria-expanded={briefOpen}
          className="flex w-full items-center gap-3 py-4 text-left"
        >
          <IconBox icon={Sparkles} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">Here&apos;s what I found</p>
            <p className="text-sm text-muted-foreground">
              {found} things worth your attention · {openActions} recommended actions
            </p>
          </div>
          <ChevronRight className={cn("size-5 shrink-0 text-muted-foreground transition-transform", briefOpen && "rotate-90")} aria-hidden="true" />
        </button>
        {briefOpen && (
          <div className="pb-5">
            <p className="max-w-3xl text-[15px] leading-7 text-foreground">{data.summary}</p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Recommended actions · {actions.filter((action) => done.has(action.id)).length} of {actions.length} done
            </p>
            <ol className="mt-2 divide-y divide-border">
              {actions.map((action, index) => {
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
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Evidence</p>
                          <p className="mt-1 text-sm text-foreground">{action.evidence}</p>
                        </div>
                        <div>
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
      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
        {stats.map((stat) => (
          <button
            key={stat.id}
            type="button"
            onClick={() => jump(stat.id)}
            className="flex items-start gap-2.5 py-4 pr-3 text-left transition-colors hover:text-foreground"
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
          <p className="px-1 py-4 text-sm text-muted-foreground">{"Nothing needs attention right now."}</p>
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
          <p className="px-1 py-4 text-sm text-muted-foreground">{"No open opportunities right now."}</p>
        ) : (
          <ul className="mt-2 grid sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3">
            {limit("opportunities", opportunities, 3).map((item) => {
              const open = openRow === item.id
              return (
                <li key={item.id} className="flex flex-col border-b border-border py-4 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenRow(open ? null : item.id)}
                    aria-expanded={open}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <IconBox icon={item.icon} tone={item.tone} className="size-5 justify-start" />
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
      <div className="grid lg:grid-cols-2 lg:gap-x-8">
        <Card
          id="market"
          title="Market & competitors"
          total={market.length}
          expanded={expanded.has("market")}
          onToggleAll={market.length > 2 ? () => toggleIn(setExpanded, "market") : undefined}
        >
          {market.length === 0 && <p className="px-1 py-4 text-sm text-muted-foreground">{"No competitor or market news found this time."}</p>}
          <ul>
            {limit("market", market, 2).map((item) => (
              <Row key={item.id} {...rowProps(item)} />
            ))}
          </ul>
        </Card>
        <Card
          id="online"
          title="Your business online"
          total={online.length}
          expanded={expanded.has("online")}
          onToggleAll={online.length > 2 ? () => toggleIn(setExpanded, "online") : undefined}
        >
          {online.length === 0 && <p className="px-1 py-4 text-sm text-muted-foreground">{"Nothing to report yet."}</p>}
          <ul>
            {limit("online", online, 2).map((item) => (
              <Row key={item.id} {...rowProps(item)} />
            ))}
          </ul>
        </Card>
      </div>

      {/* Recent changes since the last scan. */}
      <Card
        id="changes"
        title="Recent changes"
        total={changes.length}
        expanded={expanded.has("changes")}
        onToggleAll={changes.length > 2 ? () => toggleIn(setExpanded, "changes") : undefined}
      >
        {changes.length === 0 && <p className="px-1 py-4 text-sm text-muted-foreground">{"Changes show up here after your next scan."}</p>}
        <ul className="grid sm:grid-cols-2 sm:gap-x-6">
          {limit("changes", changes, 2).map((item) => (
            <Row key={item.id} {...rowProps(item)} />
          ))}
        </ul>
      </Card>

      {/* Ask AI */}
      <div className="border-b border-border py-5">
        {(asking || answers.length > 0) && (
          <div className="mb-3 space-y-2">
            {answers.map((answer, index) => (
              <div key={`${answer.question}-${index}`} className="border-b border-border pb-3">
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
          className="flex items-center gap-2 rounded-xl border border-border py-1.5 pl-3 pr-1.5"
        >
          <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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

      <p className="pt-4 text-xs text-muted-foreground">Built from your website and public web sources. Check anything important before acting on it.</p>
    </section>
  )
}

function reportDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "Undated" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

/**
 * Calls the reports route for one company, and for one report when `reportId`
 * is given. Loading can begin as soon as Firebase exposes the signed-in user.
 */
function useReportsApi(companyId: string, reportId?: string) {
  const { user, loading } = useAuth()
  // The signed-in user object can be replaced on token refresh; keying on the uid stops that from reloading the page.
  const userRef = useRef(user)
  userRef.current = user
  const uid = user?.uid ?? ""
  const call = useCallback(
    async (init?: { method: "POST"; body: Record<string, unknown> }) => {
      const current = userRef.current
      if (!current) throw new Error("Please sign in to use Reports.")
      const token = await current.getIdToken()
      const search = new URLSearchParams({ companyId, ...(reportId ? { reportId } : {}) })
      const response = await fetch(init ? "/api/pulse" : `/api/pulse?${search}`, {
        method: init?.method ?? "GET",
        headers: { Authorization: `Bearer ${token}`, ...(init ? { "content-type": "application/json" } : {}) },
        ...(init ? { body: JSON.stringify({ companyId, ...(reportId ? { reportId } : {}), ...init.body }) } : {}),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || "Something went wrong. Please try again.")
      return body
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, reportId, uid],
  )
  return { call, ready: Boolean(uid), signedOut: !loading && !uid }
}

function ReportSkeleton() {
  return (
    <section role="status" aria-label="Loading report" className="mt-5" aria-busy="true">
      <span className="sr-only">Loading report…</span>

      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <Skeleton className="h-7 w-52 max-w-[65%]" />
      </div>

      <div className="border-b border-border py-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-[min(32rem,85%)]" />
            <Skeleton className="h-4 w-[min(28rem,75%)]" />
          </div>
          <Skeleton className="size-20 shrink-0 rounded-full" />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-4 w-72 max-w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-border py-4">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-start gap-3 py-4 pr-3">
            <Skeleton className="size-5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-3 w-24 max-w-full" />
            </div>
          </div>
        ))}
      </div>

      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="border-b border-border py-5">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </section>
  )
}

/**
 * The Reports page: every scan saved as its own report, newest first, with the
 * same search, card/list switch and New button as the other company pages.
 * A report opens at ?report={id}.
 */
export function Pulse({
  companyId,
  details,
  onSave,
}: {
  companyId: string
  details: BusinessDetails
  onSave?: (patch: Partial<BusinessDetails>) => Promise<void>
}) {
  const { call, ready, signedOut } = useReportsApi(companyId)
  const { setRecordOpen } = useCompanyPage()
  // Read from the address bar during render, so a link straight to a report never loads the list first.
  const openId = useSearchParams().get("report")
  const [, select] = useUrlSelection("report")
  const [reports, setReports] = useState<PulseReportSummary[] | null>(null)
  const [error, setError] = useState("")
  const [scanning, setScanning] = useState(false)
  const [step, setStep] = useState(0)
  const [revision, setRevision] = useState(0)
  const [introOpen, setIntroOpen] = useState(false)
  const progress = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setRecordOpen(Boolean(openId))
    return () => setRecordOpen(false)
  }, [openId, setRecordOpen])

  useEffect(() => {
    if (openId) return
    if (signedOut) {
      setError("Please sign in to use Reports.")
      setReports([])
      return
    }
    if (!ready) return
    let active = true
    call()
      .then((body: { reports: PulseReportSummary[] }) => { if (active) setReports(body.reports) })
      .catch((reason: Error) => {
        if (!active) return
        setError(reason.message)
        setReports([])
      })
    return () => { active = false }
  }, [call, openId, ready, revision, signedOut])

  useEffect(() => () => {
    if (progress.current) clearInterval(progress.current)
  }, [])

  async function scan() {
    if (scanning) return
    setScanning(true)
    setError("")
    setStep(0)
    progress.current = setInterval(() => setStep((current) => Math.min(current + 1, ANALYSE_AREAS.length - 1)), 9000)
    try {
      const state = (await call({ method: "POST", body: { action: "scan" } })) as PulseState
      setStep(ANALYSE_AREAS.length)
      setRevision((current) => current + 1)
      if (state.id) select(state.id)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      if (progress.current) clearInterval(progress.current)
      setScanning(false)
      setIntroOpen(false)
    }
  }

  if (openId) {
    return (
      <ReportView
        key={openId}
        companyId={companyId}
        details={details}
        onSave={onSave}
        reportId={openId}
        onBack={() => select(null)}
        onScanned={(id) => {
          setRevision((current) => current + 1)
          select(id, { replace: true })
        }}
      />
    )
  }

  return (
    <>
      <h2 className="sr-only">Reports</h2>
      <CollectionView
        items={reports ?? []}
        loading={reports === null}
        getKey={(item) => item.id}
        searchFields={(item) => [reportDate(item.scannedAt), item.summary, `score ${item.score}`]}
        searchPlaceholder="Search reports"
        viewKey="company-reports"
        actions={<SectionAddButton label="New scan" onClick={() => setIntroOpen(true)} disabled={scanning} />}
        before={<>
          {error && <ErrorNote message={error} />}
          {scanning && (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              Scanning your website and the web. This takes a minute or two; the new report opens when it&apos;s done.
            </p>
          )}
        </>}
        empty={{
          icon: ChartColumn,
          title: "No reports yet",
          description: "Scan the business's website and the web to see what needs attention.",
          action: <SectionAddButton label="New scan" onClick={() => setIntroOpen(true)} disabled={scanning} />,
        }}
        card={(item) => ({
          icon: <ChartColumn className="size-4 text-muted-foreground" aria-hidden="true" />,
          title: reportDate(item.scannedAt),
          preview: (
            <div className="flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold tabular-nums tracking-[-0.03em] text-foreground">{item.score}</span>
              <span className="text-xs text-muted-foreground">out of 100</span>
            </div>
          ),
          onClick: () => select(item.id),
          ariaLabel: `Open report from ${reportDate(item.scannedAt)}`,
          menuLabel: `Options for report from ${reportDate(item.scannedAt)}`,
        })}
        date={(item) => item.scannedAt}
        itemActions={(item) => ({ noun: "report", name: reportDate(item.scannedAt), onOpen: () => select(item.id) })}
        row={(item) => ({ subtitle: `Score ${item.score} · ${item.attention} need attention · ${item.opportunities} opportunities` })}
      />
      <Dialog open={introOpen} onOpenChange={(open) => { if (!scanning) setIntroOpen(open) }}>
        <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto p-0">
          <DialogTitle className="sr-only">New scan</DialogTitle>
          <DialogDescription className="sr-only">Check the business details, then analyse.</DialogDescription>
          <PulseIntro details={details} onSave={onSave} onAnalyse={() => void scan()} scanning={scanning} step={step} />
        </DialogContent>
      </Dialog>
    </>
  )
}
