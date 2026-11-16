"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { BadgeDollarSign, Check, ExternalLink } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { FIELDS, type BusinessDetails } from "@/components/company/pulse-intro"
import { ReportView } from "@/components/company/pulse"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import type { PulseItem, PulseReport, PulseReportSummary, PulseState } from "@/lib/pulse"

/*
 * Marketing works from one scan of the business (the engine formerly shown as
 * Reports). Overview takes the business details and runs the scan; Insights,
 * SEO, Reviews and Business Profile each show their part of the newest scan.
 */

type Latest = { id: string; report: PulseReport } | null

// Shared across the Marketing pages, so moving between them doesn't reload the scan.
const latestCache = new Map<string, Promise<Latest>>()

function useMarketingApi(companyId: string) {
  const { user, loading } = useAuth()
  const userRef = useRef(user)
  userRef.current = user
  const uid = user?.uid ?? ""
  const call = useCallback(async (init?: { body: Record<string, unknown> }, search?: Record<string, string>) => {
    const current = userRef.current
    if (!current) throw new Error("Please sign in to use Marketing.")
    const token = await current.getIdToken()
    const query = new URLSearchParams({ companyId, ...search })
    const response = await fetch(init ? "/api/pulse" : `/api/pulse?${query}`, {
      method: init ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(init ? { "content-type": "application/json" } : {}) },
      ...(init ? { body: JSON.stringify({ companyId, ...init.body }) } : {}),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body?.error || "Something went wrong. Please try again.")
    return body
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, uid])
  return { call, ready: Boolean(uid), signedOut: !loading && !uid }
}

/** The newest scan for the company, or null when there is none yet. */
function useLatestScan() {
  const { company } = useCompanyPage()
  const { call, ready, signedOut } = useMarketingApi(company.id)
  const [latest, setLatest] = useState<Latest | undefined>(undefined)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (signedOut) {
      setError("Please sign in to use Marketing.")
      setLatest(null)
      return
    }
    if (!ready) return
    let active = true
    let request = latestCache.get(company.id)
    if (!request) {
      request = (async (): Promise<Latest> => {
        const { reports } = (await call()) as { reports: PulseReportSummary[] }
        if (!reports.length) return null
        const state = (await call(undefined, { reportId: reports[0].id })) as PulseState
        return state.report ? { id: reports[0].id, report: state.report } : null
      })()
      latestCache.set(company.id, request)
      request.catch(() => latestCache.delete(company.id))
    }
    request
      .then((value) => { if (active) setLatest(value) })
      .catch((reason: Error) => {
        if (!active) return
        setError(reason.message)
        setLatest(null)
      })
    return () => { active = false }
  }, [call, company.id, ready, revision, signedOut])

  const refresh = useCallback(() => {
    latestCache.delete(company.id)
    setRevision((current) => current + 1)
  }, [company.id])

  return { latest, error, refresh, call }
}

// Details saved on Settings this visit, so Home shows them without reloading the company.
const savedDetails = new Map<string, Partial<BusinessDetails>>()

/** The business details Marketing works from, and how to save them. */
function useBusinessDetails() {
  const { company, admin } = useCompanyPage()
  const { call } = useMarketingApi(company.id)
  const [details, setDetails] = useState<BusinessDetails>(() => ({
    name: company.name,
    logoUrl: company.logoUrl,
    website: company.website,
    industry: company.industry,
    description: company.description,
    targetCustomers: company.targetCustomers,
    location: company.location,
    ...savedDetails.get(company.id),
  }))

  // Agency admins save straight to the company; the company's own people save through the server.
  const save = useCallback(async (patch: Partial<BusinessDetails>) => {
    if (admin) await admin.onUpdateCompany(patch)
    else await call({ body: { action: "details", details: patch } })
    savedDetails.set(company.id, { ...savedDetails.get(company.id), ...patch })
    setDetails((current) => ({ ...current, ...patch }))
  }, [admin, call, company.id])

  return { details, save }
}

function ErrorNote({ message }: { message: string }) {
  return <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{message}</p>
}

function LoadingCards() {
  return (
    <div className="mt-6 space-y-3" role="status" aria-label="Loading">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
    </div>
  )
}

