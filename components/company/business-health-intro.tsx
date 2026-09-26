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
  { key: "website", icon: PanelsTopLeft, title: "Your website", detail: "Pages, content, structure, products and messaging", box: "bg-violet-100 dark:bg-violet-950/50", tint: "text-violet-600 dark:text-violet-400" },
  { key: "search", icon: Search, title: "Search visibility", detail: "SEO, keywords and how easy you are to find", box: "bg-emerald-100 dark:bg-emerald-950/50", tint: "text-emerald-600 dark:text-emerald-400" },
  { key: "competitors", icon: Trophy, title: "Competitors", detail: "Positioning, recent activity and market trends", box: "bg-red-100 dark:bg-red-950/50", tint: "text-red-500 dark:text-red-400" },
  { key: "market", icon: BarChart3, title: "Market opportunities", detail: "Events, partners, tenders, grants and more", box: "bg-amber-100 dark:bg-amber-950/50", tint: "text-amber-600 dark:text-amber-400" },
  { key: "technical", icon: ShieldCheck, title: "Technical health", detail: "Speed, broken pages and best practices", box: "bg-blue-100 dark:bg-blue-950/50", tint: "text-blue-600 dark:text-blue-400" },
  { key: "presence", icon: TrendingUp, title: "Your online presence", detail: "Brand mentions, content and reputation", box: "bg-emerald-100 dark:bg-emerald-950/50", tint: "text-emerald-600 dark:text-emerald-400" },
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

/** First step of Business Health: confirm the details the scan will use, then start it. */
export function BusinessHealthIntro({
  details,
  onSave,
  onAnalyse,
  scanning,
  step,
}: {
  details: BusinessDetails
  onSave?: (patch: Partial<BusinessDetails>) => Promise<void>
  onAnalyse: () => void
  scanning: boolean
  /** How many areas the running scan has finished. */
  step: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<BusinessDetails>(details)
  const [saving, setSaving] = useState(false)
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
    <section className="mt-5 space-y-3 sm:space-y-4">
      {/* Hero */}
      <div className="flex items-center gap-4 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-violet-50 to-sky-50 p-4 sm:gap-6 sm:p-7 dark:border-border dark:from-rose-950/30 dark:via-violet-950/20 dark:to-sky-950/30">
        <Logo name={details.name} logoUrl={details.logoUrl} className="size-16 sm:size-28" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Business health</p>
          <h2 data-weight="bold" className="mt-1 text-xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
            Let&apos;s understand {details.name}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            We&apos;ll use the information in your record and analyse your website to give you insights, opportunities and recommendations.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Business details */}
        <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 data-weight="bold" className="text-lg font-bold tracking-[-0.01em] text-foreground">Business details</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">We&apos;ll use this to understand your business.</p>
            </div>
            {onSave && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Edit details
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

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
                  <div key={field.key} className="grid grid-cols-[1.25rem_1fr] items-start gap-x-3 gap-y-0.5 py-3 sm:grid-cols-[1.25rem_9rem_1fr]">
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
        </div>

        {/* What we'll analyse, which doubles as scan progress. */}
        <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
          <h3 data-weight="bold" className="text-lg font-bold tracking-[-0.01em] text-foreground">
            {scanning ? "Analysing…" : "What we'll analyse"}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {scanning
              ? "Crawling your website and public sources. This takes a minute."
              : "We'll crawl your website and public sources to understand:"}
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {ANALYSE_AREAS.map((area, index) => {
              const done = scanning && index < step
              const active = scanning && index === step
              return (
                <li key={area.key} className={cn("flex items-start gap-3 transition-opacity", scanning && !done && !active && "opacity-50")}>
                  <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", area.box)}>
                    {done ? (
                      <Check className={cn("size-5", area.tint)} aria-hidden="true" />
                    ) : active ? (
                      <Loader2 className={cn("size-5 animate-spin", area.tint)} aria-hidden="true" />
                    ) : (
                      <area.icon className={cn("size-5", area.tint)} aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{area.title}</p>
                    <p className="text-sm leading-5 text-muted-foreground">{area.detail}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Start */}
      <div className="rounded-2xl border border-border bg-background p-4 text-center sm:p-5">
        <Button
          type="button"
          size="lg"
          onClick={onAnalyse}
          disabled={scanning || editing}
          className="h-12 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90 sm:mx-auto sm:max-w-md"
        >
          {scanning ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-5" aria-hidden="true" />}
          {scanning ? "Analysing your business…" : "Analyse my business"}
        </Button>
        <p className="mt-2.5 text-sm text-muted-foreground">
          {missing
            ? "Add your website for the best results. We'll still check public sources."
            : "This will scan your website and build your business intelligence."}
        </p>
      </div>
    </section>
  )
}
