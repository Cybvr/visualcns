"use client"

import Link from "next/link"
import { useState, type FormEvent, type ReactNode } from "react"
import { BarChart3, Check, Info, MapPin, MousePointerClick, Search, Star } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import {
  ErrorNote,
  LoadingCards,
  profileItems,
  reviewItems,
  seoItems,
  useBusinessDetails,
  useLatestScan,

} from "@/components/company/sections/marketing-pages"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { platformLabel } from "@/lib/social"
import { useSocialAccounts } from "@/lib/social-client"
import { cn } from "@/lib/utils"
import type { PulseItem } from "@/lib/pulse"
import type { BusinessDetails } from "@/components/company/pulse-intro"

/*
 * Marketing Home: connect the accounts we track, then see each area at a
 * glance. Google connections save the ID the company gives; live numbers show
 * as dashes until tracking starts. Social uses the real connected accounts.
 */

type GoogleKey = "ga4" | "searchConsole" | "businessProfile" | "googleAds"

const GOOGLE: Record<GoogleKey, { name: string; field: string; placeholder: string; help: string }> = {
  ga4: { name: "Google Analytics 4", field: "Measurement ID", placeholder: "G-XXXXXXXXXX", help: "In Google Analytics: Admin, Data streams, your website." },
  searchConsole: { name: "Google Search Console", field: "Website in Search Console", placeholder: "https://yourbusiness.com", help: "The site exactly as it appears in Search Console." },
  businessProfile: { name: "Google Business Profile", field: "Profile link", placeholder: "https://maps.app.goo.gl/…", help: "Search your business on Google Maps, tap Share, and paste the link." },
  googleAds: { name: "Google Ads", field: "Customer ID", placeholder: "123-456-7890", help: "Top right of your Google Ads account." },
}

const AREAS = [
  { key: "seo", label: "SEO" },
  { key: "google-ads", label: "Google Ads" },
  { key: "business-profile", label: "Local" },
  { key: "reviews", label: "Reviews" },
  { key: "social", label: "Social" },
] as const
type AreaKey = (typeof AREAS)[number]["key"]

type Step = { id: string; title: string; text: string; cta: string; href?: string; onClick?: () => void }

/** Keywords we'd track, from the business details, until real rankings come in. */
function trackedKeywords(details: BusinessDetails) {
  const industry = (details.industry || "").split(/[,&/]/)[0].trim().toLowerCase()
  const city = (details.location || "").split(",")[0].trim().toLowerCase()
  const name = details.name.trim().toLowerCase()
  const list = [
    industry && `${industry} services`,
    industry && city && `${industry} in ${city}`,
    industry && `best ${industry} company`,
    industry && `${industry} near me`,
    name,
  ].filter((value): value is string => Boolean(value))
  return list.length ? list : [name || "your business"]
}

