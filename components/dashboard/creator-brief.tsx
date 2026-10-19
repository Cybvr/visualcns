"use client"

import { useEffect, useState, type ReactNode } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  BRIEF_AGES,
  BRIEF_COUNTRIES,
  BRIEF_CURRENCIES,
  BRIEF_FOLLOWERS,
  BRIEF_GENDERS,
  BRIEF_GOALS,
  BRIEF_INTERESTS,
  BRIEF_PAYMENT_METHODS,
  BRIEF_PLATFORMS,
  contentSummary,
  creatorSummary,
  formatBriefDate,
  formatOffer,
  goalLabel,
  pickCreatorDefaults,
  resolveBrief,
  type CreatorBrief,
  type CreatorDefaults,
} from "@/lib/campaign-brief"
import { getOrganization, updateOrganization } from "@/lib/organizations"
import { updateProject, type Project } from "@/lib/projects"

type Patch = (patch: Partial<CreatorBrief>) => void

/** The campaign's creator brief on the Brief tab. Starts from the client's defaults until it's saved. */
export function CreatorBriefForm({ project, canEdit, onPatched }: { project: Project; canEdit: boolean; onPatched?: (patch: Partial<Project>) => void }) {
  const [defaults, setDefaults] = useState<Partial<CreatorDefaults> | null>(null)
  const saved = resolveBrief(project.brief, defaults)
  const [draft, setDraft] = useState<CreatorBrief>(saved)
  const [saving, setSaving] = useState(false)
  const savedKey = JSON.stringify(saved)

  useEffect(() => {
    if (!project.companyId) return
    let active = true
    getOrganization(project.companyId)
      .then((org) => { if (active) setDefaults(org?.creatorDefaults ?? null) })
      .catch(() => undefined)
    return () => { active = false }
  }, [project.companyId])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(saved), [savedKey])

  const dirty = JSON.stringify(draft) !== savedKey || !project.brief
  const set: Patch = (patch) => setDraft((current) => ({ ...current, ...patch }))

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const brief = { ...draft, contentDetails: draft.contentDetails.trim() }
      await updateProject(project.id, { brief })
      onPatched?.({ brief })
      toast.success("Saved")
    } catch (error) {
      console.error("Error saving creator brief:", error)
      toast.error("That didn't save.")
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) return project.brief ? <CreatorBriefSummary brief={saved} /> : <p className="text-[15px] text-muted-foreground">Not written yet.</p>

  return (
    <div className="space-y-6">
      <CampaignFields value={draft} onChange={set} />
      <CreatorFields value={draft} onChange={set} />
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="button" onClick={() => void save()} disabled={!dirty || saving}>{saving ? "Saving…" : "Save brief"}</Button>
        {JSON.stringify(draft) !== savedKey && <Button type="button" variant="ghost" onClick={() => setDraft(saved)}>Cancel</Button>}
      </div>
    </div>
  )
}

/** The client's creator defaults, in their settings. Saved as each one changes. */
export function CreatorDefaultsForm({ companyId, saved, onSaved }: { companyId: string; saved?: Partial<CreatorDefaults>; onSaved?: () => Promise<void> | void }) {
  const [draft, setDraft] = useState<CreatorBrief>(() => resolveBrief(null, saved))
  const savedKey = JSON.stringify(saved ?? {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(resolveBrief(null, saved)), [savedKey])

  const set: Patch = (patch) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    void updateOrganization(companyId, { creatorDefaults: pickCreatorDefaults(next) })
      .then(() => onSaved?.())
      .catch((error) => {
        console.error("Error saving creator defaults:", error)
        toast.error("That didn't save.")
      })
  }

  return (
    <div className="space-y-4">
      <Pick label="Platform" value={draft.platform} options={BRIEF_PLATFORMS} onChange={(platform) => set({ platform })} />
      <CreatorFields value={draft} onChange={set} compact />
    </div>
  )
}

