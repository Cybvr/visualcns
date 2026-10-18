"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { ImagePlus, Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { useCompanyPage } from "@/components/company/company-page-context"
import { formatWhen, PlatformPreviews, PublishPill, PublishPostDialog } from "@/components/company/publish-post-dialog"
import { SocialAccounts } from "@/components/company/social-accounts"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { watchCompanyCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { uploadFileToStorage } from "@/lib/documents"
import { mediaKindForFile } from "@/lib/media"
import { platformLabel, type SocialAccount, type SocialAccountsInfo } from "@/lib/social"
import { useSocialAccounts } from "@/lib/social-client"
import { tsToMillis } from "@/lib/tasks"

type AccountNumbers = { id: string; followers?: number | null; followerChange?: number | null }
type PostNumbers = { creativeId: string; likes: number; comments: number; shares: number; saves: number }

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })

// Same limits as campaign posts and the storage rules.
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_BYTES = 20 * 1024 * 1024

/** A post belongs on the Social page once it is headed for, or on, social accounts. */
function isSocialPost(post: CampaignCreative) {
  return post.type === "text" && (Boolean(post.publish) || Boolean(post.request) || !post.projectId)
}

function postTime(post: CampaignCreative) {
  const iso = post.publish?.publishedAt || post.publish?.scheduledAt || post.request?.scheduledAt
  const parsed = iso ? Date.parse(iso) : NaN
  return Number.isNaN(parsed) ? tsToMillis(post.updatedAt) || tsToMillis(post.createdAt) : parsed
}

/**
 * The Social page's front: each account's followers, a New post button, and
 * every post with where it stands and how it did.
 */