export function MarketingOverviewSection() {
  const { company, sectionHref } = useCompanyPage()
  const { latest, connections, error: loadError, refresh, call, link } = useLatestScan()
  const { details } = useBusinessDetails()
  const social = useSocialAccounts(company.id)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState("")
  const [stepIndex, setStepIndex] = useState(0)
  const [area, setArea] = useState<AreaKey>("seo")
  const [connecting, setConnecting] = useState<GoogleKey | null>(null)

  async function build() {
    if (scanning) return
    setScanning(true)
    setError("")
    try {
      await call({ body: { action: "scan" } })
      refresh()
      setStepIndex(0)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setScanning(false)
    }
  }

  const report = latest?.report ?? null
  const socialAccounts = social.info?.accounts ?? []
  const socialHref = `/${encodeURIComponent(company.slug || company.id)}/settings/social`
  const hasDetails = Boolean(details.name?.trim() && details.website?.trim() && details.description?.trim())
  const connect = (key: GoogleKey) => () => setConnecting(key)

  // Setup first, in the order that unlocks the most; then the scan's own next steps.
  const steps: Step[] = [
    ...(hasDetails ? [] : [{ id: "details", title: "Tell us about your business", text: "Add your website, what you do and who your customers are. Everything here is built from it.", cta: "Add details", href: sectionHref("marketing-settings") }]),
    ...(connections.ga4 ? [] : [{ id: "ga4", title: "Track your website with Google Analytics 4", text: "See who visits your site, where they come from and what they do: better data, smarter decisions and improved rankings.", cta: "Connect GA4", onClick: connect("ga4") }]),
    ...(connections.searchConsole ? [] : [{ id: "searchConsole", title: "See how you rank on Google", text: "Connect Search Console to track the searches people use to find you, and where you rank for each.", cta: "Connect Search Console", onClick: connect("searchConsole") }]),
    ...(connections.businessProfile ? [] : [{ id: "businessProfile", title: "Get found on Google Maps", text: "Connect your Google Business Profile to track calls, direction requests and reviews.", cta: "Connect Business Profile", onClick: connect("businessProfile") }]),
    ...(social.info && socialAccounts.length === 0 ? [{ id: "social", title: "Connect your social accounts", text: "Post, reply and see your followers in one place.", cta: "Connect social", href: socialHref }] : []),
    ...(report ? [] : [{ id: "build", title: "Build your marketing", text: "We check your website, search, reviews and competitors, then show you what to do next.", cta: scanning ? "Building…" : "Build my marketing", onClick: () => void build() }]),
    ...(report?.actions ?? []).map((action) => ({ id: action.id, title: action.title, text: action.why, cta: "See how", href: sectionHref("insights") })),
    ...(connections.googleAds ? [] : [{ id: "googleAds", title: "Track your Google Ads", text: "Connect Google Ads to see spend, clicks and leads next to everything else.", cta: "Connect Google Ads", onClick: connect("googleAds") }]),
  ]
  const step = steps.length ? steps[Math.min(stepIndex, steps.length - 1)] : null
  const shownSteps = steps.slice(0, 8)

  return (
    <div className="mx-auto mt-4 max-w-3xl">
      {(error || loadError) && <ErrorNote message={error || loadError} />}
      {latest === undefined ? <LoadingCards /> : (
        <>
          {step && (
            <section aria-label="Next recommended step" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
              {shownSteps.length > 1 && (
                <div className="flex gap-1.5" role="tablist" aria-label="Steps">
                  {shownSteps.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={item.id === step.id}
                      aria-label={`Step ${index + 1}: ${item.title}`}
                      onClick={() => setStepIndex(index)}
                      className={cn("h-1.5 max-w-12 flex-1 rounded-full transition-colors", item.id === step.id ? "bg-primary" : "bg-muted-foreground/25 hover:bg-muted-foreground/40")}
                    />
                  ))}
                </div>
              )}
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Next recommended step</p>
              <h2 className="mt-2 text-xl font-semibold leading-snug tracking-[-0.02em] text-foreground sm:text-2xl">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {step.href ? (
                  <Button asChild><Link href={step.href}>{step.cta}</Link></Button>
                ) : (
                  <Button type="button" onClick={step.onClick} disabled={scanning && step.id === "build"}>{step.cta}</Button>
                )}
                {stepIndex < shownSteps.length - 1 && (
                  <Button type="button" variant="ghost" onClick={() => setStepIndex((current) => current + 1)}>Next</Button>
                )}
              </div>
              {scanning && <p className="mt-3 text-sm text-muted-foreground">Building your marketing. This takes a minute or two.</p>}
            </section>
          )}

          <div className="scrollbar-none mt-6 flex gap-1 overflow-x-auto rounded-full bg-muted p-1" role="tablist" aria-label="Marketing areas">
            {AREAS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={area === item.key}
                onClick={() => setArea(item.key)}
                className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors", area === item.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            {area === "seo" && (
              <>
                {!connections.ga4 && <ConnectCard title="See live visitors with Google Analytics 4" text="Get real-time data from your website: who visits, where they come from and what they do." cta="Start tracking" onClick={connect("ga4")} />}
                <RankingCard connected={Boolean(connections.searchConsole)} onConnect={connect("searchConsole")} />
                <KeywordsCard details={details} sources={[{ label: "Google Search", icon: <Search className="size-4 text-[#4285f4]" aria-hidden="true" /> }]} />
                <FindingsCard title="What to fix in search" items={report ? seoItems(report) : null} href={sectionHref("seo")} link="See SEO" />
              </>
            )}
            {area === "google-ads" && (
              <>
                {!connections.googleAds && <ConnectCard title="Bring your Google Ads in" text="See what you spend, what it brings in, and what to change, next to the rest of your marketing." cta="Connect Google Ads" onClick={connect("googleAds")} />}
                <MetricsCard title="Ads this month" connected={Boolean(connections.googleAds)} metrics={[["Spend", BarChart3], ["Clicks", MousePointerClick], ["Leads", Check]]} />
                <LinkCard text="Want us to run your ads? Paid ads are managed for you on Growth Max and Ultra." href={sectionHref("google-ads")} link="See Google Ads" />
              </>
            )}
            {area === "business-profile" && (
              <>
                {!connections.businessProfile && <ConnectCard title="Show up on Google Maps" text="Connect your Google Business Profile to track calls, visits and direction requests." cta="Connect Business Profile" onClick={connect("businessProfile")} />}
                <MetricsCard title="Google Business Profile" connected={Boolean(connections.businessProfile)} metrics={[["Profile views", MapPin], ["Calls", Check], ["Directions", MapPin]]} />
                <KeywordsCard details={details} sources={[{ label: "Google Maps", icon: <MapPin className="size-4 text-[#ea4335]" aria-hidden="true" /> }]} />
                <FindingsCard title="What to fix on your profile" items={report ? profileItems(report) : null} href={sectionHref("business-profile")} link="See Business Profile" />
              </>
            )}
            {area === "reviews" && (
              <>
                {!connections.businessProfile && <ConnectCard title="See every review in one place" text="Connect your Google Business Profile to track new reviews and reply faster." cta="Connect Business Profile" onClick={connect("businessProfile")} />}
                <MetricsCard title="Reviews" connected={Boolean(connections.businessProfile)} metrics={[["Average rating", Star], ["Reviews", Star], ["Replied", Check]]} />
                <FindingsCard title="What people say" items={report ? reviewItems(report) : null} href={sectionHref("reviews")} link="See Reviews" />
              </>
            )}
            {area === "social" && (
              <SocialCard
                loading={social.loading && !social.info}
                accounts={socialAccounts.map((account) => ({ id: account.id, label: platformLabel(account.platform), name: account.name || account.username || "" }))}
                connectHref={socialHref}
                pageHref={sectionHref("social")}
              />
            )}
          </div>

          {report && (
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Score {report.score}/100 · Built {new Date(report.scannedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
              <button type="button" onClick={() => void build()} disabled={scanning} className="font-medium text-foreground underline underline-offset-4 disabled:opacity-50">
                {scanning ? "Updating…" : "Update marketing"}
              </button>
            </p>
          )}
        </>
      )}

      <ConnectDialog
        connection={connecting}
        value={connecting ? connections[connecting] ?? "" : ""}
        onOpenChange={(open) => { if (!open) setConnecting(null) }}
        onSave={async (value) => {
          if (!connecting) return
          await link(connecting, value)
          setConnecting(null)
          setStepIndex(0)
        }}
      />
    </div>
  )
}

