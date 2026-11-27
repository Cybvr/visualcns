"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { Check, ChevronDown, Copy, Download, ExternalLink, Loader2, Mail, Pencil, Plus, RotateCcw, Search, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { SocialConnectDialog } from "@/components/company/social-connect-dialog"
import { SocialIcon } from "@/components/company/social-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FLOW_STEPS, hostOf, type FlowState, type FlowStep } from "@/lib/marketing-flow"
import { platformLabel } from "@/lib/social"
import { useSocialAccounts } from "@/lib/social-client"
import { cn } from "@/lib/utils"

/*
 * Marketing: the company enters its website, then each step runs in turn and
 * ticks off: research, competitors, audiences, customers, decision makers,
 * emails, social media and ads. Every result can be checked and trimmed.
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

export function MarketingFlowSection() {
  const { company } = useCompanyPage()
  const { user, loading: authLoading } = useAuth()
  const api = useFlowApi(company.id)
  const [flow, setFlow] = useState<FlowState | null>(null)
  const [loadError, setLoadError] = useState("")
  const [running, setRunning] = useState<FlowStep | null>(null)
  const [failed, setFailed] = useState<{ step: FlowStep; message: string } | null>(null)
  const [open, setOpen] = useState<FlowStep | null>(null)
  const [website, setWebsite] = useState(company.website ?? "")
  const [editingSite, setEditingSite] = useState(false)

  useEffect(() => {
    if (!user) return
    api()
      .then(({ flow: loaded }) => {
        setFlow(loaded)
        if (loaded.website) setWebsite(loaded.website)
        const last = [...FLOW_STEPS].reverse().find((step) => loaded[step.key])
        setOpen(last?.key ?? null)
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Couldn't load Marketing."))
  }, [api, user])

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

  async function act(body: Record<string, unknown>) {
    try {
      const { flow: next } = await api(body)
      setFlow(next)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that.")
    }
  }

  function start(event: FormEvent) {
    event.preventDefault()
    if (!website.trim() || running) return
    setEditingSite(false)
    void runFrom("research", website.trim())
  }

  if (!authLoading && !user) return <p className="mt-6 text-sm text-muted-foreground">Please sign in to use Marketing.</p>
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
      {!started || editingSite ? (
        <form onSubmit={start} className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Find your next customers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your website. We research your business and competitors, pick who to go after, find the companies and the people who decide, and write the emails, posts and ads.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="yourcompany.com" aria-label="Your website" inputMode="url" autoComplete="url" className="h-11 flex-1" />
            <Button type="submit" className="h-11" disabled={!website.trim() || Boolean(running)}>Start</Button>
            {editingSite && <Button type="button" variant="ghost" className="h-11" onClick={() => setEditingSite(false)}>Cancel</Button>}
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{hostOf(flow.website)}</span>
            {" · "}
            {running ? `Working on step ${FLOW_STEPS.findIndex((step) => step.key === running) + 1} of ${FLOW_STEPS.length}` : `${done} of ${FLOW_STEPS.length} steps done`}
          </p>
          <Button type="button" variant="outline" size="sm" disabled={Boolean(running)} onClick={() => setEditingSite(true)}>
            <RotateCcw className="size-4" aria-hidden="true" /> Start over
          </Button>
        </div>
      )}

      {started && (
        <ol className="mt-5 divide-y divide-border">
          {FLOW_STEPS.map((step, index) => {
            const isDone = has(flow, step.key)
            const isRunning = running === step.key
            const isFailed = failed?.step === step.key
            const isOpen = open === step.key && isDone
            return (
              <li key={step.key} className="py-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md py-3 text-left disabled:cursor-default"
                  disabled={!isDone}
                  aria-expanded={isDone ? isOpen : undefined}
                  onClick={() => setOpen(isOpen ? null : step.key)}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isDone ? "bg-emerald-600 text-white" : isFailed ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {isRunning ? <Loader2 className="size-4 animate-spin" /> : isDone ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span className={cn("flex-1 text-base font-semibold sm:text-lg", !isDone && !isRunning && "text-muted-foreground")}>{index + 1}. {step.title}</span>
                  {isDone && <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden="true" />}
                </button>
                {isFailed && (
                  <div className="mb-3 ml-10 flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-destructive">{failed.message}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => void runFrom(step.key)}>Try again</Button>
                  </div>
                )}
                {isOpen && (
                  <div className="pb-5">
                    <StepBody step={step.key} flow={flow} act={act} />
                    {!running && (
                      <button type="button" className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => void runFrom(step.key)}>
                        <RotateCcw className="size-3.5" aria-hidden="true" /> Redo from this step
                      </button>
                    )}
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

type Act = (body: Record<string, unknown>) => Promise<void>

function StepBody({ step, flow, act }: { step: FlowStep; flow: FlowState; act: Act }) {
  switch (step) {
    case "research": return <ResearchStep flow={flow} />
    case "competitors": return <CompetitorsStep flow={flow} act={act} />
    case "audiences": return <AudiencesStep flow={flow} />
    case "customers": return <CustomersStep flow={flow} act={act} />
    case "people": return <PeopleStep flow={flow} act={act} />
    case "emails": return <EmailsStep flow={flow} act={act} />
    case "social": return <SocialStep flow={flow} />
    case "ads": return <AdsStep flow={flow} />
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

function Favicon({ url, name }: { url: string; name: string }) {
  const host = hostOf(url)
  if (!host) return <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`} alt="" className="size-6 shrink-0 rounded" loading="lazy" />
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

function ResearchStep({ flow }: { flow: FlowState }) {
  const research = flow.research!
  return (
    <Card>
      <div className="flex items-center gap-3">
        <Favicon url={research.website} name={research.name} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{research.name}</p>
          <a href={research.website} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">{hostOf(research.website)}</a>
        </div>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed">{research.summary}</p>
      <Label className="mt-5">Keywords</Label>
      <Chips items={research.keywords} />
    </Card>
  )
}

function CompetitorsStep({ flow, act }: { flow: FlowState; act: Act }) {
  const data = flow.competitors!
  return (
    <Card>
      <Label>Your product</Label>
      <p className="mt-1 text-lg font-semibold">{data.product}</p>
      <ul className="mt-3 space-y-2">
        {data.points.map((point) => (
          <li key={point} className="flex gap-2 text-[15px]"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />{point}</li>
        ))}
      </ul>
      <Label className="mt-6">How buyers search</Label>
      <Chips items={data.searches} icon={<Search className="size-3.5" aria-hidden="true" />} />
      <Label className="mt-6">Competitors · {data.competitors.length} found</Label>
      {data.competitors.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No clear competitors turned up in search.</p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {data.competitors.map((item) => (
            <li key={item.url} className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
              <Favicon url={item.url} name={item.name} />
              <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{hostOf(item.url)}</a>
              <RemoveButton label={`Remove ${item.name}`} onClick={() => void act({ action: "remove", step: "competitors", id: item.url })} />
            </li>
          ))}
        </ul>
      )}
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
              <li key={item} className="flex gap-2 text-[15px]"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />{item}</li>
            ))}
          </ul>
          <Chips items={audience.examples} />
        </Card>
      ))}
    </div>
  )
}

function CustomersStep({ flow, act }: { flow: FlowState; act: Act }) {
  const customers = flow.customers!
  if (!customers.length) return <Card><p className="text-sm text-muted-foreground">No matching companies turned up. Try redoing from Define audiences.</p></Card>
  return (
    <div className="space-y-4">
      {flow.audiences!.map((audience) => {
        const rows = customers.filter((item) => item.audienceId === audience.id)
        if (!rows.length) return null
        return (
          <Card key={audience.id} className="p-0">
            <p className="border-b border-border px-5 py-3 text-sm font-semibold">{audience.name} · {rows.length}</p>
            <ul className="divide-y divide-border">
              {rows.map((item) => (
                <li key={item.id} className="flex gap-3 px-5 py-3">
                  <Favicon url={item.url} name={item.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-semibold">{item.name}</p>
                      {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">{hostOf(item.url)}</a>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                    {item.country && <span className="mt-1.5 inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.country}</span>}
                  </div>
                  <RemoveButton label={`Remove ${item.name}`} onClick={() => void act({ action: "remove", step: "customers", id: item.id })} />
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")

function PeopleStep({ flow, act }: { flow: FlowState; act: Act }) {
  const people = flow.people!
  if (!people.length) return <Card><p className="text-sm text-muted-foreground">No decision makers turned up for these companies. Try redoing from Find potential customers.</p></Card>
  return (
    <Card className="p-0">
      <ul className="divide-y divide-border">
        {people.map((person) => (
          <li key={person.id} className="flex items-center gap-3 px-5 py-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground" aria-hidden="true">{initials(person.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold">
                {person.name}
                <a href={person.linkedin} target="_blank" rel="noreferrer" aria-label={`${person.name} on LinkedIn`}><SocialIcon platform="linkedin" /></a>
              </p>
              <p className="truncate text-sm text-muted-foreground">{person.title} at {person.company}</p>
            </div>
            <RemoveButton label={`Remove ${person.name}`} onClick={() => void act({ action: "remove", step: "people", id: person.id })} />
          </li>
        ))}
      </ul>
    </Card>
  )
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
        <span className="w-10 text-muted-foreground">To</span>
        <span className="min-w-0 flex-1 truncate">{person?.name}{person && <span className="text-muted-foreground"> · {person.company}</span>}</span>
      </div>
      <div className="flex items-center gap-4 border-b border-border px-5 py-3 text-sm">
        <span className="w-10 text-muted-foreground">Subj</span>
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
                <a href={`mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`}><Mail className="size-4" aria-hidden="true" /> Open in email</a>
              </Button>
              <button type="button" className="ml-auto text-sm text-muted-foreground hover:text-foreground" onClick={() => void act({ action: "remove", step: "emails", id: email.id })}>Remove</button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

const SOCIAL_PLATFORMS = ["linkedin", "instagram", "facebook", "twitter"]

function SocialStep({ flow }: { flow: FlowState }) {
  const { company } = useCompanyPage()
  const { info } = useSocialAccounts(company.id)
  const [connectOpen, setConnectOpen] = useState(false)
  const accounts = info?.accounts ?? []
  const people = flow.people ?? []
  return (
    <div className="space-y-3">
      <Card>
        <Label>Your accounts</Label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {accounts.map((account) => (
            <span key={account.id} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
              <SocialIcon platform={account.platform} /> {account.username || platformLabel(account.platform)}
            </span>
          ))}
          {info?.configured && (
            <Button type="button" size="sm" variant="outline" onClick={() => setConnectOpen(true)}><Plus className="size-4" aria-hidden="true" /> Connect</Button>
          )}
          {info && !info.configured && accounts.length === 0 && <span className="text-sm text-muted-foreground">Social accounts aren't set up yet.</span>}
        </div>
      </Card>
      {people.length > 0 && (
        <Card>
          <Label>Warm them up first</Label>
          <p className="mt-1 text-sm text-muted-foreground">Follow these people and comment on a recent post a few days before you email.</p>
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
        <Label>This month&apos;s posts</Label>
        <ol className="mt-3 space-y-4">
          {flow.social!.posts.map((post, index) => (
            <li key={post.id} className="rounded-lg bg-muted/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">Week {index + 1}: {post.title}</p>
                <button type="button" aria-label="Copy post" title="Copy" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => copy(post.text)}><Copy className="size-4" aria-hidden="true" /></button>
              </div>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{post.text}</p>
            </li>
          ))}
        </ol>
      </Card>
      <SocialConnectDialog companyId={company.id} platforms={SOCIAL_PLATFORMS} open={connectOpen} onOpenChange={setConnectOpen} title="Connect an account" text="Sign in on the platform, then you'll come straight back here." />
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

function AdsStep({ flow }: { flow: FlowState }) {
  const research = flow.research!
  return (
    <div className="space-y-3">
      {flow.ads!.map((ad) => {
        const audience = flow.audiences?.find((item) => item.id === ad.audienceId)
        const companies = (flow.customers ?? []).filter((item) => item.audienceId === ad.audienceId)
        return (
          <Card key={ad.id}>
            <Label>{audience?.name} · LinkedIn</Label>
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-2 px-4 pt-3">
                <Favicon url={research.website} name={research.name} />
                <div>
                  <p className="text-sm font-semibold leading-tight">{research.name}</p>
                  <p className="text-xs text-muted-foreground">Promoted</p>
                </div>
              </div>
              <p className="px-4 py-3 text-sm">{ad.text}</p>
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
            {companies.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Upload the company list in LinkedIn Campaign Manager to show this ad to the same companies you email.</p>}
          </Card>
        )
      })}
    </div>
  )
}
