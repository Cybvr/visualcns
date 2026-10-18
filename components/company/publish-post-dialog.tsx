"use client"

import { useEffect, useState, type FormEvent } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CampaignCreative } from "@/lib/campaign-creatives"
import { platformInfo, platformLabel, PUBLISH_LABELS, type SocialAccount } from "@/lib/social"
import { useSocialAccounts } from "@/lib/social-client"
import { cn } from "@/lib/utils"

export const publishTone: Record<string, string> = {
  scheduled: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  publishing: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  partial: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  failed: "bg-red-500/10 text-red-700 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground",
}

export function PublishPill({ post }: { post: Pick<CampaignCreative, "publish"> }) {
  if (!post.publish) return null
  return <span className={cn("inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", publishTone[post.publish.state])}>{PUBLISH_LABELS[post.publish.state]}</span>
}

/** "2026-10-18T14:30" for a datetime-local input, in the viewer's own time. */
function localInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatWhen(iso?: string) {
  if (!iso) return ""
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

/**
 * Sends an approved campaign post to the company's social accounts, now or
 * at a set time, with a preview of how it reads on each platform. Once sent
 * it shows where the post went, and a scheduled post can be cancelled.
 */
export function PublishPostDialog({ post, companyId, open, onOpenChange }: { post: CampaignCreative | null; companyId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { info, error, loading, request } = useSocialAccounts(companyId, open)
  const [selected, setSelected] = useState<string[]>([])
  const [when, setWhen] = useState<"now" | "later">("later")
  const [at, setAt] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected([])
    setWhen("later")
    setAt(localInputValue(new Date(Date.now() + 60 * 60 * 1000)))
  }, [open, post?.id])

  const accounts = (info?.accounts ?? []).filter((account) => account.status !== "disconnected")
  const chosen = accounts.filter((account) => selected.includes(account.id))
  const publish = post?.publish
  const sent = publish && publish.state !== "failed" && publish.state !== "cancelled"

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!post || !chosen.length) return
    setBusy(true)
    try {
      const scheduledAt = when === "later" ? new Date(at).toISOString() : undefined
      await request("posts", { method: "POST", body: { companyId, creativeId: post.id, accountIds: selected, scheduledAt } })
      toast.success(when === "later" ? "Post scheduled." : "Posting now.")
      onOpenChange(false)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't send the post.")
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (!post) return
    setBusy(true)
    try {
      await request("posts", { method: "DELETE", body: { companyId, creativeId: post.id } })
      toast.success("Scheduled post cancelled.")
      onOpenChange(false)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't cancel.")
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    if (!post) return
    setBusy(true)
    try {
      await request(`posts?companyId=${encodeURIComponent(companyId)}&creativeId=${encodeURIComponent(post.id)}`)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't check the post.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{sent ? "Social post" : "Schedule post"}</DialogTitle>
          <DialogDescription>{post?.title || "Post"}</DialogDescription>
        </DialogHeader>

        {!post ? null : sent && publish ? (
          <div className="space-y-4">
            <p className="text-sm">
              <PublishPill post={post} />
              <span className="ml-2 text-muted-foreground">
                {publish.state === "scheduled" ? `Goes out ${formatWhen(publish.scheduledAt)}` : publish.publishedAt ? `Posted ${formatWhen(publish.publishedAt)}` : ""}
              </span>
            </p>
            {publish.targets?.length ? (
              <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                {publish.targets.map((target) => (
                  <li key={target.accountId} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate">{platformLabel(target.platform)}</span>
                    {target.error && <span className="truncate text-xs text-red-700 dark:text-red-300">{target.error}</span>}
                    <span className="shrink-0 text-xs text-muted-foreground">{target.status}</span>
                    {target.permalink && (
                      <a href={target.permalink} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={`Open on ${platformLabel(target.platform)}`}>
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}>Check status</Button>
              {publish.state === "scheduled" && info?.canPublish && (
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void cancel()}>
                  {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  Cancel post
                </Button>
              )}
            </DialogFooter>
          </div>
        ) : loading && !info ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading accounts</p>
        ) : !info ? (
          <p className="text-sm text-muted-foreground">{error || "Couldn't load social accounts."}</p>
        ) : post.status !== "Approved" ? (
          <p className="text-sm text-muted-foreground">Approve this post first, then it can be scheduled.</p>
        ) : !info.canPublish ? (
          <p className="text-sm text-muted-foreground">Your agency schedules approved posts for you.</p>
        ) : !accounts.length ? (
          <p className="text-sm text-muted-foreground">No social accounts connected yet. Connect them on the Account page.</p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {publish?.state === "failed" && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">The last try failed{publish.error ? `: ${publish.error}` : "."} You can try again.</p>
            )}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Post to</legend>
              {accounts.map((account) => (
                <label key={account.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                  <Checkbox
                    checked={selected.includes(account.id)}
                    onChange={(event) => { const checked = event.target.checked; setSelected((current) => checked ? [...current, account.id] : current.filter((id) => id !== account.id)) }}
                  />
                  <span className="min-w-0 flex-1 truncate">{account.name || account.username || platformLabel(account.platform)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{platformLabel(account.platform)}</span>
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">When</legend>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="when" checked={when === "later"} onChange={() => setWhen("later")} />Later</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="when" checked={when === "now"} onChange={() => setWhen("now")} />Now</label>
                {when === "later" && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="publish-at" className="sr-only">Date and time</Label>
                    <Input id="publish-at" type="datetime-local" value={at} min={localInputValue(new Date())} onChange={(event) => setAt(event.target.value)} className="h-9 w-auto" required />
                  </div>
                )}
              </div>
            </fieldset>

            {chosen.length > 0 && <PlatformPreviews post={post} accounts={chosen} />}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button type="submit" disabled={busy || !chosen.length || (when === "later" && !at)}>
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {when === "later" ? "Schedule" : "Post now"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** How the post reads on each chosen platform: cut at its length limit, with a warning when it needs a picture or video. */
function PlatformPreviews({ post, accounts }: { post: CampaignCreative; accounts: SocialAccount[] }) {
  const platforms = [...new Set(accounts.map((account) => account.platform))]
  const body = post.body?.trim() ?? ""
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Preview</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {platforms.map((platform) => {
          const info = platformInfo(platform)
          const limit = info?.limit ?? Infinity
          const over = body.length > limit
          const square = platform === "instagram" || platform === "tiktok"
          return (
            <div key={platform} className="overflow-hidden rounded-lg border border-border">
              <p className="border-b border-border px-3 py-2 text-xs font-medium">{platformLabel(platform)}</p>
              {post.mediaUrl && (
                <div className={cn("bg-black", square ? (platform === "tiktok" ? "aspect-[9/16] max-h-64" : "aspect-square") : "aspect-video")}>
                  {post.mediaType === "video"
                    ? <video src={post.mediaUrl} muted playsInline className="size-full object-cover" />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={post.mediaUrl} alt="" className="size-full object-cover" />}
                </div>
              )}
              <p className="line-clamp-4 whitespace-pre-wrap break-words px-3 py-2 text-xs">{over ? `${body.slice(0, limit)}…` : body || "No text"}</p>
              <div className="space-y-1 px-3 pb-2 text-xs">
                <p className={cn(over ? "text-red-700 dark:text-red-300" : "text-muted-foreground")}>{body.length} / {Number.isFinite(limit) ? limit : "∞"} characters{over ? " (too long)" : ""}</p>
                {info?.needsMedia && !post.mediaUrl && <p className="text-amber-700 dark:text-amber-300">Needs a picture or video.</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