function Card({ title, badge, info, children }: { title: string; badge?: ReactNode; info?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          {info && <span title={info} aria-label={info} className="text-muted-foreground"><Info className="size-4" aria-hidden="true" /></span>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Waiting({ connected }: { connected: boolean }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
      {connected ? "Waiting for data" : "Not connected"}
    </span>
  )
}

/** The promo card at the top of an area that isn't connected yet. */
function ConnectCard({ title, text, cta, onClick }: { title: string; text: string; cta: string; onClick: () => void }) {
  return (
    <section aria-label={title} className="rounded-2xl bg-gradient-to-br from-card via-card to-primary/10 p-5 shadow-sm ring-1 ring-border sm:p-6">
      <h3 className="text-lg font-semibold leading-snug text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <Button type="button" className="mt-4" onClick={onClick}>{cta}</Button>
    </section>
  )
}

function RankingCard({ connected, onConnect }: { connected: boolean; onConnect: () => void }) {
  return (
    <Card title="Keyword ranking performance" badge={<Waiting connected={connected} />} info="How many searches you rank for now, compared with when tracking started.">
      <div className="mt-4 flex items-end justify-between gap-4">
        <dl className="space-y-1 text-sm">
          <div className="flex gap-3 text-muted-foreground"><dt className="w-16">Initial</dt><dd className="tabular-nums">–</dd></div>
          <div className="flex gap-3 font-medium text-foreground"><dt className="w-16">Current</dt><dd className="tabular-nums">–</dd></div>
        </dl>
        <p className="text-right"><span className="block text-3xl font-semibold tabular-nums text-foreground">–</span><span className="text-xs text-muted-foreground">Change</span></p>
      </div>
      {!connected && <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onConnect}>Connect Search Console</Button>}
    </Card>
  )
}

function KeywordsCard({ details, sources }: { details: BusinessDetails; sources: { label: string; icon: ReactNode }[] }) {
  const keywords = trackedKeywords(details)
  return (
    <Card title="Top keywords" info="The searches we track for you, from your business details. Your rank shows once tracking starts.">
      {sources.map((source) => (
        <div key={source.label} className="mt-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">{source.icon}{source.label}</p>
          <div className="mt-2 flex justify-between text-xs font-medium text-muted-foreground"><span>Keyword</span><span>Rank</span></div>
          <ul className="mt-1 divide-y divide-border">
            {keywords.map((keyword) => (
              <li key={keyword} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 text-foreground">{keyword}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">–</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  )
}

function MetricsCard({ title, connected, metrics }: { title: string; connected: boolean; metrics: [string, typeof Star][] }) {
  return (
    <Card title={title} badge={<Waiting connected={connected} />}>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {metrics.map(([label, Icon]) => (
          <div key={label} className="rounded-xl bg-muted/50 p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">–</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

function FindingsCard({ title, items, href, link }: { title: string; items: PulseItem[] | null; href: string; link: string }) {
  return (
    <Card title={title}>
      {items === null ? (
        <p className="mt-2 text-sm text-muted-foreground">Build your marketing to see what to fix here.</p>
      ) : items.length ? (
        <ul className="mt-3 divide-y divide-border">
          {items.slice(0, 3).map((item) => (
            <li key={item.id} className="py-3">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Nothing to fix here right now.</p>
      )}
      <Button asChild variant="outline" size="sm" className="mt-4"><Link href={href}>{link}</Link></Button>
    </Card>
  )
}

function LinkCard({ text, href, link }: { text: string; href: string; link: string }) {
  return (
    <section className="rounded-2xl bg-muted/50 p-5 text-sm text-muted-foreground">
      <p>{text}</p>
      <Button asChild variant="outline" size="sm" className="mt-3"><Link href={href}>{link}</Link></Button>
    </section>
  )
}

function SocialCard({ loading, accounts, connectHref, pageHref }: { loading: boolean; accounts: { id: string; label: string; name: string }[]; connectHref: string; pageHref: string }) {
  if (!loading && accounts.length === 0) {
    return (
      <>
        <ConnectCardLink title="Connect your social accounts" text="Post, reply to messages and see your followers in one place." cta="Connect social" href={connectHref} />
        <LinkCard text="Plan posts and reply to comments and messages." href={pageHref} link="Open Social Media" />
      </>
    )
  }
  return (
    <Card title="Connected accounts">
      {loading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0 truncate text-foreground">{account.label}{account.name ? <span className="text-muted-foreground"> · {account.name}</span> : null}</span>
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">Connected</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm"><Link href={pageHref}>Open Social Media</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href={connectHref}>Manage accounts</Link></Button>
      </div>
    </Card>
  )
}

function ConnectCardLink({ title, text, cta, href }: { title: string; text: string; cta: string; href: string }) {
  return (
    <section aria-label={title} className="rounded-2xl bg-gradient-to-br from-card via-card to-primary/10 p-5 shadow-sm ring-1 ring-border sm:p-6">
      <h3 className="text-lg font-semibold leading-snug text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <Button asChild className="mt-4"><Link href={href}>{cta}</Link></Button>
    </section>
  )
}

/** Saves the ID of a Google account to track. Our team finishes the link from there. */
function ConnectDialog({ connection, value, onOpenChange, onSave }: { connection: GoogleKey | null; value: string; onOpenChange: (open: boolean) => void; onSave: (value: string) => Promise<void> }) {
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const info = connection ? GOOGLE[connection] : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim()) {
      setError(`Add your ${info?.field.toLowerCase()}.`)
      return
    }
    setSaving(true)
    setError("")
    try {
      await onSave(draft)
    } catch (reason) {
      setError((reason as Error).message || "Could not save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(connection)} onOpenChange={(open) => { if (open) { setDraft(value); setError("") } onOpenChange(open) }}>
      <DialogContent className="sm:max-w-md">
        {info && (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Connect {info.name}</DialogTitle>
              <DialogDescription>We start tracking once this is linked. Numbers appear here as they come in.</DialogDescription>
            </DialogHeader>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-foreground">{info.field}</span>
              <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={info.placeholder} className="mt-1.5" autoFocus />
              <span className="mt-1.5 block text-xs text-muted-foreground">{info.help}</span>
            </label>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <DialogFooter className="mt-5 gap-2">
              {value && <Button type="button" variant="ghost" disabled={saving} onClick={() => void onSave("")}>Disconnect</Button>}
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Connect"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}


