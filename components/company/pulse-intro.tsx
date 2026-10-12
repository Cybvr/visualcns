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
    <section className="mt-4 rounded-2xl bg-gradient-to-br from-primary to-primary/75 p-4 text-primary-foreground sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-primary-foreground">Analyse {details.name}</h2>
          <p className="mt-1 max-w-2xl text-sm text-primary-foreground/80">
            {scanning ? "Scanning your website and public sources…" : "Check your website, search presence, competitors and reputation."}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setDetailsOpen(true)} className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
          <Pencil className="size-4" aria-hidden="true" />
          Details
        </Button>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 sm:grid-cols-3">
        {ANALYSE_AREAS.map((area, index) => {
          const done = scanning && index < step
          const active = scanning && index === step
          return (
            <li key={area.key} className={cn("flex min-w-0 items-center gap-2 border-b border-primary-foreground/20 py-2.5 transition-opacity", scanning && !done && !active && "opacity-50")}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground" aria-hidden="true">
                {done ? <Check className="size-4 text-primary-foreground" /> : active ? <Loader2 className="size-4 animate-spin text-primary-foreground" /> : <area.icon className="size-4" />}
              </span>
              <span className="truncate text-sm font-medium text-primary-foreground">{area.title}</span>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        {missing && <p className="text-sm text-primary-foreground/80">Add a website in Details for better results.</p>}
        <div className="flex gap-2 sm:ml-auto">
          {onBack && !scanning && (
            <Button type="button" variant="ghost" onClick={onBack} className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              Back
            </Button>
          )}
          <Button type="button" onClick={onAnalyse} disabled={scanning || editing} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 max-sm:flex-1">
            {scanning && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {scanning ? "Analysing…" : onBack ? "Run new analysis" : "Analyse business"}
          </Button>
        </div>
      </div>

      {/* Business details, opened from the compact Details action. */}
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
