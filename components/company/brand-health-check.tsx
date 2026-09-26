"use client"

import { useRef, useState } from "react"
import { CalendarDays, Check, Loader2, Mail, Phone, Sparkles, X } from "lucide-react"

import type { CompanyLink } from "@/lib/organizations"
import { cn } from "@/lib/utils"

type Kind = "event" | "tender" | "grant" | "partner"
type Opportunity = {
  id: string
  kind: Kind
  title: string
  details: string[]
  contact: string
  email?: string
  phone?: string
}

const TAGS: Record<Kind, { label: string; className: string }> = {
  event: {
    label: "Event",
    className: "border-[#F2D8BD] bg-[#FDF6EE] text-[#B5681F] dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300",
  },
  tender: {
    label: "Tender",
    className: "border-[#CDE6D2] bg-[#F2FAF3] text-[#2F7A3E] dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  grant: {
    label: "Grant",
    className: "border-[#F2CCD2] bg-[#FDF3F5] text-[#B23346] dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
  },
  partner: {
    label: "Partner",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
}

const CHIPS = ["Events near them", "Open tenders", "Grants", "New partners"]

// Words that route a request to a kind of opportunity.
const KEYWORDS: Record<Kind, string[]> = {
  event: ["event", "expo", "show", "conference", "near"],
  tender: ["tender", "bid", "procurement", "rfp", "contract"],
  grant: ["grant", "fund", "funding"],
  partner: ["partner", "b2b", "list", "collab", "prospect"],
}

// Prototype data. Swap for the model's response once the backend exists.
const FOUND_FIRST: Opportunity[] = [
  { id: "wafb", kind: "event", title: "West Africa Food & Beverage Expo", details: ["Lagos", "In 42 days", "200+ exhibitors"], contact: "Ada Okoro, Organiser", email: "ada@wafbexpo.com", phone: "+234 801 234 5678" },
  { id: "lsds", kind: "tender", title: "Lagos State digital services tender", details: ["Closes in 18 days", "Web & marketing"], contact: "Procurement Office", email: "procurement@example.gov.ng" },
  { id: "smeg", kind: "grant", title: "SME growth grant, round 2", details: ["Up to ₦5m", "Apply by 30 Nov"], contact: "Grants desk", email: "grants@example.ng" },
]

const MORE: Opportunity[] = [
  { id: "sgc", kind: "event", title: "Startup Grind Conference", details: ["Lagos", "In 33 days", "Sponsor slots open"], contact: "Chidi Eze, Partnerships", email: "chidi@example.ng" },
  { id: "aphs", kind: "event", title: "Abuja Property & Home Show", details: ["Abuja", "In 55 days"], contact: "Musa Bello, Sponsorships", email: "musa@example.ng", phone: "+234 802 345 6789" },
  { id: "ccos", kind: "tender", title: "City council outdoor signage", details: ["Closes in 20 days", "Est. ₦15m"], contact: "Tenders Desk", email: "tenders@example.gov.ng" },
  { id: "cif", kind: "grant", title: "Creative industries fund", details: ["Up to ₦10m", "Apply by 15 Dec"], contact: "Fund office", email: "apply@example.ng" },
  { id: "ger", kind: "partner", title: "Grand Estates Realty", details: ["Real estate", "Lagos"], contact: "Bola Martins", email: "bola@example.ng", phone: "+234 806 111 2222" },
  { id: "okp", kind: "partner", title: "Okafor & Partners", details: ["Law firm", "Abuja"], contact: "Ify Okafor", email: "ify@example.ng" },
]

const PREVIEW_COUNT = 3

function kindFor(text: string): Kind | null {
  const lower = text.toLowerCase()
  const match = (Object.keys(KEYWORDS) as Kind[]).find((kind) => KEYWORDS[kind].some((word) => lower.includes(word)))
  return match ?? null
}

export function BrandHealthCheck({
  companyName,
}: {
  companyName: string
  description?: string
  website?: string
  linkedIn?: string
  links?: CompanyLink[]
}) {
  const [query, setQuery] = useState("")
  const [found, setFound] = useState<Opportunity[]>(FOUND_FIRST)
  const [searching, setSearching] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  /** Pretend to search, then add any sample results of that kind (or all kinds) not yet found. */
  function search(kind: Kind | null) {
    const fresh = MORE.filter((item) => (!kind || item.kind === kind) && !dismissed.has(item.id) && !found.some((c) => c.id === item.id))
    setSearching(true)
    setNote(null)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setFound((current) => [...fresh.filter((item) => !current.some((c) => c.id === item.id)), ...current])
      setNote(fresh.length ? `Added ${fresh.length} to Found so far.` : "Nothing new for that yet.")
      setSearching(false)
    }, 1100)
  }

  function handleAsk(event: React.FormEvent) {
    event.preventDefault()
    if (!query.trim() || searching) return
    search(kindFor(query))
    setQuery("")
  }

  function pickChip(chip: string) {
    setQuery(`Find ${chip.toLowerCase()} for ${companyName}`)
    inputRef.current?.focus()
  }

  function seeAll() {
    if (showAll) {
      setShowAll(false)
      return
    }
    setShowAll(true)
    if (MORE.some((item) => !dismissed.has(item.id) && !found.some((c) => c.id === item.id))) search(null)
  }

  function toggleSaved(id: string) {
    setSaved((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function dismiss(id: string) {
    setFound((current) => current.filter((item) => item.id !== id))
    setDismissed((current) => new Set(current).add(id))
    setOpenId(null)
  }

  const shown = showAll ? found : found.slice(0, PREVIEW_COUNT)

  return (
    <div className="mt-4 grid gap-3 max-md:-mx-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-4">
      {/* Ask: who the assistant is and what to find. */}
      <section className="rounded-[14px] border border-border bg-background p-4 md:p-5 lg:sticky lg:top-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="size-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">Business health</div>
            <h2 data-weight="bold" className="mt-0.5 text-lg leading-[1.3] text-foreground">Your AI prospector for {companyName}</h2>
          </div>
        </div>
        <div className="mt-2.5 text-sm text-muted-foreground">
          Tell me what to look for and I&apos;ll bring back leads and opportunities, with contacts ready to act on.
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2 text-[13px]">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => pickChip(chip)}
              className="inline-flex h-8 items-center rounded-full border border-border bg-page px-[11px] font-medium text-foreground outline-none transition-colors hover:border-[#C9CEDA] focus-visible:ring-2 focus-visible:ring-ring dark:hover:border-muted-foreground"
            >
              {chip}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleAsk}
          className="mt-3.5 flex gap-2 rounded-xl border border-border bg-page p-1.5 text-sm transition-colors focus-within:border-primary"
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`e.g. find events near ${companyName}`}
            aria-label="What should I look for?"
            className="min-w-0 flex-1 bg-transparent px-2 text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={searching}
            className="inline-flex h-9 shrink-0 items-center rounded-[9px] bg-foreground px-4 font-semibold text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            Find
          </button>
        </form>

        {(searching || note) && (
          <div className="mt-2.5 flex items-center gap-1.5 px-1 text-[13px] text-muted-foreground" aria-live="polite">
            {searching && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
            {searching ? "Looking…" : note}
          </div>
        )}
      </section>

      {/* What the assistant has found. Tap a row for the contact and next steps. */}
      <section className="overflow-hidden rounded-[14px] border border-border bg-background">
        <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-primary/10 text-primary">
            <CalendarDays className="size-[18px]" aria-hidden="true" />
          </span>
          <h2 data-weight="semibold" className="flex-1 text-[15px] text-foreground">Found so far</h2>
          <span className="rounded-full border border-border bg-page px-[9px] py-0.5 text-xs font-semibold text-muted-foreground">
            {found.length}
          </span>
        </div>

        {found.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing here yet. Ask above and I&apos;ll start looking.</div>
        ) : (
          <ul>
            {shown.map((item) => {
              const tag = TAGS[item.kind]
              const open = openId === item.id
              const isSaved = saved.has(item.id)
              return (
                <li key={item.id} className="border-t border-border/60 first:border-t-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : item.id)}
                    aria-expanded={open}
                    className="flex w-full gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-page focus-visible:bg-page"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[15px] font-semibold leading-[1.3] text-foreground">
                        {item.title}
                        {isSaved && <Check className="size-4 shrink-0 text-primary" aria-label="Saved" />}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[13px] text-muted-foreground">
                        {item.details.map((detail) => <span key={detail}>{detail}</span>)}
                      </span>
                    </span>
                    <span className={cn("shrink-0 self-start rounded-full border px-[9px] py-[3px] text-xs font-medium", tag.className)}>
                      {tag.label}
                    </span>
                  </button>

                  {open && (
                    <div className="px-4 pb-3.5 text-[13px]">
                      <div className="rounded-xl border border-border/60 bg-page p-3">
                        <div className="font-medium text-foreground">{item.contact}</div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                          {item.email && (
                            <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                              <Mail className="size-3.5" aria-hidden="true" />
                              {item.email}
                            </a>
                          )}
                          {item.phone && (
                            <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                              <Phone className="size-3.5" aria-hidden="true" />
                              {item.phone}
                            </a>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSaved(item.id)}
                            className={cn(
                              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                              isSaved ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:bg-muted/40",
                            )}
                          >
                            {isSaved && <Check className="size-3.5" aria-hidden="true" />}
                            {isSaved ? "Saved as lead" : "Save as lead"}
                          </button>
                          {item.email && (
                            <a
                              href={`mailto:${item.email}?subject=${encodeURIComponent(`${companyName} — quick idea`)}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 font-medium text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Mail className="size-3.5" aria-hidden="true" />
                              Draft email
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => dismiss(item.id)}
                            className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <X className="size-3.5" aria-hidden="true" />
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="border-t border-border/60 bg-page px-4 py-3 text-sm">
          <button
            type="button"
            onClick={seeAll}
            className="font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showAll ? "Show fewer" : "See all opportunities"}
          </button>
        </div>
      </section>

      <div className="px-1 text-xs text-muted-foreground lg:col-span-2">Sample results. Live sources connect once the backend is ready.</div>
    </div>
  )
}
