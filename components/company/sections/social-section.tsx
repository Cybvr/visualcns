"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, RefreshCw, Star } from "lucide-react"
import { toast } from "sonner"

import { useCompanyPage } from "@/components/company/company-page-context"
import { formatWhen, PublishPostDialog, publishTone } from "@/components/company/publish-post-dialog"
import { SocialOverview } from "@/components/company/social-overview"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { watchCompanyCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { platformLabel, PUBLISH_LABELS, type InboxItem, type InboxKind } from "@/lib/social"
import { useSocialRequest } from "@/lib/social-client"
import { cn } from "@/lib/utils"

const VIEWS = [
  { key: "overview", label: "Posts" },
  { key: "calendar", label: "Calendar" },
  { key: "inbox", label: "Inbox" },
] as const

type View = (typeof VIEWS)[number]["key"]

/**
 * The company's social side: followers, a New post button and every post
 * with its numbers; a calendar of what's going out; and one inbox for DMs,
 * comments, Google reviews and mentions.
 */
export function SocialSection() {
  const { updateParams } = useCompanyPage()
  const searchParams = useSearchParams()
  const requested = searchParams.get("view")
  const view: View = VIEWS.some((item) => item.key === requested) ? requested as View : "overview"

  return (
    <div className="mt-5 min-w-0">
      <div role="tablist" aria-label="Social" className="inline-flex rounded-lg bg-muted p-1">
        {VIEWS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={view === item.key}
            onClick={() => updateParams({ view: item.key === "overview" ? null : item.key }, true)}
            className="h-8 rounded-md px-3 text-sm text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-background aria-selected:font-medium aria-selected:text-foreground aria-selected:shadow-sm"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-5">{view === "inbox" ? <SocialInbox /> : view === "calendar" ? <SocialCalendar /> : <SocialOverview />}</div>
    </div>
  )
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/** When a post shows on the calendar: when it went out, or when it is due to. */
function postTime(post: CampaignCreative) {
  const iso = post.publish?.publishedAt || post.publish?.scheduledAt
  const time = iso ? Date.parse(iso) : NaN
  return Number.isNaN(time) ? null : new Date(time)
}

function SocialCalendar() {
  const { company } = useCompanyPage()
  const [posts, setPosts] = useState<CampaignCreative[]>([])
  const [loaded, setLoaded] = useState(false)
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    setLoaded(false)
    return watchCompanyCampaignCreatives(
      company.id,
      (rows) => { setPosts(rows.filter((item) => item.type === "text")); setLoaded(true) },
      () => { setPosts([]); setLoaded(true) },
    )
  }, [company.id])

  const byDay = useMemo(() => {
    const days = new Map<string, CampaignCreative[]>()
    for (const post of posts) {
      const time = postTime(post)
      if (!time) continue
      const key = dayKey(time)
      days.set(key, [...(days.get(key) ?? []), post])
    }
    for (const list of days.values()) list.sort((a, b) => (postTime(a)?.getTime() ?? 0) - (postTime(b)?.getTime() ?? 0))
    return days
  }, [posts])
  const ready = posts.filter((post) => post.status === "Approved" && (!post.publish || post.publish.state === "failed"))

  // Six weeks from the Monday on or before the 1st.
  const start = new Date(month)
  start.setDate(1 - ((month.getDay() + 6) % 7))
  const cells = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  const today = dayKey(new Date())

  if (!loaded) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading</p>

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <section aria-label="Calendar" className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="size-4" aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <div className="grid min-w-[42rem] grid-cols-7 overflow-hidden rounded-lg border border-border text-xs">
            {WEEKDAYS.map((day) => <div key={day} className="border-b border-border bg-muted/40 px-2 py-1.5 font-medium text-muted-foreground">{day}</div>)}
            {cells.map((date) => {
              const key = dayKey(date)
              const items = byDay.get(key) ?? []
              return (
                <div key={key} className={cn("min-h-24 border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0", date.getMonth() !== month.getMonth() && "bg-muted/20 text-muted-foreground")}>
                  <p className={cn("mb-1 inline-grid size-6 place-items-center rounded-full", key === today && "bg-foreground font-medium text-background")}>{date.getDate()}</p>
                  <div className="space-y-1">
                    {items.map((post) => (
                      <button key={post.id} type="button" onClick={() => setOpenId(post.id)} className={cn("block w-full truncate rounded px-1.5 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring", publishTone[post.publish?.state ?? "scheduled"])}>
                        {postTime(post)?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} {post.title || "Post"}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section aria-label="Ready to schedule" className="min-w-0">
        <h2 className="text-base font-semibold">Ready to schedule</h2>
        {ready.length ? (
          <ul className="mt-3 space-y-2">
            {ready.map((post) => (
              <li key={post.id}>
                <button type="button" onClick={() => setOpenId(post.id)} className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="block truncate font-medium">{post.title || "Post"}</span>
                  <span className="block truncate text-xs text-muted-foreground">{post.publish?.state === "failed" ? PUBLISH_LABELS.failed : "Approved"}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Nothing waiting.</p>
        )}
      </section>

      <PublishPostDialog post={posts.find((post) => post.id === openId) ?? null} companyId={company.id} open={openId !== null} onOpenChange={(open) => { if (!open) setOpenId(null) }} />
    </div>
  )
}

const FILTERS: { key: InboxKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "message", label: "Messages" },
  { key: "comment", label: "Comments" },
  { key: "review", label: "Reviews" },
  { key: "mention", label: "Mentions" },
]

function SocialInbox() {
  const { company } = useCompanyPage()
  const request = useSocialRequest()
  const [items, setItems] = useState<InboxItem[] | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<InboxKind | "all">("all")
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await request<{ items: InboxItem[]; missed?: string[] }>(`inbox?companyId=${encodeURIComponent(company.id)}`)
      setItems(data.items)
      setError(data.missed?.length ? `Couldn't load the latest ${data.missed.join(", ")}.` : "")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't load the inbox.")
    } finally {
      setLoading(false)
    }
  }, [company.id, request])

  useEffect(() => { void load() }, [load])

  const shown = (items ?? []).filter((item) => filter === "all" || item.kind === filter)

  return (
    <div className="min-w-0 max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={filter === item.key}
            onClick={() => setFilter(item.key)}
            className="rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-foreground aria-pressed:text-background"
          >
            {item.label}
          </button>
        ))}
        <Button type="button" variant="ghost" size="icon" className="ml-auto size-8" onClick={() => void load()} disabled={loading} aria-label="Refresh inbox">
          <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-muted-foreground">{error}</p>}

      {items === null && loading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading</p>
      ) : !shown.length ? (
        <p className="mt-6 text-sm text-muted-foreground">{items?.length ? "Nothing here." : "No messages yet. Connect accounts on the Account page and new ones will show here."}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {shown.map((item) => (
            <InboxRow key={item.id} item={item} open={openId === item.id} onToggle={() => setOpenId(openId === item.id ? null : item.id)} onReplied={() => setItems((current) => current?.map((row) => row.id === item.id ? { ...row, replied: true } : row) ?? null)} />
          ))}
        </ul>
      )}
    </div>
  )
}

const KIND_LABELS: Record<InboxKind, string> = { message: "Message", comment: "Comment", review: "Review", mention: "Mention" }

function InboxRow({ item, open, onToggle, onReplied }: { item: InboxItem; open: boolean; onToggle: () => void; onReplied: () => void }) {
  const { company } = useCompanyPage()
  const request = useSocialRequest()
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const canReply = item.kind !== "mention"

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      await request("inbox", { method: "POST", body: { companyId: company.id, item, text: reply } })
      toast.success(item.kind === "review" ? "Reply sent. Google may take a moment to show it." : "Reply sent.")
      setReply("")
      onReplied()
      onToggle()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't send the reply.")
    } finally {
      setSending(false)
    }
  }

  return (
    <li className="px-4 py-3">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="font-medium">{item.authorName}</span>
            {item.rating ? (
              <span className="inline-flex items-center gap-0.5 text-amber-600" aria-label={`${item.rating} stars`}>
                {Array.from({ length: 5 }, (_, index) => <Star key={index} className={cn("size-3.5", index < item.rating! ? "fill-current" : "opacity-30")} aria-hidden="true" />)}
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">{KIND_LABELS[item.kind]} · {platformLabel(item.platform)} · {formatWhen(new Date(item.at).toISOString())}</span>
          </p>
          <p className={cn("mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground", !open && "line-clamp-2")}>{item.text || "(no text)"}</p>
        </div>
        {item.replied && <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">Replied</span>}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {item.permalink && (
            <a href={item.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              Open on {platformLabel(item.platform)} <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
          {canReply ? (
            <form onSubmit={send} className="space-y-2">
              <Textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply" rows={3} aria-label="Reply" />
              <Button type="submit" size="sm" disabled={sending || !reply.trim()}>
                {sending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Reply
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">Reply to mentions on the platform itself.</p>
          )}
        </div>
      )}
    </li>
  )
}
