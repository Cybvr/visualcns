"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { ExternalLink, Inbox, Loader2, RefreshCw, Star } from "lucide-react"
import { toast } from "sonner"

import { useCompanyPage } from "@/components/company/company-page-context"
import { formatWhen } from "@/components/company/publish-post-dialog"
import { SocialAccounts } from "@/components/company/social-accounts"
import { PillFilter, SocialOverview } from "@/components/company/social-overview"
import { CollectionView } from "@/components/dashboard/collection-view"
import type { SortOption } from "@/components/dashboard/filter-bar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { platformLabel, type InboxItem, type InboxKind } from "@/lib/social"
import { useSocialRequest } from "@/lib/social-client"
import { cn } from "@/lib/utils"

const VIEWS = [
  { key: "overview", label: "Posts" },
  { key: "inbox", label: "Inbox" },
] as const

type View = (typeof VIEWS)[number]["key"]

/**
 * The company's social side: posts, account performance, and one inbox for
 * DMs, comments, Google reviews and mentions.
 */
export function SocialSection() {
  const { company, updateParams } = useCompanyPage()
  const searchParams = useSearchParams()
  const requested = searchParams.get("view")
  const view: View = VIEWS.some((item) => item.key === requested) ? requested as View : "overview"

  return (
    <div className="mt-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <SocialAccounts companyId={company.id} variant="compact" />
      </div>
      <div className="mt-5">{view === "inbox" ? <SocialInbox /> : <SocialOverview />}</div>
    </div>
  )
}

const FILTERS: { value: InboxKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "message", label: "Messages" },
  { value: "comment", label: "Comments" },
  { value: "review", label: "Reviews" },
  { value: "mention", label: "Mentions" },
]

function searchInbox(item: InboxItem) {
  return [item.authorName, item.text, platformLabel(item.platform)]
}

const INBOX_SORTS: SortOption<InboxItem>[] = [
  { value: "at", label: "Date", get: (item) => item.at, ascLabel: "Oldest", descLabel: "Newest" },
  { value: "author", label: "From", get: (item) => item.authorName, ascLabel: "A–Z", descLabel: "Z–A" },
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

  const ofKind = useMemo(() => (items ?? []).filter((item) => filter === "all" || item.kind === filter), [items, filter])

  return (
    <CollectionView
      className="min-w-0"
      items={ofKind}
      getKey={(item) => item.id}
      searchFields={searchInbox}
      searchPlaceholder="Search inbox"
      viewKey="social-inbox"
      // Rows open in place to reply, so the inbox is always a list.
      fixedView="list"
      sorts={INBOX_SORTS}
      defaultSort="at"
      filters={<PillFilter options={FILTERS} value={filter} onChange={setFilter} />}
      actions={
        <Button type="button" variant="ghost" size="icon" className="bg-transparent text-foreground hover:bg-transparent" onClick={() => void load()} disabled={loading} aria-label="Refresh inbox" title="Refresh inbox">
          <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
        </Button>
      }
      before={error ? <p className="mb-3 text-sm text-muted-foreground">{error}</p> : undefined}
      loading={items === null && loading}
      empty={{ icon: Inbox, title: items?.length ? "Nothing here" : "No messages yet" }}
      card={(item) => ({ title: item.authorName })}
      listItem={(item) => (
        <InboxRow item={item} open={openId === item.id} onToggle={() => setOpenId(openId === item.id ? null : item.id)} onReplied={() => setItems((current) => current?.map((row) => row.id === item.id ? { ...row, replied: true } : row) ?? null)} />
      )}
    />
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
    <div className="border-b border-border px-4 py-3">
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
    </div>
  )
}