/** Settings: the business details Marketing works from, as one form. */
export function MarketingSettingsSection() {
  const { details, save } = useBusinessDetails()
  const [draft, setDraft] = useState<BusinessDetails>(details)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: "good" | "bad"; text: string } | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setNotice({ tone: "bad", text: "Business name is required." })
      return
    }
    const patch: Partial<BusinessDetails> = {}
    for (const field of FIELDS) {
      if (field.key === "logoUrl") continue
      const next = (draft[field.key] ?? "").trim()
      if (next !== (details[field.key] ?? "")) patch[field.key] = next
    }
    if (!Object.keys(patch).length) {
      setNotice({ tone: "good", text: "Saved." })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      await save(patch)
      setNotice({ tone: "good", text: "Saved." })
    } catch {
      setNotice({ tone: "bad", text: "Could not save. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">Your business details. Marketing uses them each time it builds.</p>
      {FIELDS.filter((field) => field.key !== "logoUrl").map((field) => (
        <label key={field.key} className="block">
          <span className="text-sm font-medium text-foreground">{field.label}</span>
          {field.long ? (
            <Textarea
              value={draft[field.key] ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              rows={4}
              className="mt-1.5"
            />
          ) : (
            <Input
              value={draft[field.key] ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              className="mt-1.5"
            />
          )}
        </label>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        <span aria-live="polite" className={notice?.tone === "bad" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{notice?.text}</span>
      </div>
    </form>
  )
}

/** Shown on a Marketing page before the first scan. */
function SetUpFirst() {
  const { sectionHref } = useCompanyPage()
  return (
    <section className="mx-auto mt-6 max-w-xl rounded-2xl bg-muted/50 p-6 text-sm sm:p-8">
      <p className="text-foreground">Build your marketing on Marketing Home to fill this page.</p>
      <Button asChild size="sm" className="mt-4">
        <Link href={sectionHref("marketing")}>Get started</Link>
      </Button>
    </section>
  )
}

type Step = { id: string; title: string; text: string; action: { label: string; href?: string; onClick?: () => void } }

/** Home areas, as tabs under the next step. "Local" is the Business Profile page. */
const AREAS = [
  { key: "seo", label: "SEO" },
  { key: "google-ads", label: "Google Ads" },
  { key: "business-profile", label: "Local" },
  { key: "reviews", label: "Reviews" },
  { key: "social", label: "Social" },
] as const
type AreaKey = (typeof AREAS)[number]["key"]

/** Home: the next recommended step, then each marketing area at a glance. */
export function MarketingOverviewSection() {
  const { sectionHref } = useCompanyPage()
  const { latest, error: loadError, refresh, call } = useLatestScan()
  const { details } = useBusinessDetails()
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState("")
  const [stepIndex, setStepIndex] = useState(0)
  const [area, setArea] = useState<AreaKey>("seo")

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

  const report = latest?.report
  const hasDetails = Boolean(details.name?.trim() && details.website?.trim() && details.description?.trim())
  const steps: Step[] = report
    ? report.actions.map((action) => ({ id: action.id, title: action.title, text: action.why, action: { label: "See how", href: sectionHref("insights") } }))
    : [
        ...(hasDetails ? [] : [{ id: "details", title: "Tell us about your business", text: "Add your website, what you do and who your customers are. Marketing builds everything from this.", action: { label: "Add details", href: sectionHref("marketing-settings") } }]),
        { id: "build", title: "Build your marketing", text: "We check your website, search, reviews and competitors, then show you what to do next.", action: { label: scanning ? "Building…" : "Build my marketing", onClick: () => void build() } },
      ]
  const step = steps[Math.min(stepIndex, steps.length - 1)]

  return (
    <div className="mx-auto mt-4 max-w-3xl">
      {(error || loadError) && <ErrorNote message={error || loadError} />}
      {latest === undefined ? <LoadingCards /> : (
        <>
          {/* Next recommended step: one at a time, with dots to move between them. */}
          {step && (
            <section aria-label="Next recommended step" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
              {steps.length > 1 && (
                <div className="flex gap-1.5" role="tablist" aria-label="Steps">
                  {steps.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={item.id === step.id}
                      aria-label={`Step ${index + 1}`}
                      onClick={() => setStepIndex(index)}
                      className={`h-1.5 flex-1 max-w-12 rounded-full transition-colors ${item.id === step.id ? "bg-primary" : "bg-muted-foreground/25 hover:bg-muted-foreground/40"}`}
                    />
                  ))}
                </div>
              )}
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-primary">Next recommended step</p>
              <h2 className="mt-2 text-xl font-semibold leading-snug tracking-[-0.02em] text-foreground sm:text-2xl">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {step.action.href ? (
                  <Button asChild><Link href={step.action.href}>{step.action.label}</Link></Button>
                ) : (
                  <Button type="button" onClick={step.action.onClick} disabled={scanning}>{step.action.label}</Button>
                )}
                {steps.length > 1 && stepIndex < steps.length - 1 && (
                  <Button type="button" variant="ghost" onClick={() => setStepIndex((current) => current + 1)}>Next</Button>
                )}
              </div>
              {scanning && <p className="mt-3 text-sm text-muted-foreground">This takes a minute or two.</p>}
            </section>
          )}

          {/* Each area at a glance. */}
          <div className="scrollbar-none mt-6 flex gap-1 overflow-x-auto rounded-full bg-muted p-1" role="tablist" aria-label="Marketing areas">
            {AREAS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={area === item.key}
                onClick={() => setArea(item.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${area === item.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <AreaCard area={area} report={report ?? null} />

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
    </div>
  )
}

/** One area on Home: its top findings and a link to its page. */
function AreaCard({ area, report }: { area: AreaKey; report: PulseReport | null }) {
  const { sectionHref } = useCompanyPage()
  const copy: Record<AreaKey, { title: string; empty: string; link: string }> = {
    seo: { title: "Get found on Google search", empty: "Build your marketing to see what to fix in search.", link: "See SEO" },
    "google-ads": { title: "Ads on Google search and maps", empty: "Set up and managed for you on a Growth plan.", link: "See Google Ads" },
    "business-profile": { title: "Show up on Google Maps", empty: "Build your marketing to check your Google Business Profile.", link: "See Business Profile" },
    reviews: { title: "What customers say about you", empty: "Build your marketing to see your reviews.", link: "See Reviews" },
    social: { title: "Your social media", empty: "Plan posts and reply to messages in one place.", link: "Open Social Media" },
  }
  const pick = area === "seo" ? seoItems : area === "reviews" ? reviewItems : area === "business-profile" ? profileItems : null
  const items = report && pick ? pick(report).slice(0, 3) : []
  const { title, empty, link } = copy[area]
  return (
    <section aria-label={title} className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {items.length ? (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="py-3">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{report && pick ? "Nothing to fix here right now." : empty}</p>
      )}
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link href={sectionHref(area)}>{link}</Link>
      </Button>
    </section>
  )
}

/** Insights: the whole newest scan, with next steps, opportunities and the market. */
export function InsightsSection() {
  const { company, admin } = useCompanyPage()
  const { latest, error, refresh } = useLatestScan()
  if (latest === undefined) return <LoadingCards />
  if (!latest) return error ? <ErrorNote message={error} /> : <SetUpFirst />
  return (
    <ReportView
      key={latest.id}
      companyId={company.id}
      details={{ name: company.name, logoUrl: company.logoUrl, website: company.website, industry: company.industry, description: company.description, targetCustomers: company.targetCustomers, location: company.location }}
      onSave={admin?.onUpdateCompany}
      reportId={latest.id}
      onScanned={refresh}
    />
  )
}

function allItems(report: PulseReport) {
  return [...report.attention, ...report.opportunities, ...report.online, ...report.changes, ...report.market]
}

const MAPS = /google business|business profile|google maps|\bmaps?\b|listing|opening hours|directions/i
const REVIEWS = /review|rating|stars?\b|testimonial|reputation/i

function seoItems(report: PulseReport) {
  return allItems(report).filter((item) => ["seo", "technical", "website", "page"].includes(item.icon) && !MAPS.test(`${item.title} ${item.detail}`))
}
function reviewItems(report: PulseReport) {
  return allItems(report).filter((item) => item.icon === "reputation" || REVIEWS.test(`${item.title} ${item.detail}`))
}
function profileItems(report: PulseReport) {
  return allItems(report).filter((item) => MAPS.test(`${item.title} ${item.detail} ${item.source ?? ""}`))
}

function ItemList({ items, empty }: { items: PulseItem[]; empty: string }) {
  if (!items.length) return <p className="mt-6 rounded-2xl bg-muted/50 p-6 text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-2xl bg-muted/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            {item.badge && <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{item.badge.label}</span>}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
          {item.more && <p className="mt-2 text-sm leading-relaxed text-foreground">{item.more}</p>}
          {item.source && (
            item.source.startsWith("http") ? (
              <a href={item.source} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline">
                <span className="truncate">{item.source.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
              </a>
            ) : <p className="mt-2 text-xs text-muted-foreground">{item.source}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

function ScanPage({ pick, empty }: { pick: (report: PulseReport) => PulseItem[]; empty: string }) {
  const { latest, error } = useLatestScan()
  if (latest === undefined) return <LoadingCards />
  if (!latest) return error ? <ErrorNote message={error} /> : <SetUpFirst />
  return <ItemList items={pick(latest.report)} empty={empty} />
}

export const SeoSection = () => <ScanPage pick={seoItems} empty="Nothing to fix in search right now." />
export const ReviewsSection = () => <ScanPage pick={reviewItems} empty="No review findings in the latest scan." />
export const BusinessProfileSection = () => <ScanPage pick={profileItems} empty="No Business Profile findings in the latest scan." />

/** Google Ads isn't part of the scan yet: what it covers, and how to get it. */
export function GoogleAdsSection() {
  const { company } = useCompanyPage()
  const points = ["Campaigns built around your goals", "Spend and results in one view", "Monthly tuning to lower your costs"]
  return (
    <section aria-label="Google Ads" className="mx-auto mt-6 max-w-xl rounded-2xl bg-muted/50 p-6 sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <BadgeDollarSign className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm leading-relaxed text-foreground">Ads on Google search and maps, set up and managed for you.</p>
      <ul className="mt-4 space-y-2">
        {points.map((point) => (
          <li key={point} className="flex gap-2 text-sm text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-muted-foreground">Included with a Growth plan.</p>
      <Button asChild size="sm" className="mt-3">
        <Link href={`/${encodeURIComponent(company.slug || company.id)}/pricing/growth`}>Get started</Link>
      </Button>
    </section>
  )
}

