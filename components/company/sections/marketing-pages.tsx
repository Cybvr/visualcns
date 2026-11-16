"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { BadgeDollarSign, Check, ExternalLink, Lightbulb, Search, Star, Store } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { ANALYSE_AREAS, PulseIntro, type BusinessDetails } from "@/components/company/pulse-intro"
import { ReportView } from "@/components/company/pulse"
import { Button } from "@/components/ui/button"
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

/** Shown on a Marketing page before the first scan. */
function SetUpFirst() {
  const { sectionHref } = useCompanyPage()
  return (
    <section className="mx-auto mt-6 max-w-xl rounded-2xl bg-muted/50 p-6 text-sm sm:p-8">
      <p className="text-foreground">Add your business details on Marketing Overview to fill this page.</p>
      <Button asChild size="sm" className="mt-4">
        <Link href={sectionHref("marketing")}>Get started</Link>
      </Button>
    </section>
  )
}

/** Overview: the business details Marketing works from, and the button that builds it. */
export function MarketingOverviewSection() {
  const { company, admin, sectionHref } = useCompanyPage()
  const { latest, error: loadError, refresh, call } = useLatestScan()
  const [details, setDetails] = useState<BusinessDetails>({
    name: company.name,
    logoUrl: company.logoUrl,
    website: company.website,
    industry: company.industry,
    description: company.description,
    targetCustomers: company.targetCustomers,
    location: company.location,
  })
  const [scanning, setScanning] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState("")
  const progress = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (progress.current) clearInterval(progress.current) }, [])

  // Agency admins save straight to the company; the company's own people save through the server.
  async function save(patch: Partial<BusinessDetails>) {
    if (admin) await admin.onUpdateCompany(patch)
    else await call({ body: { action: "details", details: patch } })
    setDetails((current) => ({ ...current, ...patch }))
  }

  async function build() {
    if (scanning) return
    setScanning(true)
    setError("")
    setStep(0)
    progress.current = setInterval(() => setStep((current) => Math.min(current + 1, ANALYSE_AREAS.length - 1)), 9000)
    try {
      await call({ body: { action: "scan" } })
      setStep(ANALYSE_AREAS.length)
      refresh()
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      if (progress.current) clearInterval(progress.current)
      setScanning(false)
    }
  }

  const report = latest?.report
  const counts = report ? {
    insights: report.actions.length,
    seo: seoItems(report).length,
    reviews: reviewItems(report).length,
    "business-profile": profileItems(report).length,
  } : null

  return (
    <div className="mt-2">
      {(error || loadError) && <ErrorNote message={error || loadError} />}
      <PulseIntro
        details={details}
        onSave={save}
        onAnalyse={() => void build()}
        scanning={scanning}
        step={step}
        title={`Marketing for ${details.name}`}
        text="Tell us about your business. We check your website, search, reviews and competitors, then build your marketing from it."
        actionLabel={latest?.report ? "Update marketing" : "Build my marketing"}
      />
      {latest === undefined ? <LoadingCards /> : report && counts && (
        <section aria-label="Your marketing" className="mt-6">
          <div className="rounded-2xl bg-muted/50 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Marketing score</p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">{report.score}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
            <p className="mt-3 text-xs text-muted-foreground">Last built {new Date(report.scannedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([
              ["insights", "Insights", Lightbulb, `${counts.insights} next steps`],
              ["seo", "SEO", Search, `${counts.seo} items`],
              ["reviews", "Reviews", Star, `${counts.reviews} items`],
              ["business-profile", "Business Profile", Store, `${counts["business-profile"]} items`],
            ] as const).map(([key, label, Icon, detail]) => (
              <Link key={key} href={sectionHref(key)} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-4 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="block text-xs text-muted-foreground">{detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
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

