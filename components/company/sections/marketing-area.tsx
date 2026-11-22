"use client"

import Link from "next/link"
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from "react"
import { ChevronDown, MapPin, Search, Star } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { GOOGLE, SocialConnectDialog, useGoogleConnections, type GoogleKey, type GoogleService } from "@/components/company/sections/marketing-connect"
import {
  ErrorNote,
  LoadingCards,
  profileItems,
  reviewItems,
  seoItems,
  useBusinessDetails,
  useLatestScan,
} from "@/components/company/sections/marketing-pages"
import { SocialIcon } from "@/components/company/social-icon"
import {
  AdsScene,
  AnalyticsScene,
  BusinessProfileScene,
  ReviewsScene,
  SeoScene,
  SocialScene,
  TasksScene,
} from "@/components/marketing-illustrations"
import { Button } from "@/components/ui/button"
import type { BusinessDetails } from "@/components/company/pulse-intro"
import { platformLabel, type InboxItem } from "@/lib/social"
import { useSocialAccounts, useSocialRequest } from "@/lib/social-client"
import type { PulseItem } from "@/lib/pulse"
import { cn } from "@/lib/utils"

/*
 * The Marketing pages (Insights, SEO, Business Profile, Reviews, Google Ads)
 * share one layout: Score, To do, Tracking, Connections.
 */

type Scene = ComponentType<SVGProps<SVGSVGElement>>

export type Todo = {
  id: string
  title: string
  description: string
  action: string
  onAction: () => void
  /** Optional help shown under the button, e.g. "Don't have an account?". */
  help?: { label: string; text: string; href?: string; link?: string }
  scene: Scene
  /** Scan items can be marked done; connections can't. */
  onDone?: () => void
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6", className)}>{children}</section>
}

function StatusBadge({ connected, waiting }: { connected: boolean; waiting?: boolean }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", connected ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
      <span className={cn("size-1.5 rounded-full", connected ? "bg-emerald-500" : "bg-muted-foreground/60")} aria-hidden="true" />
      {connected ? (waiting ? "Waiting for data" : "Connected") : "Not connected"}
    </span>
  )
}

/** Score: one number, its change, and a line from Initial to Current. */
export function ScoreCard({ label, initial, current, suffix = "" }: { label: string; initial: number | null; current: number | null; suffix?: string }) {
  const change = initial !== null && current !== null ? current - initial : null
  const max = Math.max(initial ?? 0, current ?? 0, 1)
  const y = (value: number | null) => 70 - ((value ?? 0) / max) * 56
  return (
    <Panel>
      <SectionTitle>{label}</SectionTitle>
      <p className="mt-2 flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums text-foreground">{current ?? "–"}{current !== null ? suffix : ""}</span>
        <span className={cn("text-sm", change && change > 0 ? "text-emerald-600 dark:text-emerald-400" : change && change < 0 ? "text-destructive" : "text-muted-foreground")}>
          {change === null ? "No data yet" : change === 0 ? "No change" : `${change > 0 ? "+" : ""}${change}`}
        </span>
      </p>
      <svg viewBox="0 0 300 80" className="mt-3 h-20 w-full" preserveAspectRatio="none" aria-hidden="true">
        {[14, 32, 50, 68].map((line) => <line key={line} x1="0" x2="300" y1={line} y2={line} className="stroke-border" strokeDasharray="3 4" />)}
        <path d={`M0 ${y(initial)} L300 ${y(current)}`} className="fill-none stroke-primary" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>Initial {initial ?? "–"}{initial !== null ? suffix : ""}</span>
        <span>Current</span>
      </div>
    </Panel>
  )
}

