"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react"
import { ArrowRight, Check, ChevronDown, Copy, Download, ExternalLink, ImageIcon, Loader2, Mail, Pencil, Search, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage, type CompanySectionKey } from "@/components/company/company-page-context"
import { SocialIcon } from "@/components/company/social-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CLIENT_FILE_MAX_BYTES, uploadFileToStorage } from "@/lib/documents"
import { FLOW_STEPS, hostOf, type FlowState, type FlowStep, type Person } from "@/lib/marketing-flow"
import { cn } from "@/lib/utils"

/*
 * Marketing Home: the company enters its website, then each step runs in turn
 * and ticks off. Home shows the research, competitors and audiences; what the
 * later steps find lives on its own page: Leads, Outreach, Social Media and Ads.
 */

function useFlowApi(companyId: string) {
  const { user } = useAuth()
  const userRef = useRef(user)
  userRef.current = user
  return useCallback(async (body?: Record<string, unknown>): Promise<{ flow: FlowState }> => {
    const current = userRef.current
    if (!current) throw new Error("Please sign in to use Marketing.")
    const token = await current.getIdToken()
    const response = await fetch(body ? "/api/marketing" : `/api/marketing?companyId=${encodeURIComponent(companyId)}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify({ companyId, ...body }) } : {}),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || "Something went wrong. Please try again.")
    return data
  }, [companyId])
}

const has = (flow: FlowState | null, step: FlowStep) => Boolean(flow?.[step])

// One copy of each company's flow, shared by Home, Leads, Outreach, Social and Ads,
// so a run keeps updating every page while you move between them.
const flows = new Map<string, FlowState>()
const listeners = new Set<() => void>()
const loading = new Map<string, Promise<void>>()
function setStored(companyId: string, flow: FlowState) {
  flows.set(companyId, flow)
  listeners.forEach((listener) => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** The company's saved flow, loaded once and shared across the Marketing pages. */
function useFlow() {
  const { company } = useCompanyPage()
  const { user, loading: authLoading } = useAuth()
  const api = useFlowApi(company.id)
  const flow = useSyncExternalStore(subscribe, () => flows.get(company.id) ?? null, () => null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user || flows.has(company.id)) return
    if (!loading.has(company.id)) {
      loading.set(company.id, api().then(({ flow: loaded }) => setStored(company.id, loaded)).finally(() => loading.delete(company.id)))
    }
    loading.get(company.id)!.catch((caught) => setError(caught instanceof Error ? caught.message : "Couldn't load Marketing."))
  }, [api, company.id, user])

  const set = useCallback((next: FlowState) => setStored(company.id, next), [company.id])
  const act = useCallback(async (body: Record<string, unknown>) => {
    try {
      set((await api(body)).flow)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't save that.")
    }
  }, [api, set])

  return { flow, error, signedOut: !authLoading && !user, api, set, act }
}

/** Shown while the flow loads, or on a results page before Marketing has run. */
function FlowGate({ flow, error, signedOut, step, children }: { flow: FlowState | null; error: string; signedOut: boolean; step: FlowStep; children: ReactNode }) {
  const { sectionHref } = useCompanyPage()
  if (signedOut) return <p className="mt-6 text-sm text-muted-foreground">Please sign in to use Marketing.</p>
  if (error) return <p className="mt-6 text-sm text-destructive">{error}</p>
  if (!flow) return <div className="mx-auto mt-6 h-40 w-full max-w-3xl animate-pulse rounded-xl bg-muted/50" aria-busy="true" />
  if (!flow[step]) {
    return (
      <div className="mx-auto mt-6 w-full max-w-3xl rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        <Button asChild size="sm" className="mt-4"><Link href={sectionHref("marketing")}>Start</Link></Button>
      </div>
    )
  }
  return <div className="mx-auto mt-5 w-full max-w-3xl min-w-0">{children}</div>
}


export function MarketingFlowSection() {
  const { company } = useCompanyPage()
  const { flow, error: loadError, signedOut, api, set: setFlow, act } = useFlow()
  const [running, setRunning] = useState<FlowStep | null>(null)
  const [failed, setFailed] = useState<{ step: FlowStep; message: string } | null>(null)
  const [open, setOpen] = useState<FlowStep | null>(null)
  const [website, setWebsite] = useState(company.website ?? "")

  // Once loaded: the saved website, and the step to show open.
  const loaded = Boolean(flow)
  useEffect(() => {
    if (!flow) return
    if (flow.website) setWebsite(flow.website)
    setOpen((current) => current ?? ([...FLOW_STEPS].reverse().find((step) => flow[step.key])?.key ?? null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  /** Runs from one step to the end, saving and ticking off each one. */
  async function runFrom(start: FlowStep, site?: string) {
    setFailed(null)
    const startIndex = FLOW_STEPS.findIndex((step) => step.key === start)
    for (const { key } of FLOW_STEPS.slice(startIndex)) {
      setRunning(key)
      try {
        const { flow: next } = await api({ action: "run", step: key, ...(key === "research" && site ? { website: site } : {}) })
        setFlow(next)
        setOpen(key)
      } catch (error) {
        setFailed({ step: key, message: error instanceof Error ? error.message : "That step didn't finish." })
        setRunning(null)
        return
      }
    }
    setRunning(null)
  }

  /** Skips a step, then carries on with the rest. */
  async function skip(step: FlowStep) {
    setFailed(null)
    try {
      setFlow((await api({ action: "skip", step })).flow)
    } catch (error) {
      setFailed({ step, message: error instanceof Error ? error.message : "Couldn't skip that step." })
      return
    }
    const next = FLOW_STEPS[FLOW_STEPS.findIndex((item) => item.key === step) + 1]
    if (next) void runFrom(next.key)
  }

  function start(event: FormEvent) {
    event.preventDefault()
    if (!website.trim() || running) return
    void runFrom("research", website.trim())
  }

  if (signedOut) return <p className="mt-6 text-sm text-muted-foreground">Please sign in to use Marketing.</p>
  if (loadError) return <p className="mt-6 text-sm text-destructive">{loadError}</p>
  if (!flow) {
    return (
      <div className="mt-6 space-y-3" aria-busy="true">
        {FLOW_STEPS.map((step) => <div key={step.key} className="h-14 animate-pulse rounded-lg bg-muted/50" />)}
      </div>
    )
  }

  const started = has(flow, "research") || running !== null
  const done = FLOW_STEPS.filter((step) => has(flow, step.key)).length

  return (
    <div className="mx-auto mt-5 w-full max-w-3xl min-w-0">
      {!started ? (
        <form onSubmit={start} className="mx-auto flex max-w-xl flex-col items-center py-10 text-center sm:py-16">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Turn your website into customers
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Learns what you sell, finds who buys it, and writes your emails, posts and ads.</p>
          <Input
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="Paste your website, e.g. yourcompany.com"
            aria-label="Your website"
            inputMode="url"
            autoComplete="url"
            className="mt-8 h-16 rounded-2xl border-2 border-x-2 border-t-2 border-foreground bg-background px-5 text-lg md:text-lg"
          />
          <Button type="submit" className="mt-3 h-14 w-full rounded-2xl text-lg" disabled={!website.trim() || Boolean(running)}>
            Start <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
          <HowItWorks />
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{hostOf(flow.website)}</span>
            {" · "}
            {running ? `Step ${FLOW_STEPS.findIndex((step) => step.key === running) + 1} of ${FLOW_STEPS.length}` : `${done}/${FLOW_STEPS.length}`}
          </p>
        </div>
      )}

      {started && (
        <ol className="mt-5 divide-y divide-border">
          {FLOW_STEPS.map((step, index) => {
            const isDone = has(flow, step.key)
            const isRunning = running === step.key
            const isFailed = failed?.step === step.key
            const isOpen = open === step.key && isDone
            const isSkipped = flow.skipped?.includes(step.key)
            // The run stopped here with nothing showing: offer Skip.
            const isStuck = !running && !isFailed && !isDone && step.key !== "research" && FLOW_STEPS.findIndex((item) => !has(flow, item.key)) === index
            return (
              <li key={step.key}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 py-3 text-left disabled:cursor-default"
                  disabled={!isDone}
                  aria-expanded={isDone ? isOpen : undefined}
                  onClick={() => setOpen(isOpen ? null : step.key)}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isDone ? "bg-foreground text-background" : isFailed ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {isRunning ? <Loader2 className="size-4 animate-spin" /> : isDone ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span className={cn("flex-1 text-base font-semibold sm:text-lg", !isDone && !isRunning && "text-muted-foreground")}>{index + 1}. {step.title}</span>
                  {isSkipped && <span className="shrink-0 text-sm text-muted-foreground">Skipped</span>}
                  {isDone && !isSkipped && <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden="true" />}
                </button>
                {isStuck && (
                  <div className="mb-3 flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={() => void skip(step.key)}>Skip</Button>
                  </div>
                )}
                {isFailed && (
                  <div className="mb-3 ml-10 text-sm">
                    <p className="text-destructive">{failed.message}</p>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => void runFrom(step.key)}>Try again</Button>
                      {step.key !== "research" && <Button type="button" size="sm" onClick={() => void skip(step.key)}>Skip</Button>}
                    </div>
                  </div>
                )}
                {isOpen && !isSkipped && (
                  <div className="pb-5">
                    <StepBody step={step.key} flow={flow} act={act} />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

/** Example cards under Start, one per stage of the run. */
const HOW_IT_WORKS: { title: string; head?: [string, string]; rows: [string, string][] }[] = [
  { title: "Learns what you sell", rows: [["freshcrumb.com", "Wholesale bread for cafes and hotels"]] },
  { title: "Finds your competitors", head: ["Competitor", "Website"], rows: [["Daily Loaf", "dailyloaf.com"], ["Bakehouse Supply", "bakehouse.co"], ["Crust & Co", "crustco.com"]] },
  { title: "Figures out who buys it", head: ["Audience", "Pain"], rows: [["Cafes", "Stale stock"], ["Boutique hotels", "Breakfast costs"], ["Caterers", "Late deliveries"]] },
  { title: "Finds the companies and who decides", head: ["Company", "Contact"], rows: [["Bean There Cafe", "Ada Obi, Owner"], ["The Linden Hotel", "Tom Reyes, GM"], ["Plate Catering", "Sara Lin, Founder"]] },
  { title: "Writes your emails, posts and ads", head: ["Ready", "Count"], rows: [["Emails", "12"], ["Posts", "3"], ["Ads", "3"]] },
]

function HowItWorks() {
  return (
    <div className="mt-14 w-full text-left">
      {HOW_IT_WORKS.map((card, index) => (
        // Each card sticks a little lower than the last, so they stack like a deck as you scroll.
        <section
          key={card.title}
          style={{ top: `${72 + index * 14}px` }}
          className="sticky mb-6 min-h-[22rem] rounded-3xl border border-border bg-card p-6 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] sm:p-8"
        >
          <h3 className="text-3xl font-normal leading-tight tracking-tight sm:text-4xl">{card.title}</h3>
          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            {card.head && (
              <div className="flex justify-between bg-muted/60 px-5 py-4 text-sm uppercase tracking-wider text-muted-foreground">
                <span>{card.head[0]}</span>
                <span>{card.head[1]}</span>
              </div>
            )}
            <ul className="divide-y divide-border">
              {card.rows.map(([left, right]) => (
                <li key={left} className={cn("flex px-5 py-4 text-lg", card.head ? "items-center justify-between gap-4" : "flex-col gap-3 bg-muted/60 py-6")}>
                  <span className="font-medium">{left}</span>
                  <span className={cn("text-muted-foreground", card.head && "shrink-0 text-right")}>{right}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  )
}

type Act = (body: Record<string, unknown>) => Promise<void>

function StepBody({ step, flow, act }: { step: FlowStep; flow: FlowState; act: Act }) {
  switch (step) {
    case "research": return <ResearchStep flow={flow} />
    case "competitors": return <CompetitorsStep flow={flow} act={act} />
    case "audiences": return <AudiencesStep flow={flow} />
    case "customers": return <CustomersStep flow={flow} act={act} />
    case "people": return <PeopleStep flow={flow} act={act} />
    case "emails": return <EmailsStep flow={flow} act={act} />
    case "social": return <SocialStep flow={flow} act={act} />
    case "ads": return <AdsStep flow={flow} act={act} />
  }
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>{children}</div>
}

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-medium uppercase tracking-wider text-muted-foreground", className)}>{children}</p>
}

function Chips({ items, icon }: { items: string[]; icon?: ReactNode }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">{icon}{item}</li>
      ))}
    </ul>
  )
}

function Favicon({ url, name, large }: { url: string; name: string; large?: boolean }) {
  const host = hostOf(url)
  if (!host) return <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`} alt="" className={cn("shrink-0 rounded", large ? "size-10" : "size-6")} loading="lazy" />
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
      <X className="size-4" aria-hidden="true" />
    </button>
  )
}

function copy(text: string) {
  void navigator.clipboard.writeText(text).then(() => toast.success("Copied."), () => toast.error("Couldn't copy."))
}

function FoundPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
      <Check className="size-3.5" aria-hidden="true" />{children}
    </span>
  )
}

