"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Linkedin, MoreVertical, Users } from "lucide-react"
import { SiFacebook, SiInstagram, SiSnapchat, SiThreads, SiTiktok, SiX, SiYoutube } from "react-icons/si"
import type { IconType } from "react-icons"
import { toast } from "sonner"

import { SectionAddButton } from "@/components/company/section-add-button"
import { CollectionView } from "@/components/dashboard/collection-view"
import { hasItemActions, ItemActionsMenu, type ItemActions } from "@/components/dashboard/item-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  addCampaignPeople,
  compactCount,
  deleteCampaignPerson,
  formatPay,
  normalizeHandle,
  onRoster,
  parseCount,
  PAY_CURRENCIES,
  payCurrency,
  PERSON_APPS,
  PERSON_CATEGORIES,
  PERSON_STATUSES,
  PERSON_TIERS,
  PERSON_WAVES,
  profileUrl,
  updateCampaignPerson,
  type CampaignPerson,
  type CampaignPersonInput,
} from "@/lib/campaign-people"
import { cn } from "@/lib/utils"

interface CampaignPeopleProps {
  people: CampaignPerson[]
  agencyId?: string
  companyId: string
  projectId: string
  /** The agency: adds creators and edits every detail. */
  canEdit: boolean
  /** The client's own people: can add a suggested creator. */
  canReview?: boolean
  /** Opens the add form when the campaign home quick action is used. */
  startNew?: boolean
  onActionHandled?: () => void
}

const fieldClass = "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"

/**
 * The Creators tab: everyone on the campaign as cards or a list. The agency adds
 * creators in the row above the list and opens any of them to change the rest.
 */
