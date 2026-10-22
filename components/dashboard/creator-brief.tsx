"use client"

import { useEffect, useState, type ReactNode } from "react"
import { CalendarClock, CalendarRange, Clapperboard, CreditCard, Globe, Megaphone, MessageSquareText, Smartphone, Target, Users, Wallet, X, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { SocialIcon } from "@/components/company/social-icon"
import { SettingsSection } from "@/components/dashboard/settings-section"
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

/**
 * The campaign's creator brief being edited: starts from the client's defaults
 * until it's saved. The About campaign tab saves it with its one Save button.
 */
export function useCreatorBriefDraft(project: Project) {
  const [defaults, setDefaults] = useState<Partial<CreatorDefaults> | null>(null)
  const saved = resolveBrief(project.brief, defaults)
  const [draft, setDraft] = useState<CreatorBrief>(saved)
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

  const changed = JSON.stringify(draft) !== savedKey
  return {
    saved,
    draft,
    set: ((patch) => setDraft((current) => ({ ...current, ...patch }))) as Patch,
    /** Edited, or never saved (a new campaign still showing the client's defaults). */
    dirty: changed || !project.brief,
    changed,
    reset: () => setDraft(saved),
    /** What to store on the project. */
    toSave: (): CreatorBrief => ({ ...draft, contentDetails: draft.contentDetails.trim(), questions: draft.questions.map((question) => question.trim()) }),
  }
}

/** The creator brief's settings as + / − sections; plain facts for people who can't edit. */
export function CreatorBriefForm({ project, canEdit, value, onChange }: { project: Project; canEdit: boolean; value: CreatorBrief; onChange: Patch }) {
  const draft = value
  const set = onChange
  const saved = value
  if (!canEdit) return project.brief ? <CreatorBriefSummary brief={saved} /> : <p className="text-[15px] text-muted-foreground">Not written yet.</p>

  return (
    <div>
      <SettingsSection title="Campaign" icon={Target} defaultOpen>
        <div className="space-y-4">
          <Pick label="Platform" value={draft.platform} options={BRIEF_PLATFORMS} onChange={(platform) => set({ platform })} />
          <Pick label="Goal" value={draft.goal} options={BRIEF_GOALS} onChange={(goal) => set({ goal })} />
          <OfferField value={draft} onChange={set} />
        </div>
      </SettingsSection>
      <SettingsSection title="Content" icon={Clapperboard}>
        <ContentFields value={draft} onChange={set} />
      </SettingsSection>
      <SettingsSection title="Dates" icon={CalendarRange}>
        <div className="space-y-4">
          <DateField label="Apply by" value={draft.registerBy} onChange={(registerBy) => set({ registerBy })} />
          <DateField label="Start date" value={draft.postFrom} onChange={(postFrom) => set({ postFrom })} />
          <DateField label="End date" value={draft.postTo} min={draft.postFrom} onChange={(postTo) => set({ postTo })} />
        </div>
      </SettingsSection>
      <SettingsSection title="Creators" icon={Users}>
        <div className="space-y-4">
          <Pick label="Gender" value={draft.gender} options={BRIEF_GENDERS} onChange={(gender) => set({ gender })} />
          <Pick label="Age" value={draft.age} options={BRIEF_AGES} onChange={(age) => set({ age })} />
          <Pick label="Followers" value={draft.followers} options={BRIEF_FOLLOWERS} onChange={(followers) => set({ followers })} />
          <Chips label="Interests" values={draft.interests} options={BRIEF_INTERESTS} onChange={(interests) => set({ interests })} />
          <Chips label="Countries" values={draft.countries} options={BRIEF_COUNTRIES} onChange={(countries) => set({ countries })} allowNew />
          <div className="flex items-center gap-2 pt-2">
            <Switch id="brief-show-creator-details" checked={draft.showCreatorDetails} onCheckedChange={(showCreatorDetails) => set({ showCreatorDetails })} />
            <Label htmlFor="brief-show-creator-details">Show creator details and ask for handles on the shared page</Label>
          </div>
        </div>
      </SettingsSection>
      <SettingsSection title="Payment" icon={CreditCard}>
        <div className="space-y-4">
          <Pick label="Payment method" value={draft.paymentMethod} options={BRIEF_PAYMENT_METHODS} onChange={(paymentMethod) => set({ paymentMethod })} />
          <div className="flex items-center gap-2">
            <Switch id="brief-paid-ads" checked={draft.paidAds} onCheckedChange={(paidAds) => set({ paidAds })} />
            <Label htmlFor="brief-paid-ads">Featured in paid ads</Label>
          </div>
        </div>
      </SettingsSection>
      <SettingsSection title="Application" icon={MessageSquareText}>
        <div className="space-y-4">
          {draft.questions.map((question, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`brief-question-${index}`}>Question {index + 1}</Label>
              <Input
                id={`brief-question-${index}`}
                value={question}
                maxLength={200}
                onChange={(event) => set({ questions: draft.questions.map((item, at) => (at === index ? event.target.value : item)) })}
              />
            </div>
          ))}
        </div>
      </SettingsSection>
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

function OfferField({ value, onChange }: { value: CreatorBrief; onChange: Patch }) {
  return (
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
      {value.fixedOffer && (
        <div className="flex items-center gap-2 pt-2">
          <Switch id="brief-show-offer" checked={value.showOffer} onCheckedChange={(showOffer) => onChange({ showOffer })} />
          <Label htmlFor="brief-show-offer">Show offer and payment on the shared page</Label>
        </div>
      )}
    </div>
  )
}

function ContentFields({ value, onChange }: { value: CreatorBrief; onChange: Patch }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Count label="Story" value={value.stories} onChange={(stories) => onChange({ stories })} />
        <Count label="Post" value={value.posts} onChange={(posts) => onChange({ posts })} />
        <Count label="Reel" value={value.reels} onChange={(reels) => onChange({ reels })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brief-content-details">Content details</Label>
        <Textarea
          id="brief-content-details"
          rows={6}
          maxLength={1000}
          value={value.contentDetails}
          onChange={(event) => onChange({ contentDetails: event.target.value })}
          className="text-[15px] leading-7"
        />
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

const PLATFORM_HOSTS: Record<string, string[]> = {
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
}

const PROFILE_URLS: Record<string, (username: string) => string> = {
  instagram: (username) => `https://www.instagram.com/${username}`,
  facebook: (username) => `https://www.facebook.com/${username}`,
  tiktok: (username) => `https://www.tiktok.com/@${username}`,
  youtube: (username) => `https://www.youtube.com/@${username}`,
}

/** The brand's account on a platform: a connected account first, then a saved link. */
function brandAccount(platform: string, brand?: CreatorBriefBrand) {
  const connected = brand?.accounts?.find((account) => account.platform.toLowerCase() === platform && account.username)
  if (connected) {
    const username = connected.username.replace(/^@/, "")
    return { url: PROFILE_URLS[platform]?.(username) ?? "", handle: `@${username}` }
  }
  for (const link of brand?.links ?? []) {
    try {
      const url = new URL(/^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`)
      const host = url.hostname.replace(/^www\./, "")
      if (!PLATFORM_HOSTS[platform]?.some((domain) => host === domain || host.endsWith(`.${domain}`))) continue
      const name = url.pathname.split("/").filter(Boolean)[0]
      return { url: url.toString(), handle: name ? `@${name.replace(/^@/, "")}` : "" }
    } catch {
      continue
    }
  }
  return null
}

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

type CreatorBriefBrand = {
  /** Connected in the client's settings. */
  accounts?: { platform: string; username: string }[]
  links?: { url: string }[]
  website?: string
}

/** What creators and the client see: the brief as plain facts. */
export function CreatorBriefSummary({ brief, brand, hideOffer = false, shared = false }: {
  brief: CreatorBrief
  /** The client's accounts, links and website, so creators can find the brand. */
  brand?: CreatorBriefBrand
  /** Leave the offer and how it's paid out, for the shared page when the campaign hides them. */
  hideOffer?: boolean
  /** On the public campaign page, which leaves out paid ads. */
  shared?: boolean
}) {
  const platforms = brief.platform.split(" and ").map((name) => name.trim())
  const content = contentSummary(brief)
  const who = creatorSummary(brief)
  const dates = brief.postFrom || brief.postTo
    ? [formatBriefDate(brief.postFrom), formatBriefDate(brief.postTo)].filter(Boolean).join(" to ")
    : ""
  return (
    <div className="space-y-5">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Fact label="Platform" icon={Smartphone}>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {platforms.map((name) => {
              const key = name.toLowerCase()
              const account = brandAccount(key, brand)
              return (
                <span key={name} className="inline-flex items-center gap-1.5">
                  <SocialIcon platform={key} />
                  {account?.handle && account.url
                    ? <a href={account.url} target="_blank" rel="noreferrer" className="hover:underline">{account.handle}</a>
                    : account?.handle || name}
                </span>
              )
            })}
          </span>
        </Fact>
        {brand?.website && (
          <Fact label="Website" icon={Globe}>
            <a href={websiteHref(brand.website)} target="_blank" rel="noreferrer" className="break-all hover:underline">
              {brand.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
            </a>
          </Fact>
        )}
        <Fact label="Goal" icon={Target}>{goalLabel(brief.goal)}</Fact>
        {!hideOffer && formatOffer(brief) && <Fact label="Offer" icon={Wallet}>{formatOffer(brief)}</Fact>}
        {content && <Fact label="Content" icon={Clapperboard}>{content}</Fact>}
        {brief.registerBy && <Fact label="Apply by" icon={CalendarClock}>{formatBriefDate(brief.registerBy)}</Fact>}
        {dates && <Fact label="Runs" icon={CalendarRange}>{dates}</Fact>}
        {(!shared || brief.showCreatorDetails) && who && <Fact label="Creators" icon={Users}>{who}</Fact>}
        {!hideOffer && <Fact label="Payment" icon={CreditCard}>{brief.paymentMethod}</Fact>}
        {!shared && brief.paidAds && <Fact label="Paid ads" icon={Megaphone}>Yes</Fact>}
      </dl>
      {brief.contentDetails && <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{brief.contentDetails}</p>}
    </div>
  )
}

function Fact({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
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