function CampaignFields({ value, onChange }: { value: CreatorBrief; onChange: Patch }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Pick label="Platform" value={value.platform} options={BRIEF_PLATFORMS} onChange={(platform) => onChange({ platform })} />
        <Pick label="Goal" value={value.goal} options={BRIEF_GOALS} onChange={(goal) => onChange({ goal })} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch id="brief-fixed-offer" checked={value.fixedOffer} onCheckedChange={(fixedOffer) => onChange({ fixedOffer })} />
          <Label htmlFor="brief-fixed-offer">Fixed offer</Label>
        </div>
        {value.fixedOffer && (
          <div className="flex gap-2">
            <Select value={value.currency} onValueChange={(currency) => onChange({ currency })}>
              <SelectTrigger className="w-28" aria-label="Currency"><SelectValue /></SelectTrigger>
              <SelectContent>{BRIEF_CURRENCIES.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={value.offerAmount || ""}
              onChange={(event) => onChange({ offerAmount: Math.max(0, Math.round(Number(event.target.value) || 0)) })}
              placeholder="Amount per creator"
              aria-label="Amount per creator"
            />
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium">Content to create</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Count label="Story" value={value.stories} onChange={(stories) => onChange({ stories })} />
          <Count label="Post" value={value.posts} onChange={(posts) => onChange({ posts })} />
          <Count label="Reel" value={value.reels} onChange={(reels) => onChange({ reels })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="brief-content-details">Content details</Label>
        <Textarea
          id="brief-content-details"
          rows={6}
          maxLength={1000}
          value={value.contentDetails}
          onChange={(event) => onChange({ contentDetails: event.target.value })}
          placeholder="What to film, what to say, what to avoid, and where to send people."
          className="text-[15px] leading-7"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <DateField label="Register interest by" value={value.registerBy} onChange={(registerBy) => onChange({ registerBy })} />
        <DateField label="Post from" value={value.postFrom} onChange={(postFrom) => onChange({ postFrom })} />
        <DateField label="Post until" value={value.postTo} min={value.postFrom} onChange={(postTo) => onChange({ postTo })} />
      </div>
    </div>
  )
}

function CreatorFields({ value, onChange, compact = false }: { value: CreatorBrief; onChange: Patch; compact?: boolean }) {
  return (
    <div className="space-y-4">
      {!compact && <p className="text-sm font-medium">Creators</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Pick label="Gender" value={value.gender} options={BRIEF_GENDERS} onChange={(gender) => onChange({ gender })} />
        <Pick label="Age" value={value.age} options={BRIEF_AGES} onChange={(age) => onChange({ age })} />
        <Pick label="Followers" value={value.followers} options={BRIEF_FOLLOWERS} onChange={(followers) => onChange({ followers })} />
      </div>
      <Chips label="Interests" values={value.interests} options={BRIEF_INTERESTS} onChange={(interests) => onChange({ interests })} />
      <Chips label="Countries" values={value.countries} options={BRIEF_COUNTRIES} onChange={(countries) => onChange({ countries })} allowNew />
      <div className="grid gap-4 sm:grid-cols-2">
        <Pick label="Payment method" value={value.paymentMethod} options={BRIEF_PAYMENT_METHODS} onChange={(paymentMethod) => onChange({ paymentMethod })} />
        <div className="flex items-center gap-2 sm:pt-7">
          <Switch id={compact ? "defaults-paid-ads" : "brief-paid-ads"} checked={value.paidAds} onCheckedChange={(paidAds) => onChange({ paidAds })} />
          <Label htmlFor={compact ? "defaults-paid-ads" : "brief-paid-ads"}>Featured in paid ads</Label>
        </div>
      </div>
    </div>
  )
}

/** What creators and the client see: the brief as plain facts. */
export function CreatorBriefSummary({ brief }: { brief: CreatorBrief }) {
  const content = contentSummary(brief)
  const who = creatorSummary(brief)
  const dates = brief.postFrom || brief.postTo
    ? [formatBriefDate(brief.postFrom), formatBriefDate(brief.postTo)].filter(Boolean).join(" to ")
    : ""
  return (
    <div className="space-y-5">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Fact label="Platform">{brief.platform}</Fact>
        <Fact label="Goal">{goalLabel(brief.goal)}</Fact>
        <Fact label="Offer">{formatOffer(brief)}</Fact>
        {content && <Fact label="Content">{content}</Fact>}
        {brief.registerBy && <Fact label="Register interest by">{formatBriefDate(brief.registerBy)}</Fact>}
        {dates && <Fact label="Post between">{dates}</Fact>}
        <Fact label="Creators">{who || "Open to anyone"}</Fact>
        <Fact label="Payment">{brief.paymentMethod}{brief.paidAds ? ". Content may run as a paid ad." : ""}</Fact>
      </dl>
      {brief.contentDetails && <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{brief.contentDetails}</p>}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px] text-foreground">{children}</dd>
    </div>
  )
}

function Pick({ label, value, options, onChange }: {
  label: string
  value: string
  options: readonly string[] | readonly { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const items = options.map((option) => (typeof option === "string" ? { value: option, label: option } : option))
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>{items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}

function Count({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" min={0} max={20} value={value} onChange={(event) => onChange(Math.min(Math.max(Math.round(Number(event.target.value) || 0), 0), 20))} aria-label={label} />
    </div>
  )
}

function DateField({ label, value, min, onChange }: { label: string; value: string; min?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="date" value={value} min={min || undefined} onChange={(event) => onChange(event.target.value)} aria-label={label} />
    </div>
  )
}

/** Pick from a list to add a chip; the x takes it off. */
function Chips({ label, values, options, onChange, allowNew = false }: {
  label: string
  values: string[]
  options: readonly string[]
  onChange: (values: string[]) => void
  allowNew?: boolean
}) {
  const remaining = options.filter((option) => !values.includes(option)).map((option) => ({ value: option, label: option }))
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pr-1.5 pl-3 text-sm">
              {item}
              <button type="button" onClick={() => onChange(values.filter((value) => value !== item))} className="rounded-full p-0.5 hover:bg-background" aria-label={`Remove ${item}`}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Combobox
        options={remaining}
        value=""
        onChange={(item) => item && !values.includes(item) && onChange([...values, item])}
        onCreate={allowNew ? async (name) => ({ value: name, label: name }) : undefined}
        createLabel={(query) => `Add “${query}”`}
        placeholder={`Add ${label.toLowerCase()}`}
        searchPlaceholder="Search…"
      />
    </div>
  )
}
