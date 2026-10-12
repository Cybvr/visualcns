"use client"

import { useEffect, useState } from "react"
import {
  BarChart3,
  Building2,
  Check,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MapPin,
  PanelsTopLeft,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type BusinessDetails = {
  name: string
  logoUrl?: string
  website?: string
  industry?: string
  description?: string
  targetCustomers?: string
  location?: string
}

type Field = { key: keyof BusinessDetails; label: string; icon: LucideIcon; long?: boolean; placeholder: string }

const FIELDS: Field[] = [
  { key: "name", label: "Business name", icon: Building2, placeholder: "Business name" },
  { key: "website", label: "Website", icon: Globe, placeholder: "https://example.com" },
  { key: "industry", label: "Industry", icon: Tag, placeholder: "e.g. Marketing & Technology" },
  { key: "description", label: "About", icon: FileText, long: true, placeholder: "What the business does" },
  { key: "targetCustomers", label: "Target customers", icon: Users, placeholder: "e.g. Small businesses, marketing teams" },
  { key: "location", label: "Location", icon: MapPin, placeholder: "e.g. Lagos, Nigeria" },
]

export const ANALYSE_AREAS: { key: string; icon: LucideIcon; title: string; detail: string; box: string; tint: string }[] = [
  { key: "website", icon: PanelsTopLeft, title: "Your Website", detail: "Pages, structure, products, and messaging", box: "bg-violet-100 dark:bg-violet-950/50", tint: "text-violet-600 dark:text-violet-400" },
  { key: "search", icon: Search, title: "Search Visibility", detail: "SEO, keywords, and findability", box: "bg-emerald-100 dark:bg-emerald-950/50", tint: "text-emerald-600 dark:text-emerald-400" },
  { key: "competitors", icon: Trophy, title: "Competitors", detail: "Market positioning, activity, and trends", box: "bg-red-100 dark:bg-red-950/50", tint: "text-red-500 dark:text-red-400" },
  { key: "market", icon: BarChart3, title: "Market Opportunities", detail: "Events, partners, tenders, and grants", box: "bg-amber-100 dark:bg-amber-950/50", tint: "text-amber-600 dark:text-amber-400" },
  { key: "technical", icon: ShieldCheck, title: "Technical Health", detail: "Speed, broken pages, and best practices", box: "bg-blue-100 dark:bg-blue-950/50", tint: "text-blue-600 dark:text-blue-400" },
  { key: "presence", icon: TrendingUp, title: "Online Presence", detail: "Brand mentions, content, and reputation", box: "bg-emerald-100 dark:bg-emerald-950/50", tint: "text-emerald-600 dark:text-emerald-400" },
]

const SAMPLE_SCORES = [
  { label: "Website", score: 78 },
  { label: "Search", score: 54 },
  { label: "Technical", score: 66 },
  { label: "Reputation", score: 82 },
]
function hrefFor(url: string) {
  return url.startsWith("http") ? url : `https://${url}`
}

export function Logo({ name, logoUrl, className }: { name: string; logoUrl?: string; className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-background shadow-sm ring-4 ring-background/60", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-2xl font-semibold text-foreground">{name.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  )
}

/** First step of Pulse: confirm the details the scan will use, then start it. */
export function PulseIntro({
  details,
  onSave,
  onAnalyse,
  onBack,
  scanning,
  step,
}: {
  details: BusinessDetails
  onSave?: (patch: Partial<BusinessDetails>) => Promise<void>
  onAnalyse: () => void
  /** Present once a report exists, to return to it without scanning. */
  onBack?: () => void
  scanning: boolean
  /** How many areas the running scan has finished. */
  step: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<BusinessDetails>(details)
  const [saving, setSaving] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!editing) setDraft(details)
  }, [details, editing])

  async function save() {
    if (!onSave) return
    if (!draft.name.trim()) {
      setError("Business name is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const patch: Partial<BusinessDetails> = {}
      for (const field of FIELDS) {
        if (field.key === "logoUrl") continue
        const next = (draft[field.key] ?? "").trim()
        if (next !== (details[field.key] ?? "")) patch[field.key] = next
      }
      if (Object.keys(patch).length) await onSave(patch)
      setEditing(false)
    } catch {
      setError("Could not save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const missing = !details.website

  return (
    <section className="mt-5 grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Pitch: what Pulse does, with a sample of the report. */}
      <div className="flex flex-col rounded-3xl bg-[linear-gradient(160deg,var(--primary),color-mix(in_oklch,var(--primary)_55%,black))] p-5 text-white sm:p-7">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
          <span className="size-2 rounded-full bg-cyan-300" aria-hidden="true" />
          VisualCNS Reports
        </span>
        <h2 data-weight="bold" className="mt-6 max-w-sm text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl">
          See how your business shows up online.
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/80 sm:text-base">
          One scan checks your website, search, competitors and reputation, then tells you what to fix first.
        </p>
        <svg viewBox="0 0 600 90" className="my-8 h-16 w-full text-teal-300 sm:h-20" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 50 H270 L292 8 L320 82 L342 50 H470 L490 28 L512 62 L526 50 H600" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-auto rounded-2xl bg-white p-4 text-foreground sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Sample report</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Example</p>
          </div>
          <dl className="mt-3 space-y-2.5">
            {SAMPLE_SCORES.map((row) => (
              <div key={row.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)_1.75rem] items-center gap-3 text-sm">
                <dt>{row.label}</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${row.score}%` }} /></dd>
                <dd className="text-right font-semibold tabular-nums">{row.score}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Start: what we check, which doubles as scan progress. */}
      <div className="flex flex-col rounded-3xl border border-border bg-background p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 data-weight="bold" className="text-2xl font-bold tracking-[-0.02em] text-foreground">Analyse {details.name}</h2>
            <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
              {scanning ? "Crawling your website and public sources. This takes a minute or two." : "We review your website and public data, then give you clear insights, opportunities and next steps."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn("hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium sm:inline-flex", missing ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
              {missing ? "Add website" : <><Check className="size-4" aria-hidden="true" /> Ready</>}
            </span>
            <Button type="button" onClick={() => setDetailsOpen(true)}>
              <Check className="size-4" aria-hidden="true" /> Check
            </Button>
          </div>
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What we check</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {ANALYSE_AREAS.map((area, index) => {
            const done = scanning && index < step
            const active = scanning && index === step
            return (
              <li key={area.key} className={cn("flex items-start gap-3 rounded-2xl border border-border p-4 transition-opacity", scanning && !done && !active && "opacity-50")}>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                  {done ? <Check className="size-5" /> : active ? <Loader2 className="size-5 animate-spin" /> : <area.icon className="size-5" />}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{area.title}</p>
                  <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{area.detail}</p>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-6">
          <Button
            type="button"
            size="lg"
            onClick={onAnalyse}
            disabled={scanning || editing}
            className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {scanning ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-5" aria-hidden="true" />}
            {scanning ? "Analysing your business…" : onBack ? "Run a new analysis" : "Analyse my business"}
          </Button>
          {onBack && !scanning && (
            <Button type="button" variant="ghost" onClick={onBack} className="mt-2 w-full">
              Back to the report
            </Button>
          )}
          {missing && (
            <p className="mt-2.5 text-center text-sm text-muted-foreground">Add your website for the best results. We&apos;ll still check public sources.</p>
          )}
        </div>
      </div>

      {/* Business details, in a modal opened from Check. */}
      <Dialog open={detailsOpen} onOpenChange={(open) => { setDetailsOpen(open); if (!open) { setEditing(false); setError("") } }}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Business details</DialogTitle>
            <DialogDescription>We&apos;ll use this to understand your business.</DialogDescription>
          </DialogHeader>
          {onSave && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Edit details
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          )}
          {editing ? (
            <div className="mt-4 space-y-3">
              {FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-sm text-muted-foreground">{field.label}</span>
                  {field.long ? (
                    <Textarea
                      value={draft[field.key] ?? ""}
                      onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                      placeholder={field.placeholder}
                      rows={3}
                      className="mt-1"
                    />
                  ) : (
                    <Input
                      value={draft[field.key] ?? ""}
                      onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                      placeholder={field.placeholder}
                      className="mt-1"
                    />
                  )}
                </label>
              ))}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => { setEditing(false); setError("") }} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void save()} disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <dl className="mt-3 divide-y divide-border">
              {FIELDS.map((field) => {
                const value = details[field.key]?.trim()
                return (
                  <div key={field.key} className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 py-3 sm:grid-cols-[1.25rem_9rem_minmax(0,1fr)]">
                    <field.icon className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
                    <dt className="text-sm text-muted-foreground sm:mt-0.5">{field.label}</dt>
                    <dd className={cn("col-start-2 flex min-w-0 items-start gap-2 sm:col-start-3", value ? "text-foreground" : "text-muted-foreground")}>
                      <span className="min-w-0 flex-1 break-words">{value || "Not specified"}</span>
                      {field.key === "website" && value && (
                        <a href={hrefFor(value)} target="_blank" rel="noreferrer" aria-label="Open website" className="shrink-0 text-muted-foreground hover:text-foreground">
                          <ExternalLink className="size-4" aria-hidden="true" />
                        </a>
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}