function ResearchStep({ flow }: { flow: FlowState }) {
  const research = flow.research!
  return (
    <Card>
      <div className="flex items-center gap-4">
        <Favicon url={research.website} name={research.name} large />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{research.name}</p>
          <a href={research.website} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">{hostOf(research.website)}</a>
        </div>
        <FoundPill>Found</FoundPill>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed">{research.summary}</p>
      <Label className="mt-5">Keywords</Label>
      <Chips items={research.keywords} />
    </Card>
  )
}

function CompetitorsStep({ flow }: { flow: FlowState; act: Act }) {
  const data = flow.competitors!
  return (
    <Card>
      <Label>Your product</Label>
      <p className="mt-1 text-lg font-semibold">{data.product}</p>
      <ul className="mt-3 space-y-2">
        {data.points.map((point) => (
          <li key={point} className="flex gap-2 text-[15px]"><Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{point}</li>
        ))}
      </ul>
      <Label className="mt-6">How buyers search</Label>
      <ul className="mt-2 flex flex-wrap gap-2">
        {data.searches.map((item) => (
          <li key={item} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
            <Search className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center gap-2">
        <Label>Competitors</Label>
        <FoundPill>{data.competitors.length} found</FoundPill>
      </div>
      {data.competitors.length > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {data.competitors.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 hover:bg-muted">
                <Favicon url={item.url} name={item.name} />
                <span className="min-w-0 truncate text-sm font-medium">{hostOf(item.url)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** Step 4 on Home: every company found, one card. */
function CustomersStep({ flow, act }: { flow: FlowState; act: Act }) {
  const customers = flow.customers!
  if (!customers.length) return <Card><p className="text-muted-foreground">No companies found.</p></Card>
  return (
    <Card className="max-h-[36rem] overflow-y-auto p-0">
      <ul className="divide-y divide-border">
        {customers.map((item) => (
          <li key={item.id} className="px-5 py-4">
            <div className="flex items-center gap-3">
              <Favicon url={item.url} name={item.name} />
              <p className="min-w-0 flex-1 truncate font-semibold">{item.name}</p>
              {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="shrink-0 text-sm text-muted-foreground hover:underline">{hostOf(item.url)}</a>}
              <RemoveButton label={`Remove ${item.name}`} onClick={() => void act({ action: "remove", step: "customers", id: item.id })} />
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
            {(item.country || item.industry) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[item.country, item.industry].filter(Boolean).map((tag) => (
                  <span key={tag} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Step 5 on Home: the decision makers. */
function PeopleStep({ flow, act }: { flow: FlowState; act: Act }) {
  const people = flow.people!
  if (!people.length) return <Card><p className="text-muted-foreground">No decision makers found.</p></Card>
  return (
    <Card className="max-h-[36rem] overflow-y-auto p-0">
      <ul className="divide-y divide-border">
        {people.map((person) => (
          <li key={person.id} className="flex items-center gap-3 px-5 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground" aria-hidden="true">{initials(person.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold">
                <span className="truncate">{person.name}</span>
                <a href={person.linkedin} target="_blank" rel="noreferrer" aria-label={`${person.name} on LinkedIn`} className="shrink-0"><SocialIcon platform="linkedin" /></a>
              </p>
              <p className="truncate text-sm text-muted-foreground">{person.title} at {person.company}</p>
              <PersonEmail person={person} act={act} />
            </div>
            <RemoveButton label={`Remove ${person.name}`} onClick={() => void act({ action: "remove", step: "people", id: person.id })} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

function AudiencesStep({ flow }: { flow: FlowState }) {
  return (
    <div className="space-y-3">
      {flow.audiences!.map((audience) => (
        <Card key={audience.id}>
          <p className="text-lg font-semibold">{audience.name}</p>
          <p className="mt-2 text-[15px] text-muted-foreground">{audience.offer}</p>
          <div className="mt-4 rounded-lg bg-muted/60 p-3">
            <Label>Pain</Label>
            <p className="mt-1 text-[15px]">{audience.pain}</p>
          </div>
          <Label className="mt-4">Criteria</Label>
          <ul className="mt-2 space-y-1.5">
            {audience.criteria.map((item) => (
              <li key={item} className="flex gap-2 text-[15px]"><Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{item}</li>
            ))}
          </ul>
          <div className="mt-4"><Chips items={audience.examples} /></div>
        </Card>
      ))}
    </div>
  )
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")

/** Leads: the companies found for each audience, with the person to contact at each. */
export function LeadsSection() {
  const { flow, error, signedOut, act } = useFlow()
  return (
    <FlowGate flow={flow} error={error} signedOut={signedOut} step="customers">
      {flow && <LeadsList flow={flow} act={act} />}
    </FlowGate>
  )
}

function LeadsList({ flow, act }: { flow: FlowState; act: Act }) {
  const customers = flow.customers ?? []
  if (!customers.length) return <Card><p className="text-sm text-muted-foreground">No companies found.</p></Card>
  const people = flow.people ?? []
  const withEmail = people.filter((person) => person.email).length
  const unchecked = people.filter((person) => !person.email && person.emailSource !== "none").length
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{customers.length} companies · {people.length} decision makers · {withEmail} emails</p>
        <div className="flex flex-wrap gap-2">
          {unchecked > 0 && <FindEmailsButton act={act} label={`Find ${unchecked} ${unchecked === 1 ? "email" : "emails"}`} />}
          {people.length > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={() => download("leads.csv", csv([
              ["name", "title", "company", "website", "email", "linkedin"],
              ...people.map((person) => [person.name, person.title, person.company, customers.find((c) => c.id === person.customerId)?.url ?? "", person.email ?? "", person.linkedin]),
            ]))}>
              <Download className="size-4" aria-hidden="true" /> Export
            </Button>
          )}
        </div>
      </div>
      {(flow.audiences ?? []).map((audience) => {
        const rows = customers.filter((item) => item.audienceId === audience.id)
        if (!rows.length) return null
        return (
          <Card key={audience.id} className="p-0">
            <div className="border-b border-border px-5 py-3">
              <p className="text-sm font-semibold">{audience.name} · {rows.length}</p>
              <p className="text-xs text-muted-foreground">{audience.pain}</p>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((item) => {
                const person = people.find((p) => p.customerId === item.id)
                return (
                  <li key={item.id} className="flex gap-3 px-5 py-4">
                    <Favicon url={item.url} name={item.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="font-semibold">{item.name}</p>
                        {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">{hostOf(item.url)}</a>}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                      {item.country && <span className="mt-1.5 inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.country}</span>}
                      {person ? (
                        <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground" aria-hidden="true">{initials(person.name)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 text-sm font-medium">
                              {person.name}
                              <a href={person.linkedin} target="_blank" rel="noreferrer" aria-label={`${person.name} on LinkedIn`}><SocialIcon platform="linkedin" /></a>
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{person.title}</p>
                            <PersonEmail person={person} act={act} />
                          </div>
                          <RemoveButton label={`Remove ${person.name}`} onClick={() => void act({ action: "remove", step: "people", id: person.id })} />
                        </div>
                      ) : (
                        flow.people && <p className="mt-2 text-xs text-muted-foreground">No contact found.</p>
                      )}
                    </div>
                    <RemoveButton label={`Remove ${item.name}`} onClick={() => void act({ action: "remove", step: "customers", id: item.id })} />
                  </li>
                )
              })}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}

function FindEmailsButton({ act, label, ids, variant = "outline" }: { act: Act; label: string; ids?: string[]; variant?: "outline" | "link" }) {
  const [busy, setBusy] = useState(false)
  async function find() {
    setBusy(true)
    await act({ action: "find-emails", ...(ids ? { ids } : {}) })
    setBusy(false)
  }
  if (variant === "link") {
    return (
      <button type="button" disabled={busy} onClick={() => void find()} className="text-xs font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-60">
        {busy ? "Looking..." : label}
      </button>
    )
  }
  return (
    <Button type="button" size="sm" disabled={busy} onClick={() => void find()}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Mail className="size-4" aria-hidden="true" />} {busy ? "Finding..." : label}
    </Button>
  )
}

/** A decision maker's address, where it came from, or a way to look for one. */
function PersonEmail({ person, act }: { person: Person; act: Act }) {
  if (person.email) {
    return (
      <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <button type="button" className="truncate font-medium text-foreground hover:underline" title="Copy" onClick={() => copy(person.email!)}>{person.email}</button>
        <span className={cn("rounded px-1.5 py-0.5", person.emailSource === "hunter" && (person.emailScore ?? 0) >= 80 ? "bg-foreground text-background" : "bg-background text-muted-foreground")}>
          {person.emailSource === "website" ? "From their website" : person.emailScore !== undefined ? `${person.emailScore}% sure` : "Found"}
        </span>
      </p>
    )
  }
  if (person.emailSource === "none") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        No email. <FindEmailsButton act={act} ids={[person.id]} label="Look again" variant="link" />
      </p>
    )
  }
  return <p className="mt-1"><FindEmailsButton act={act} ids={[person.id]} label="Find email" variant="link" /></p>
}

/** Outreach: one email for each decision maker. */
export function OutreachSection() {
  const { flow, error, signedOut, act } = useFlow()
  return (
    <FlowGate flow={flow} error={error} signedOut={signedOut} step="emails">
      {flow && <EmailsStep flow={flow} act={act} />}
    </FlowGate>
  )
}

/** Ads: one ad for each audience, aimed at the same companies. */
export function AdsSection() {
  const { flow, error, signedOut, act } = useFlow()
  return (
    <FlowGate flow={flow} error={error} signedOut={signedOut} step="ads">
      {flow && <AdsStep flow={flow} act={act} />}
    </FlowGate>
  )
}

/** On Social Media, above the accounts: who to follow first and this month's posts. Nothing until Marketing has run. */
export function MarketingSocialPanel() {
  const { flow, act } = useFlow()
  if (!flow?.social) return null
  return <SocialStep flow={flow} act={act} />
}

function EmailsStep({ flow, act }: { flow: FlowState; act: Act }) {
  const emails = flow.emails!
  if (!emails.length) return <Card><p className="text-sm text-muted-foreground">No emails yet.</p></Card>
  return (
    <div className="space-y-3">
      {emails.map((email) => <EmailCard key={email.id} email={email} person={flow.people?.find((p) => p.id === email.personId)} act={act} />)}
    </div>
  )
}

function EmailCard({ email, person, act }: { email: NonNullable<FlowState["emails"]>[number]; person?: NonNullable<FlowState["people"]>[number]; act: Act }) {
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState(email.subject)
  const [body, setBody] = useState(email.body)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await act({ action: "email", id: email.id, subject, body })
    setSaving(false)
    setEditing(false)
  }

  return (
    <Card className="p-0">
      <div className="flex gap-4 border-b border-border px-5 py-3 text-sm">
        <span className="w-12 shrink-0 text-muted-foreground">To</span>
        <span className="min-w-0 flex-1 truncate">
          {person?.name}{person && <span className="text-muted-foreground"> · {person.company}</span>}
          {person?.email ? <span className="block truncate text-muted-foreground">{person.email}</span> : person && <span className="block text-muted-foreground">No email</span>}
        </span>
      </div>
      <div className="flex items-center gap-4 border-b border-border px-5 py-3 text-sm">
        <span className="w-12 shrink-0 text-muted-foreground">Subj</span>
        {editing ? <Input value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Subject" className="h-8" /> : <span className="font-semibold">{email.subject}</span>}
      </div>
      <div className="px-5 py-4">
        {editing ? (
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} aria-label="Email" rows={10} />
        ) : (
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{email.body}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save"}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setSubject(email.subject); setBody(email.body) }}>Cancel</Button>
            </>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" aria-hidden="true" /> Edit</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(`${email.subject}\n\n${email.body}`)}><Copy className="size-4" aria-hidden="true" /> Copy</Button>
              <Button asChild size="sm" variant="outline">
                <a href={`mailto:${person?.email ? encodeURIComponent(person.email) : ""}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`}><Mail className="size-4" aria-hidden="true" /> Open in email</a>
              </Button>
              <button type="button" className="ml-auto text-sm text-muted-foreground hover:text-foreground" onClick={() => void act({ action: "remove", step: "emails", id: email.id })}>Remove</button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

function SocialStep({ flow, act }: { flow: FlowState; act: Act }) {
  const people = flow.people ?? []
  return (
    <div className="space-y-3">
      {people.length > 0 && (
        <Card>
          <Label>Follow</Label>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {people.map((person) => (
              <li key={person.id}>
                <a href={person.linkedin} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm hover:bg-muted">
                  <SocialIcon platform="linkedin" />
                  <span className="min-w-0 flex-1 truncate"><span className="font-medium">{person.name}</span> · {person.company}</span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card>
        <Label>Posts</Label>
        <ol className="mt-3 space-y-4">
          {flow.social!.posts.map((post, index) => (
            <li key={post.id} className="rounded-lg bg-muted/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{post.title}</p>
                <button type="button" aria-label="Copy post" title="Copy" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => copy(post.text)}><Copy className="size-4" aria-hidden="true" /></button>
              </div>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{post.text}</p>
              <Thumbnail image={post.image} alt={post.title} className="mt-3" onChange={(url) => act({ action: "image", step: "social", id: post.id, url })} />
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}

/** The post or ad's image: the uploaded one, or a plain placeholder, with upload, replace and remove. */
function Thumbnail({ image, alt, className, onChange }: { image?: string; alt: string; className?: string; onChange: (url: string) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) return toast.error("Choose an image.")
    if (file.size > CLIENT_FILE_MAX_BYTES) return toast.error("That image is too large.")
    setBusy(true)
    try {
      await onChange(await uploadFileToStorage(file))
    } catch {
      toast.error("Couldn't upload that image.")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div className={cn("relative aspect-square w-full overflow-hidden rounded-lg bg-muted", className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={alt} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground"><ImageIcon className="size-10" aria-hidden="true" /></div>
      )}
      <div className="absolute bottom-3 right-3 flex gap-2">
        {image && <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void onChange("")}>Remove</Button>}
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />} {image ? "Replace" : "Upload"}
        </Button>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
    </div>
  )
}

function csv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function AdsStep({ flow, act }: { flow: FlowState; act: Act }) {
  const research = flow.research!
  return (
    <div className="space-y-3">
      {flow.ads!.map((ad) => {
        const audience = flow.audiences?.find((item) => item.id === ad.audienceId)
        const companies = (flow.customers ?? []).filter((item) => item.audienceId === ad.audienceId)
        return (
          <Card key={ad.id}>
            <Label>{audience?.name}</Label>
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-2 px-4 pt-3">
                <Favicon url={research.website} name={research.name} />
                <div>
                  <p className="text-sm font-semibold leading-tight">{research.name}</p>
                  <p className="text-xs text-muted-foreground">Promoted</p>
                </div>
              </div>
              <p className="px-4 py-3 text-sm">{ad.text}</p>
              <Thumbnail image={ad.image} alt={ad.headline} className="rounded-none" onChange={(url) => act({ action: "image", step: "ads", id: ad.id, url })} />
              <div className="flex items-center justify-between gap-3 bg-muted/60 px-4 py-3">
                <p className="min-w-0 text-sm font-semibold">{ad.headline}</p>
                <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium">{ad.cta}</span>
              </div>
            </div>
            <Label className="mt-4">Target job titles</Label>
            <Chips items={ad.jobTitles} />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => copy(`${ad.text}\n\n${ad.headline}\n${ad.cta}`)}><Copy className="size-4" aria-hidden="true" /> Copy ad</Button>
              {companies.length > 0 && (
                <Button type="button" size="sm" variant="outline" onClick={() => download(`${(audience?.name || "companies").toLowerCase().replace(/\W+/g, "-")}.csv`, csv([["companyname", "companywebsite"], ...companies.map((item) => [item.name, item.url])]))}>
                  <Download className="size-4" aria-hidden="true" /> Company list ({companies.length})
                </Button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