export function SocialOverview() {
  const { company } = useCompanyPage()
  const { info, loading, reload, request } = useSocialAccounts(company.id)
  const [numbers, setNumbers] = useState<{ accounts: AccountNumbers[]; posts: PostNumbers[] }>({ accounts: [], posts: [] })
  const [posts, setPosts] = useState<CampaignCreative[]>([])
  const [writing, setWriting] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => watchCompanyCampaignCreatives(company.id, (rows) => setPosts(rows.filter(isSocialPost)), () => setPosts([])), [company.id])

  const accountKey = info?.accounts.map((account) => account.id).join(",") ?? ""
  useEffect(() => {
    if (!accountKey) return
    let active = true
    request<{ accounts: AccountNumbers[]; posts: PostNumbers[] }>(`analytics?companyId=${encodeURIComponent(company.id)}`)
      .then((result) => { if (active) setNumbers(result) })
      .catch(() => undefined)
    return () => { active = false }
  }, [accountKey, company.id, request])

  const sorted = useMemo(() => [...posts].sort((a, b) => postTime(b) - postTime(a)), [posts])
  const postNumbers = new Map(numbers.posts.map((item) => [item.creativeId, item]))
  const accountNumbers = new Map(numbers.accounts.map((item) => [item.id, item]))
  const accounts = (info?.accounts ?? []).filter((account) => account.status !== "disconnected")

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{sorted.length} {sorted.length === 1 ? "post" : "posts"}</p>
        <Button type="button" size="sm" onClick={() => setWriting(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New post
        </Button>
      </div>

      {info && !info.configured ? (
        <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          {info.role === "agency" ? (
            <>Add your SocialAPI key in <Link href="/dashboard/account/agency" className="font-medium text-foreground underline underline-offset-4">Agency settings</Link> so posts can go out and followers show here.</>
          ) : (
            "Posting to your accounts isn't switched on yet. You can still write posts; they go to your agency."
          )}
        </p>
      ) : info && !info.accounts.length ? (
        <SocialAccounts companyId={company.id} companyName={company.name} />
      ) : null}

      {accounts.length > 0 && (
        <section aria-label="Followers" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {accounts.map((account) => {
            const found = accountNumbers.get(account.id)
            return (
              <div key={account.id} className="rounded-xl border border-border p-4">
                <p className="truncate text-sm text-muted-foreground">{platformLabel(account.platform)}{account.username ? ` · @${account.username.replace(/^@/, "")}` : ""}</p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{typeof found?.followers === "number" ? compact.format(found.followers) : "—"}</p>
                <p className="text-xs text-muted-foreground">
                  followers{typeof found?.followerChange === "number" && found.followerChange !== 0 ? ` · ${found.followerChange > 0 ? "+" : ""}${compact.format(found.followerChange)} in 30 days` : ""}
                </p>
              </div>
            )
          })}
        </section>
      )}

      <section aria-label="Posts">
        {loading && !info && !sorted.length ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading</p>
        ) : !sorted.length ? (
          <p className="text-sm text-muted-foreground">No posts yet. Tap New post to write one.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {sorted.map((post) => {
              const stats = postNumbers.get(post.id)
              const waiting = !post.publish && post.status !== "Approved"
              return (
                <li key={post.id}>
                  <button type="button" onClick={() => setOpenId(post.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      {post.mediaUrl && (post.mediaType === "video"
                        ? <VideoThumbnail src={post.mediaUrl} />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={post.mediaUrl} alt="" loading="lazy" className="size-full object-cover" />)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 break-words text-sm">{post.body?.trim() || post.title || "Post"}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {post.publish ? <PublishPill post={post} /> : (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-medium text-amber-700 dark:text-amber-300">{waiting ? "Waiting for approval" : "Ready to schedule"}</span>
                        )}
                        <span>{formatWhen(new Date(postTime(post)).toISOString())}</span>
                        {stats && <span className="tabular-nums">{compact.format(stats.likes)} likes · {compact.format(stats.comments)} comments · {compact.format(stats.shares)} shares</span>}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <NewPostDialog open={writing} onOpenChange={setWriting} info={info} accounts={accounts} onSent={reload} />
      <PublishPostDialog post={posts.find((post) => post.id === openId) ?? null} companyId={company.id} open={openId !== null} onOpenChange={(open) => { if (!open) setOpenId(null) }} />
    </div>
  )
}

/** "2026-10-18T14:30" for a datetime-local input, in the viewer's own time. */
function localInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Write a post: words, a picture or video, the accounts and when. It goes out
 * as set when the writer may post; otherwise it goes to the agency to approve.
 */
function NewPostDialog({ open, onOpenChange, info, accounts, onSent }: { open: boolean; onOpenChange: (open: boolean) => void; info: SocialAccountsInfo | null; accounts: SocialAccount[]; onSent: () => Promise<void> }) {
  const { company } = useCompanyPage()
  const { request } = useSocialAccounts(company.id, false)
  const [body, setBody] = useState("")
  const [media, setMedia] = useState<{ url: string; type: "image" | "video" } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [when, setWhen] = useState<"now" | "later">("later")
  const [at, setAt] = useState("")
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setBody("")
    setMedia(null)
    setSelected(accounts.length === 1 ? [accounts[0].id] : [])
    setWhen("later")
    setAt(localInputValue(new Date(Date.now() + 60 * 60 * 1000)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const sendsNow = Boolean(info?.configured && info.canPublish && accounts.length)
  const chosen = accounts.filter((account) => selected.includes(account.id))

  async function upload(file: File | undefined) {
    if (!file) return
    const kind = mediaKindForFile(file)
    if (kind !== "image" && kind !== "video") return toast.error("Choose an image or video.")
    if (file.size > (kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return toast.error("That file is too big. Images up to 12 MB, videos up to 20 MB.")
    setUploading(true)
    try {
      setMedia({ url: await uploadFileToStorage(file), type: kind })
    } catch (error) {
      console.error("Error uploading post media:", error)
      toast.error("It didn't upload.")
    } finally {
      setUploading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await request<{ queued?: boolean }>("posts", {
        method: "POST",
        body: {
          companyId: company.id,
          post: { body, mediaUrl: media?.url ?? "", mediaType: media?.type ?? "image" },
          accountIds: selected,
          scheduledAt: when === "later" && at ? new Date(at).toISOString() : undefined,
        },
      })
      toast.success(result.queued ? "Sent to your agency to approve." : when === "later" ? "Post scheduled." : "Posting now.")
      onOpenChange(false)
      await onSent()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't send the post.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New post</DialogTitle>
          <DialogDescription>{sendsNow ? "Pick where and when it goes out." : "Your agency approves it before it goes out."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-social-post">Post</Label>
            <Textarea id="new-social-post" value={body} onChange={(event) => setBody(event.target.value)} rows={5} placeholder="What do you want to say?" />
          </div>

          <div>
            {media ? (
              <div className="relative inline-block">
                <div className="size-28 overflow-hidden rounded-lg bg-muted">
                  {media.type === "video"
                    ? <VideoThumbnail src={media.url} />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={media.url} alt="" className="size-full object-cover" />}
                </div>
                <button type="button" onClick={() => setMedia(null)} aria-label="Remove picture" className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-foreground text-background">
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
                {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-4" aria-hidden="true" />}
                {uploading ? "Uploading" : "Add picture or video"}
              </Button>
            )}
            <input ref={fileInput} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = "" }} />
          </div>

          {accounts.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Post to</legend>
              {accounts.map((account) => (
                <label key={account.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(account.id)}
                    onChange={(event) => { const checked = event.target.checked; setSelected((current) => checked ? [...current, account.id] : current.filter((id) => id !== account.id)) }}
                    className="size-4"
                  />
                  <span className="min-w-0 flex-1 truncate">{account.name || account.username || platformLabel(account.platform)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{platformLabel(account.platform)}</span>
                </label>
              ))}
            </fieldset>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">When</legend>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="new-post-when" checked={when === "later"} onChange={() => setWhen("later")} />Later</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="new-post-when" checked={when === "now"} onChange={() => setWhen("now")} />{sendsNow ? "Now" : "As soon as it's approved"}</label>
              {when === "later" && (
                <>
                  <Label htmlFor="new-post-at" className="sr-only">Date and time</Label>
                  <Input id="new-post-at" type="datetime-local" value={at} min={localInputValue(new Date())} onChange={(event) => setAt(event.target.value)} className="h-9 w-auto" required />
                </>
              )}
            </div>
          </fieldset>

          {chosen.length > 0 && <PlatformPreviews post={{ body, mediaUrl: media?.url, mediaType: media?.type }} accounts={chosen} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || uploading || (!body.trim() && !media) || (sendsNow && !chosen.length)}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {!sendsNow ? "Send for approval" : when === "later" ? "Schedule" : "Post now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