export function CampaignPeople({ people, agencyId, companyId, projectId, canEdit, canReview = false, startNew = false, onActionHandled }: CampaignPeopleProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const open = people.find((person) => person.id === openId) ?? null
  // Added creators first, then suggestions, each by best match.
  const sorted = [...people].sort((a, b) => Number(onRoster(b)) - Number(onRoster(a)) || (b.overlap ?? 0) - (a.overlap ?? 0))

  useEffect(() => {
    if (!canEdit || !startNew) return
    setAdding(true)
    onActionHandled?.()
  }, [canEdit, onActionHandled, startNew])

  async function addToRoster(person: CampaignPerson) {
    try {
      await updateCampaignPerson(person.id, { onRoster: true })
    } catch (error) {
      console.error("Error adding creator:", error)
      toast.error("That didn't save.")
    }
  }

  async function removeCreator(person: CampaignPerson) {
    try {
      await deleteCampaignPerson(person.id)
    } catch (error) {
      console.error("Error removing creator:", error)
      toast.error("Couldn't delete them.")
    }
  }

  function payLabel(person: CampaignPerson) {
    return person.source === "ngai" && !person.pay ? "Pay unknown" : person.pay ? formatPay(person.pay, payCurrency(person)) : "Free"
  }

  function actionsFor(person: CampaignPerson): ItemActions {
    const href = profileUrl(person)
    const canAdd = !onRoster(person) && (canEdit || canReview)
    return {
      noun: "creator",
      name: person.handle,
      onOpen: href ? () => window.open(href, "_blank", "noopener,noreferrer") : undefined,
      extra: (canEdit || canAdd) && (
        <>
          {canEdit && <DropdownMenuItem onSelect={() => setOpenId(person.id)}>Edit</DropdownMenuItem>}
          {canAdd && <DropdownMenuItem onSelect={() => void addToRoster(person)}>Add to campaign</DropdownMenuItem>}
        </>
      ),
      onDelete: canEdit ? () => removeCreator(person) : undefined,
      deleteMessage: "They'll be removed from this campaign.",
    }
  }

  function openPerson(person: CampaignPerson) {
    if (canEdit) return setOpenId(person.id)
    const href = profileUrl(person)
    if (href) window.open(href, "_blank", "noopener,noreferrer")
  }

  return (
    <div>
      <CollectionView
        className=""
        items={sorted}
        getKey={(person) => person.id}
        searchFields={(person) => [person.handle, person.app, person.category, person.status]}
        searchPlaceholder="Search creators"
        viewKey="campaign-creators-inline"
        initialView="list"
        actions={
          <>
            {canEdit && <SectionAddButton label="New creator" disabled={adding} onClick={() => setAdding(true)} />}
          </>
        }
        before={canEdit && adding ? (
          <div className="mt-4">
            <AddCreatorRow scope={{ agencyId, companyId, projectId }} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
          </div>
        ) : undefined}
        empty={{
          icon: Users,
          title: "No creators yet",
          description: "Add creators one by one.",
          action: canEdit ? <SectionAddButton label="New creator" onClick={() => setAdding(true)} /> : undefined,
        }}
        card={(person) => {
          const suggested = !onRoster(person)
          const status = suggested ? "Suggested" : person.status
          return {
            icon: <CreatorThumbnail person={person} compact />,
            title: person.handle,
            subtitle: (
              <span className="inline-flex min-w-0 items-center gap-2">
                <Badge variant="secondary" className="rounded-full">{status}</Badge>
                <span className="truncate">{payLabel(person)}</span>
              </span>
            ),
            preview: <CreatorThumbnail person={person} />,
            onClick: canEdit || profileUrl(person) ? () => openPerson(person) : undefined,
            ariaLabel: canEdit ? `Edit ${person.handle}` : `Open ${person.handle}`,
            menuLabel: `Options for ${person.handle}`,
          }
        }}
        itemActions={actionsFor}
        row={(person) => {
          const status = onRoster(person) ? person.status : "Suggested"
          return {
            subtitle: [person.app, person.category, `${compactCount(person.followers)} followers`].filter(Boolean).join(" · "),
            trailing: (
              <span className="grid w-56 max-w-[42vw] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 max-sm:w-auto max-sm:max-w-none">
                <Badge variant="secondary" className="max-w-full justify-self-start rounded-full">{status}</Badge>
                <span className="whitespace-nowrap">{payLabel(person)}</span>
              </span>
            ),
          }
        }}
        listItem={(person) => {
          const status = onRoster(person) ? person.status : "Suggested"
          return (
            <CreatorListRow
              key={person.id}
              person={person}
              status={status}
              pay={payLabel(person)}
              onOpen={() => openPerson(person)}
              profileHref={profileUrl(person)}
              actions={actionsFor(person)}
            />
          )
        }}
      />

      {canEdit && <CreatorDialog person={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

const PLATFORM_ICONS: Record<string, IconType> = {
  X: SiX,
  Instagram: SiInstagram,
  TikTok: SiTiktok,
  YouTube: SiYoutube,
  Facebook: SiFacebook,
  Snapchat: SiSnapchat,
  Threads: SiThreads,
  LinkedIn: Linkedin,
}

function CreatorListRow({
  person,
  status,
  pay,
  onOpen,
  profileHref,
  actions,
}: {
  person: CampaignPerson
  status: string
  pay: string
  onOpen: () => void
  profileHref?: string
  actions?: ItemActions
}) {
  const meta = [person.category, person.followers ? `${compactCount(person.followers)} followers` : undefined].filter(Boolean).join(" · ")
  const isSuggested = status === "Suggested"
  const PlatformIcon = PLATFORM_ICONS[person.app]

  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-border px-2 py-3 sm:gap-4">
      <button type="button" onClick={onOpen} className="size-14 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-16" aria-label={`Open ${person.handle}`}>
        <CreatorThumbnail person={person} compact />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onOpen} className="truncate text-left text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base">{person.handle}</button>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">{person.category || "Creator"}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta || "Creator"}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {profileHref && PlatformIcon && <a href={profileHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Open ${person.app} profile`} title={`Open ${person.app} profile`}><PlatformIcon className="size-4" /></a>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge variant="secondary" className={cn("rounded-full px-2.5 py-1 text-xs", isSuggested ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700")}>{status}</Badge>
        <span className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">{pay}</span>
      </div>
      {hasItemActions(actions) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Options for ${person.handle}`}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end"><ItemActionsMenu actions={actions} /></DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

type Scope = { agencyId?: string; companyId: string; projectId: string }

async function saveCreators(scope: Scope, rows: CampaignPersonInput[]) {
  try {
    await addCampaignPeople(scope, rows)
    return true
  } catch (error) {
    console.error("Error adding creators:", error)
    toast.error("Couldn't add them. Try again.")
    return false
  }
}

/** A row of boxes above the list to add a creator. */
function AddCreatorRow({ scope, onDone, onCancel }: { scope: Scope; onDone: () => void; onCancel: () => void }) {
  const [handle, setHandle] = useState("")
  const [app, setApp] = useState<string>(PERSON_APPS[0])
  const [category, setCategory] = useState("")
  const [followers, setFollowers] = useState("")
  const [currency, setCurrency] = useState<string>(PAY_CURRENCIES[0])
  const [pay, setPay] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!normalizeHandle(handle) || busy) return
    setBusy(true)
    const saved = await saveCreators(scope, [{
      handle,
      app,
      category: category.trim(),
      followers: parseCount(followers),
      tier: PERSON_TIERS[0],
      currency,
      pay: parseCount(pay),
    }])
    setBusy(false)
    if (!saved) return
    setHandle("")
    setFollowers("")
    setPay("")
    onDone()
  }

  return (
    <form onSubmit={handleAdd} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@handle" aria-label="Handle" className={cn(fieldClass, "col-span-2")} />
      <Pick label="App" value={app} options={PERSON_APPS} onChange={setApp} />
      <Pick label="Category" placeholder="Category" value={category} options={PERSON_CATEGORIES} onChange={setCategory} />
      <input value={followers} onChange={(event) => setFollowers(event.target.value)} placeholder="Followers" inputMode="numeric" aria-label="Followers" className={fieldClass} />
      <div className="flex gap-1">
        <Pick label="Currency" value={currency} options={PAY_CURRENCIES} onChange={setCurrency} className="w-20 shrink-0" />
        <input value={pay} onChange={(event) => setPay(event.target.value)} placeholder="Pay" inputMode="numeric" aria-label="Pay" className={fieldClass} />
      </div>
      <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      <Button type="submit" disabled={busy || !normalizeHandle(handle)}>Add creator</Button>
    </form>
  )
}

/** Edit every detail of one creator, then Save. */
function CreatorDialog({ person, onClose }: { person: CampaignPerson | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(person)} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {person?.handle ?? "creator"}</DialogTitle>
          <DialogDescription className="sr-only">Change this creator&apos;s details.</DialogDescription>
        </DialogHeader>
        {person && <CreatorForm key={person.id} person={person} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function CreatorForm({ person, onDone }: { person: CampaignPerson; onDone: () => void }) {
  const [draft, setDraft] = useState({
    handle: person.handle,
    app: person.app,
    followers: String(person.followers || ""),
    category: person.category ?? "",
    overlap: String(person.overlap || ""),
    tier: person.tier,
    status: person.status,
    wave: person.wave,
    postLink: person.postLink,
    currency: payCurrency(person),
    pay: String(person.pay || ""),
    paid: person.paid,
    labelled: person.labelled,
    onRoster: onRoster(person),
  })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }))

  async function save(event: FormEvent) {
    event.preventDefault()
    const handle = normalizeHandle(draft.handle)
    if (!handle || saving) return
    setSaving(true)
    try {
      await updateCampaignPerson(person.id, {
        handle,
        app: draft.app,
        followers: parseCount(draft.followers),
        category: draft.category,
        overlap: Math.min(100, parseCount(draft.overlap.replace("%", ""))),
        tier: draft.tier,
        status: draft.status,
        wave: draft.wave,
        postLink: draft.postLink.trim(),
        currency: draft.currency,
        pay: parseCount(draft.pay),
        paid: draft.paid,
        labelled: draft.labelled,
        onRoster: draft.onRoster,
      })
      onDone()
    } catch (error) {
      console.error("Error saving creator:", error)
      toast.error("That didn't save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Handle"><Input value={draft.handle} onChange={(event) => set("handle", event.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="App"><Pick label="App" value={draft.app} options={PERSON_APPS} onChange={(value) => set("app", value)} /></Field>
        <Field label="Category"><Pick label="Category" value={draft.category} options={["", ...PERSON_CATEGORIES]} onChange={(value) => set("category", value)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Followers"><Input value={draft.followers} onChange={(event) => set("followers", event.target.value)} inputMode="numeric" /></Field>
        <Field label="Match %"><Input value={draft.overlap} onChange={(event) => set("overlap", event.target.value)} inputMode="numeric" /></Field>
        <Field label="Size"><Pick label="Size" value={draft.tier} options={PERSON_TIERS} onChange={(value) => set("tier", value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status"><Pick label="Status" value={draft.status} options={PERSON_STATUSES} onChange={(value) => set("status", value)} /></Field>
        <Field label="Posting day"><Pick label="Posting day" value={draft.wave} options={PERSON_WAVES} onChange={(value) => set("wave", value)} show={(option) => (option ? `Day ${option}` : "—")} /></Field>
      </div>
      <Field label="Post link"><Input value={draft.postLink} onChange={(event) => set("postLink", event.target.value)} placeholder="https://" /></Field>
      <div className="grid grid-cols-[6rem_1fr] gap-3">
        <Field label="Currency"><Pick label="Currency" value={draft.currency} options={PAY_CURRENCIES} onChange={(value) => set("currency", value)} /></Field>
        <Field label="Pay"><Input value={draft.pay} onChange={(event) => set("pay", event.target.value)} inputMode="numeric" placeholder="0 if free" /></Field>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.paid} onChange={(event) => set("paid", event.target.checked)} className="size-4 accent-foreground" />
          Paid
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.labelled} onChange={(event) => set("labelled", event.target.checked)} className="size-4 accent-foreground" />
          Marked as ad
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!draft.onRoster} onChange={(event) => set("onRoster", !event.target.checked)} className="size-4 accent-foreground" />
          Suggestion only
        </label>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving || !normalizeHandle(draft.handle)}>{saving ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

// Radix Select can't hold an empty value, so "none" stands in for it.
const NONE = "__none"

/** The shadcn select, for a plain list of strings. An empty option shows as "—". */
function Pick({
  value,
  options,
  onChange,
  label,
  placeholder,
  show = (option) => option || "—",
  className,
}: {
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  label: string
  placeholder?: string
  show?: (option: string) => string
  className?: string
}) {
  const all = [...new Set([...options, ...(value && !options.includes(value) ? [value] : [])])]
  return (
    <Select value={value || (placeholder ? undefined : NONE)} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
      <SelectTrigger size="default" aria-label={label} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {all.map((option) => (
          <SelectItem key={option || NONE} value={option || NONE}>{show(option)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// unavatar.io serves a public profile's picture by app and handle.
const AVATAR_PROVIDERS: Record<string, string> = { X: "x", Instagram: "instagram", TikTok: "tiktok", YouTube: "youtube", Facebook: "facebook" }

function hueFor(text: string) {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

/**
 * The creator's card picture: their profile photo when the app has a public one,
 * otherwise a made-up tile in a colour picked from their handle, with their initials.
 */
export function CreatorThumbnail({ person, compact = false, showMeta = true }: { person: CampaignPerson; compact?: boolean; showMeta?: boolean }) {
  const name = person.handle.replace(/^@+/, "")
  const provider = AVATAR_PROVIDERS[person.app]
  const [failed, setFailed] = useState(!provider || !name)
  const hue = hueFor(name.toLowerCase())
  const initials = name.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?"

  return (
    <div
      className="relative flex size-full items-center justify-center"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 50) % 360} 70% 38%))` }}
    >
      <span className="text-4xl font-semibold tracking-[-0.03em] text-white/95">{initials}</span>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://unavatar.io/${provider}/${encodeURIComponent(name)}?fallback=false`}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {!compact && showMeta && <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white">
        {person.app}{person.followers ? ` · ${compactCount(person.followers)}` : ""}
      </span>}
    </div>
  )
}