function TodoCard({ todo }: { todo: Todo }) {
  const [helpOpen, setHelpOpen] = useState(false)
  const Scene = todo.scene
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="p-5 sm:p-6">
        <p className="text-xs text-muted-foreground">To do</p>
        <h3 className="mt-1 text-base font-semibold leading-snug text-foreground">{todo.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{todo.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={todo.onAction}>{todo.action}</Button>
          {todo.onDone && <Button type="button" variant="ghost" onClick={todo.onDone}>Mark as done</Button>}
        </div>
        {todo.help && (
          <div className="mt-3">
            <button type="button" onClick={() => setHelpOpen((open) => !open)} aria-expanded={helpOpen} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn("size-4 transition-transform", helpOpen && "rotate-180")} aria-hidden="true" />
              {todo.help.label}
            </button>
            {helpOpen && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {todo.help.text}{" "}
                {todo.help.href && <a href={todo.help.href} target="_blank" rel="noreferrer" className="font-medium text-foreground underline underline-offset-4">{todo.help.link ?? "Learn more"}</a>}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-4 py-4">
        <Scene className="mx-auto h-28 w-full max-w-md" />
      </div>
    </article>
  )
}

/** To do: up to three cards, the rest behind See all. */
export function TodoList({ todos, empty }: { todos: Todo[]; empty: string }) {
  const [all, setAll] = useState(false)
  const shown = all ? todos : todos.slice(0, 3)
  return (
    <section aria-label="To do" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>To do</SectionTitle>
        {todos.length > 3 && (
          <button type="button" onClick={() => setAll((value) => !value)} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {all ? "Show less" : `See all (${todos.length})`}
          </button>
        )}
      </div>
      {todos.length ? shown.map((todo) => <TodoCard key={todo.id} todo={todo} />) : <Panel><p className="text-sm text-muted-foreground">{empty}</p></Panel>}
    </section>
  )
}

export type Connection = { key: string; label: string; icon: ReactNode; connected: boolean; waiting?: boolean; onConnect: () => void }

/** Connections: the accounts this page uses, each with its status and Connect. */
export function ConnectionsCard({ items }: { items: Connection[] }) {
  return (
    <Panel>
      <SectionTitle>Connections</SectionTitle>
      <ul className="mt-3 divide-y divide-border">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
              <div className="mt-1"><StatusBadge connected={item.connected} waiting={item.waiting} /></div>
            </div>
            <Button type="button" variant={item.connected ? "ghost" : "default"} size="sm" onClick={item.onConnect}>{item.connected ? "Manage" : "Connect"}</Button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** Keywords we track: the ones in Brand details, else ones from the business details. */
function trackedKeywords(details: BusinessDetails, saved?: string) {
  const chosen = (saved ?? "").split(/[,\n]/).map((keyword) => keyword.trim()).filter(Boolean).slice(0, 8)
  if (chosen.length) return chosen
  const industry = (details.industry || "").split(/[,&/]/)[0].trim().toLowerCase()
  const city = (details.location || "").split(",")[0].trim().toLowerCase()
  const list = [industry && `${industry} services`, industry && city && `${industry} in ${city}`, industry && `best ${industry} company`, industry && `${industry} near me`, details.name.trim().toLowerCase()]
  return list.filter((value): value is string => Boolean(value))
}

/** Top rankings: Keyword and Position, per source. */
function RankingsCard({ keywords, sources, settingsHref }: { keywords: string[]; sources: { key: string; label: string; icon: ReactNode }[]; settingsHref: string }) {
  const [source, setSource] = useState(sources[0].key)
  return (
    <Panel>
      <SectionTitle>Top rankings</SectionTitle>
      {sources.length > 1 && (
        <div className="mt-3 inline-flex rounded-full bg-muted p-1" role="tablist" aria-label="Ranking source">
          {sources.map((item) => (
            <button key={item.key} type="button" role="tab" aria-selected={source === item.key} onClick={() => setSource(item.key)} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm", source === item.key ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground")}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-between border-b border-border pb-2 text-xs font-medium text-muted-foreground"><span>Keyword</span><span>Position</span></div>
      <ul className="divide-y divide-border">
        {keywords.map((keyword) => (
          <li key={keyword} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0 text-foreground">{keyword}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">–</span>
          </li>
        ))}
      </ul>
      <Link href={settingsHref} className="mt-3 inline-block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Edit keywords</Link>
    </Panel>
  )
}

function MetricsCard({ title, metrics }: { title: string; metrics: { label: string; value: ReactNode }[] }) {
  return (
    <Panel>
      <SectionTitle>{title}</SectionTitle>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-xl bg-muted/50 p-3">
            <dt className="truncate text-xs text-muted-foreground">{metric.label}</dt>
            <dd className="mt-1 truncate text-xl font-semibold tabular-nums text-foreground">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}

function FindingsCard({ title, items, empty }: { title: string; items: PulseItem[]; empty: string }) {
  return (
    <Panel>
      <SectionTitle>{title}</SectionTitle>
      {items.length ? (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.badge && <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{item.badge.label}</span>}
              </div>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-muted-foreground">{empty}</p>}
    </Panel>
  )
}

/** Everything the Marketing pages need: the scan, connections, and how to connect. */
function useMarketingPage() {
  const page = useCompanyPage()
  const scan = useLatestScan()
  const { details } = useBusinessDetails()
  const social = useSocialAccounts(page.company.id)
  const google = useGoogleConnections(page.company.id)
  const [socialOpen, setSocialOpen] = useState<string[] | null>(null)
  const accounts = social.info?.accounts ?? []
  const hasSocial = (platform: string) => accounts.some((account) => account.platform === platform)
  const businessLinked = Boolean(scan.connections.businessProfile) || hasSocial("google")

  // Scan items not marked done, as to-do cards.
  const scanTodos = (items: PulseItem[], scene: Scene, action = "See how"): Todo[] => (scan.latest ? items.filter((item) => !scan.latest!.done.includes(item.id)) : []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.detail,
    action,
    onAction: () => window.location.assign(page.sectionHref("insights")),
    scene,
    onDone: () => void scan.markDone(item.id),
  }))

  const dialogs = (
    <>
      <SocialConnectDialog
        companyId={page.company.id}
        open={socialOpen !== null}
        onOpenChange={(open) => { if (!open) setSocialOpen(null) }}
        platforms={socialOpen ?? []}
        title={socialOpen?.length === 1 ? `Connect ${platformLabel(socialOpen[0])}` : "Connect your accounts"}
        text="Sign in to the account that manages your business page. You'll come straight back here."
      />
    </>
  )

  return {
    ...page,
    ...scan,
    details,
    accounts,
    hasSocial,
    businessLinked,
    scanTodos,
    dialogs,
    googleConnected: google.connected,
    connectGoogle: (service: GoogleService) => () => void google.connect(service),
    connectSocial: (...platforms: string[]) => () => setSocialOpen(platforms),
    settingsHref: page.sectionHref("marketing-settings"),
  }
}

function PageShell({ goal, children, error, loading, dialogs }: { goal: string; children: ReactNode; error: string; loading: boolean; dialogs: ReactNode }) {
  return (
    <div className="mx-auto mt-4 max-w-3xl space-y-5">
      <p className="text-sm text-muted-foreground">{goal}</p>
      {error && <ErrorNote message={error} />}
      {loading ? <LoadingCards /> : children}
      {dialogs}
    </div>
  )
}

const googleIcon = (key: GoogleKey) => <span className="text-xs font-semibold text-[#4285f4]">{GOOGLE[key].name.split(" ").map((word) => word[0]).join("").slice(0, 3)}</span>

export function SeoPage() {
  const m = useMarketingPage()
  const report = m.latest?.report
  const todos: Todo[] = [
    ...(m.googleConnected.ga4 ? [] : [{ id: "ga4", title: "Google Analytics isn't connected", description: "Connect Google Analytics 4 to see who visits your website and where they come from.", action: "Connect now", onAction: m.connectGoogle("ga4"), scene: AnalyticsScene, help: { label: "Don't have an account?", text: "Google Analytics is free. Create an account and add it to your website.", href: "https://analytics.google.com", link: "Open Google Analytics" } }]),
    ...(m.googleConnected.searchConsole ? [] : [{ id: "searchConsole", title: "Search Console isn't connected", description: "Connect Search Console to track the searches people use to find you.", action: "Connect now", onAction: m.connectGoogle("searchConsole"), scene: SeoScene, help: { label: "Don't have an account?", text: "Search Console is free. Add your website and confirm you own it.", href: "https://search.google.com/search-console", link: "Open Search Console" } }]),
    ...m.scanTodos(report ? seoItems(report) : [], SeoScene),
  ]
  return (
    <PageShell goal="Get found on Google search." error={m.error} loading={m.latest === undefined} dialogs={m.dialogs}>
      <ScoreCard label="Visibility score" initial={null} current={null} />
      <TodoList todos={todos} empty="Nothing to do right now." />
      <RankingsCard keywords={trackedKeywords(m.details, m.brand.keywords)} sources={[{ key: "search", label: "Google Search", icon: <Search className="size-4 text-[#4285f4]" aria-hidden="true" /> }]} settingsHref={m.settingsHref} />
      <ConnectionsCard items={[
        { key: "ga4", label: "Google Analytics 4", icon: googleIcon("ga4"), connected: Boolean(m.googleConnected.ga4), waiting: true, onConnect: m.connectGoogle("ga4") },
        { key: "searchConsole", label: "Google Search Console", icon: googleIcon("searchConsole"), connected: Boolean(m.googleConnected.searchConsole), waiting: true, onConnect: m.connectGoogle("searchConsole") },
      ]} />
    </PageShell>
  )
}

export function BusinessProfilePage() {
  const m = useMarketingPage()
  const report = m.latest?.report
  const todos: Todo[] = [
    ...(m.businessLinked ? [] : [{ id: "gbp", title: "Your Google Business Profile isn't connected", description: "Connect your Google Business Profile to manage how your business shows on Google Search and Maps.", action: "Connect now", onAction: m.connectSocial("google"), scene: BusinessProfileScene, help: { label: "Don't have an account?", text: "A Google Business Profile is free. Create one with your business name, address and opening hours.", href: "https://www.google.com/business/", link: "Create a profile" } }]),
    ...(m.hasSocial("facebook") ? [] : [{ id: "facebook", title: "Your Facebook isn't connected", description: "Connect your Facebook page to keep your business details the same everywhere.", action: "Connect now", onAction: m.connectSocial("facebook"), scene: SocialScene, help: { label: "Don't have a Facebook page?", text: "Create a free business page from your Facebook account.", href: "https://www.facebook.com/pages/create", link: "Create a page" } }]),
    ...m.scanTodos(report ? profileItems(report) : [], BusinessProfileScene),
  ]
  return (
    <PageShell goal="Get found on Google Maps." error={m.error} loading={m.latest === undefined} dialogs={m.dialogs}>
      <ScoreCard label="Visibility score" initial={null} current={null} />
      <TodoList todos={todos} empty="Nothing to do right now." />
      <RankingsCard
        keywords={trackedKeywords(m.details, m.brand.keywords)}
        sources={[
          { key: "maps", label: "Google Maps", icon: <MapPin className="size-4 text-[#ea4335]" aria-hidden="true" /> },
          { key: "search", label: "Google Search", icon: <Search className="size-4 text-[#4285f4]" aria-hidden="true" /> },
        ]}
        settingsHref={m.settingsHref}
      />
      <ConnectionsCard items={[
        { key: "google", label: "Google Business Profile", icon: <SocialIcon platform="google" />, connected: m.businessLinked, onConnect: m.businessLinked ? () => window.location.assign(m.settingsHref) : m.connectSocial("google") },
        { key: "facebook", label: "Facebook", icon: <SocialIcon platform="facebook" />, connected: m.hasSocial("facebook"), onConnect: m.hasSocial("facebook") ? () => window.location.assign(m.settingsHref) : m.connectSocial("facebook") },
        { key: "instagram", label: "Instagram", icon: <SocialIcon platform="instagram" />, connected: m.hasSocial("instagram"), onConnect: m.hasSocial("instagram") ? () => window.location.assign(m.settingsHref) : m.connectSocial("instagram") },
      ]} />
    </PageShell>
  )
}

/** Reviews from the connected accounts' inbox. Null while loading. */
function useReviews(companyId: string, enabled: boolean) {
  const request = useSocialRequest()
  const [reviews, setReviews] = useState<InboxItem[] | null>(null)
  useEffect(() => {
    if (!enabled) { setReviews([]); return }
    let active = true
    request<{ items: InboxItem[] }>(`inbox?companyId=${encodeURIComponent(companyId)}`)
      .then((data) => { if (active) setReviews(data.items.filter((item) => item.kind === "review").sort((a, b) => b.at - a.at)) })
      .catch(() => { if (active) setReviews([]) })
    return () => { active = false }
  }, [companyId, enabled, request])
  return reviews
}

export function ReviewsPage() {
  const m = useMarketingPage()
  const report = m.latest?.report
  const reviews = useReviews(m.company.id, m.accounts.length > 0)
  const rated = (reviews ?? []).filter((review) => typeof review.rating === "number")
  const average = rated.length ? Math.round((rated.reduce((total, review) => total + (review.rating ?? 0), 0) / rated.length) * 10) / 10 : null
  const replied = (reviews ?? []).filter((review) => (review as InboxItem & { replied?: boolean }).replied).length
  const unreplied = (reviews ?? []).find((review) => !(review as InboxItem & { replied?: boolean }).replied)
  const todos: Todo[] = [
    ...(m.businessLinked ? [] : [{ id: "gbp", title: "Your Google reviews aren't connected", description: "Connect your Google Business Profile to see new reviews and reply in one place.", action: "Connect now", onAction: m.connectSocial("google"), scene: ReviewsScene, help: { label: "Don't have an account?", text: "A Google Business Profile is free and lets customers review you on Google.", href: "https://www.google.com/business/", link: "Create a profile" } }]),
    ...(m.hasSocial("facebook") ? [] : [{ id: "facebook", title: "Your Facebook reviews aren't connected", description: "Connect your Facebook page to see its reviews here too.", action: "Connect now", onAction: m.connectSocial("facebook"), scene: SocialScene }]),
    // Replies happen on the platform itself: open the newest review that has no reply.
    ...(unreplied?.permalink ? [{ id: "reply", title: `Reply to ${(reviews ?? []).length - replied} reviews`, description: "Replying shows customers you listen, and helps your ranking on Google.", action: "Reply now", onAction: () => window.open(unreplied.permalink, "_blank", "noopener,noreferrer"), scene: ReviewsScene }] : []),
    ...m.scanTodos(report ? reviewItems(report) : [], ReviewsScene),
  ]
  return (
    <PageShell goal="Build trust with customer reviews." error={m.error} loading={m.latest === undefined} dialogs={m.dialogs}>
      <ScoreCard label="Average rating" initial={null} current={average} />
      <TodoList todos={todos} empty="Nothing to do right now." />
      <MetricsCard title="Reviews" metrics={[
        { label: "Average rating", value: average ?? "–" },
        { label: "Reviews", value: reviews === null ? "–" : reviews.length },
        { label: "Replied", value: reviews === null || !reviews.length ? "–" : replied },
      ]} />
      <Panel>
        <SectionTitle>Recent reviews</SectionTitle>
        {reviews && reviews.length ? (
          <ul className="mt-3 divide-y divide-border">
            {reviews.slice(0, 5).map((review) => (
              <li key={review.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-foreground">{review.authorName}</p>
                  <span className="flex shrink-0 items-center gap-0.5" aria-label={`${review.rating ?? 0} stars`}>
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-3.5", n <= (review.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} aria-hidden="true" />)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{review.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{platformLabel(review.platform)} · {new Date(review.at).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted-foreground">{reviews === null ? "Loading…" : "No reviews yet."}</p>}
      </Panel>
      <ConnectionsCard items={[
        { key: "google", label: "Google Business Profile", icon: <SocialIcon platform="google" />, connected: m.businessLinked, onConnect: m.businessLinked ? () => window.location.assign(m.settingsHref) : m.connectSocial("google") },
        { key: "facebook", label: "Facebook", icon: <SocialIcon platform="facebook" />, connected: m.hasSocial("facebook"), onConnect: m.hasSocial("facebook") ? () => window.location.assign(m.settingsHref) : m.connectSocial("facebook") },
      ]} />
    </PageShell>
  )
}

export function GoogleAdsPage() {
  const m = useMarketingPage()
  const connected = Boolean(m.googleConnected.googleAds)
  const todos: Todo[] = connected ? [] : [{ id: "googleAds", title: "Google Ads isn't connected", description: "Connect Google Ads to see what you spend and the leads it brings in.", action: "Connect now", onAction: m.connectGoogle("googleAds"), scene: AdsScene, help: { label: "Don't run ads yet?", text: "We can set up and manage your Google Ads on Growth Max and Ultra.", href: `/${encodeURIComponent(m.company.slug || m.company.id)}/pricing/growth`, link: "See plans" } }]
  return (
    <PageShell goal="Get more leads from your ad spend." error={m.error} loading={m.latest === undefined} dialogs={m.dialogs}>
      <ScoreCard label="Cost per lead" initial={null} current={null} />
      <TodoList todos={todos} empty="Nothing to do right now." />
      <MetricsCard title="This month" metrics={[{ label: "Spend", value: "–" }, { label: "Clicks", value: "–" }, { label: "Leads", value: "–" }]} />
      <ConnectionsCard items={[{ key: "googleAds", label: "Google Ads", icon: googleIcon("googleAds"), connected, waiting: true, onConnect: m.connectGoogle("googleAds") }]} />
    </PageShell>
  )
}

export function InsightsPage() {
  const m = useMarketingPage()
  const report = m.latest?.report
  const done = m.latest?.done ?? []
  const todos: Todo[] = (report?.actions ?? []).filter((action) => !done.includes(action.id)).map((action) => ({
    id: action.id,
    title: action.title,
    description: action.why,
    action: "Mark as done",
    onAction: () => void m.markDone(action.id),
    scene: TasksScene,
    help: action.steps.length ? { label: "How to do it", text: action.steps.join(" ") } : undefined,
  }))
  const connections = [
    { key: "ga4", label: "Google Analytics 4", icon: googleIcon("ga4"), connected: Boolean(m.googleConnected.ga4), waiting: true, onConnect: m.connectGoogle("ga4") },
    { key: "searchConsole", label: "Google Search Console", icon: googleIcon("searchConsole"), connected: Boolean(m.googleConnected.searchConsole), waiting: true, onConnect: m.connectGoogle("searchConsole") },
    { key: "google", label: "Google Business Profile", icon: <SocialIcon platform="google" />, connected: m.businessLinked, onConnect: m.businessLinked ? () => window.location.assign(m.settingsHref) : m.connectSocial("google") },
    { key: "googleAds", label: "Google Ads", icon: googleIcon("googleAds"), connected: Boolean(m.googleConnected.googleAds), waiting: true, onConnect: m.connectGoogle("googleAds") },
    { key: "social", label: "Social accounts", icon: <SocialIcon platform="instagram" />, connected: m.accounts.length > 0, onConnect: m.accounts.length ? () => window.location.assign(m.settingsHref) : m.connectSocial("instagram", "facebook", "linkedin", "twitter") },
  ]
  if (m.latest === null && !m.error) {
    return (
      <PageShell goal="See the whole picture and what to do next." error="" loading={false} dialogs={m.dialogs}>
        <Panel>
          <p className="text-sm text-muted-foreground">Build your marketing on Marketing Home to see your insights.</p>
          <Button asChild size="sm" className="mt-4"><Link href={m.sectionHref("marketing")}>Go to Marketing Home</Link></Button>
        </Panel>
      </PageShell>
    )
  }
  return (
    <PageShell goal="See the whole picture and what to do next." error={m.error} loading={m.latest === undefined} dialogs={m.dialogs}>
      <ScoreCard label="Marketing score" initial={m.latest?.firstScore ?? null} current={report?.score ?? null} />
      {report?.summary && <Panel><SectionTitle>Summary</SectionTitle><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{report.summary}</p></Panel>}
      <TodoList todos={todos} empty="You've done everything on the list." />
      {report && (
        <>
          <FindingsCard title="Needs attention" items={report.attention} empty="Nothing needs attention." />
          <FindingsCard title="Opportunities" items={report.opportunities} empty="No opportunities found this time." />
          <FindingsCard title="Market and competitors" items={report.market} empty="No market news this time." />
          <FindingsCard title="Your business online" items={report.online} empty="Nothing to show yet." />
        </>
      )}
      <ConnectionsCard items={connections} />
    </PageShell>
  )
}
