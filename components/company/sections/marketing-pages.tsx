"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { BadgeDollarSign, Check, ExternalLink } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { FIELDS, type BusinessDetails } from "@/components/company/pulse-intro"
import { ReportView } from "@/components/company/pulse"
import { SocialAccounts } from "@/components/company/social-accounts"
import { GoogleConnections } from "@/components/company/sections/marketing-connect"
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
/** Google accounts the company linked for tracking, by key, e.g. { ga4: "G-ABC123" }. */
export type Connections = Record<string, string>
/** Brand details from Marketing Settings, by field key. */
export type BrandDetails = Record<string, string>

// Shared across the Marketing pages, so moving between them doesn't reload the scan.
const latestCache = new Map<string, Promise<{ latest: Latest; connections: Connections; brand: BrandDetails }>>()

export function useMarketingApi(companyId: string) {
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

/** The newest scan for the company (null when there is none yet), and its linked Google accounts. */
export function useLatestScan() {
  const { company } = useCompanyPage()
  const { call, ready, signedOut } = useMarketingApi(company.id)
  const [latest, setLatest] = useState<Latest | undefined>(undefined)
  const [connections, setConnections] = useState<Connections>({})
  const [brand, setBrand] = useState<BrandDetails>({})
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
      request = (async () => {
        const { reports, connections: linked, brand: saved } = (await call()) as { reports: PulseReportSummary[]; connections?: Connections; brand?: BrandDetails }
        if (!reports.length) return { latest: null, connections: linked ?? {}, brand: saved ?? {} }
        const state = (await call(undefined, { reportId: reports[0].id })) as PulseState
        return { latest: state.report ? { id: reports[0].id, report: state.report } : null, connections: linked ?? {}, brand: saved ?? {} }
      })()
      latestCache.set(company.id, request)
      request.catch(() => latestCache.delete(company.id))
    }
    request
      .then((value) => {
        if (!active) return
        setLatest(value.latest)
        setConnections(value.connections)
        setBrand(value.brand)
      })
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

  // Saves a linked account and shows it at once.
  const link = useCallback(async (key: string, value: string) => {
    await call({ body: { action: "connection", connection: key, value } })
    latestCache.delete(company.id)
    setConnections((current) => {
      const next = { ...current }
      if (value.trim()) next[key] = value.trim()
      else delete next[key]
      return next
    })
  }, [call, company.id])

  const saveBrand = useCallback(async (patch: BrandDetails) => {
    await call({ body: { action: "brand", details: patch } })
    latestCache.delete(company.id)
    setBrand((current) => ({ ...current, ...patch }))
  }, [call, company.id])

  return { latest, connections, brand, error, refresh, call, link, saveBrand }
}

// Details saved on Settings this visit, so Home shows them without reloading the company.
const savedDetails = new Map<string, Partial<BusinessDetails>>()

/** The business details Marketing works from, and how to save them. */
export function useBusinessDetails() {
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

export function ErrorNote({ message }: { message: string }) {
  return <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{message}</p>
}

export function LoadingCards() {
  return (
    <div className="mt-6 space-y-3" role="status" aria-label="Loading">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
    </div>
  )
}

/** The business basics, as one form. */
function BusinessDetailsForm() {
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
    <form onSubmit={submit} className="space-y-4">
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

const BRAND_FIELDS: { key: string; label: string; placeholder: string; long?: boolean; help?: string }[] = [
  { key: "keywords", label: "Keywords", placeholder: "e.g. bakery in Lekki, birthday cakes, wedding cakes", long: true, help: "The searches you want customers to find you with. Separate with commas." },
  { key: "serviceAreas", label: "Service areas", placeholder: "e.g. Lekki, Victoria Island, Ikoyi" },
  { key: "products", label: "Products and services", placeholder: "What you sell, one per line", long: true },
  { key: "competitors", label: "Competitors", placeholder: "Names or websites, separated by commas", long: true },
  { key: "sellingPoints", label: "What makes you different", placeholder: "e.g. Same-day delivery, 10 years in business", long: true },
  { key: "brandVoice", label: "Brand voice", placeholder: "e.g. Friendly and warm" },
  { key: "goals", label: "Goals", placeholder: "e.g. More calls and more walk-ins" },
  { key: "adBudget", label: "Monthly ad budget", placeholder: "e.g. ₦200,000" },
]

function BrandDetailsForm({ brand, onSave }: { brand: BrandDetails; onSave: (patch: BrandDetails) => Promise<void> }) {
  const [draft, setDraft] = useState<BrandDetails>(brand)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: "good" | "bad"; text: string } | null>(null)
  useEffect(() => { setDraft(brand) }, [brand])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      await onSave(Object.fromEntries(BRAND_FIELDS.map((field) => [field.key, draft[field.key] ?? ""])))
      setNotice({ tone: "good", text: "Saved." })
    } catch {
      setNotice({ tone: "bad", text: "Could not save. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {BRAND_FIELDS.map((field) => (
        <label key={field.key} className="block">
          <span className="text-sm font-medium text-foreground">{field.label}</span>
          {field.long ? (
            <Textarea value={draft[field.key] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} rows={3} className="mt-1.5" />
          ) : (
            <Input value={draft[field.key] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} className="mt-1.5" />
          )}
          {field.help && <span className="mt-1.5 block text-xs text-muted-foreground">{field.help}</span>}
        </label>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        <span aria-live="polite" className={notice?.tone === "bad" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{notice?.text}</span>
      </div>
    </form>
  )
}

function SettingsBlock({ id, title, text, children }: { id: string; title: string; text: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Settings: connections, business basics and brand details, in one place. */
export function MarketingSettingsSection() {
  const { company } = useCompanyPage()
  const { latest, connections, brand, link, saveBrand } = useLatestScan()
  return (
    <div className="mx-auto mt-6 max-w-2xl space-y-5">
      <SettingsBlock id="marketing-connections" title="Connections" text="Connect your accounts so we can post for you and track how you're doing.">
        <SocialAccounts companyId={company.id} />
        <GoogleConnections connections={connections} loading={latest === undefined} onSave={link} />
      </SettingsBlock>
      <SettingsBlock id="marketing-business" title="Business details" text="The basics about your business.">
        <BusinessDetailsForm />
      </SettingsBlock>
      <SettingsBlock id="marketing-brand" title="Brand details" text="The more you tell us, the more your marketing fits your business.">
        <BrandDetailsForm brand={brand} onSave={saveBrand} />
      </SettingsBlock>
    </div>
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

export function seoItems(report: PulseReport) {
  return allItems(report).filter((item) => ["seo", "technical", "website", "page"].includes(item.icon) && !MAPS.test(`${item.title} ${item.detail}`))
}
export function reviewItems(report: PulseReport) {
  return allItems(report).filter((item) => item.icon === "reputation" || REVIEWS.test(`${item.title} ${item.detail}`))
}
export function profileItems(report: PulseReport) {
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

