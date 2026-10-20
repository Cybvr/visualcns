"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { ImageIcon, ImagePlus, Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { useCompanyPage } from "@/components/company/company-page-context"
import { formatWhen, PlatformPreviews, PublishPostDialog } from "@/components/company/publish-post-dialog"
import { CampaignBrandContext, CampaignPostViewDialog, postMediaType } from "@/components/dashboard/campaign-creatives"
import { SocialIcon } from "@/components/company/social-icon"
import { CollectionView } from "@/components/dashboard/collection-view"
import { thumbnailIcon } from "@/components/dashboard/grid-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { addCampaignCreative, creativeStatus, deleteCampaignCreative, READY_FOR_REVIEW, updateCampaignCreative, watchCompanyCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { uploadFileToStorage } from "@/lib/documents"
import { mediaKindForFile } from "@/lib/media"
import { platformLabel, PUBLISH_LABELS, type SocialAccount, type SocialAccountsInfo } from "@/lib/social"
import { useSocialAccounts } from "@/lib/social-client"
import { SocialAccounts } from "@/components/company/social-accounts"
import { tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

type AccountNumbers = { id: string; followers?: number | null; posts?: number | null; following?: number | null; followerChange?: number | null; problem?: string }
type PostNumbers = { creativeId: string; likes: number; comments: number; shares: number; saves: number }

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })

// Same limits as campaign posts and the storage rules.
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_BYTES = 20 * 1024 * 1024

/** A post belongs on the Social page once it is headed for, or on, social accounts. */
function isSocialPost(post: CampaignCreative) {
  return post.type === "text" && (Boolean(post.publish) || Boolean(post.request) || !post.projectId)
}

/** Campaign work that has not entered the social publishing flow yet. */
function isCampaignContent(post: CampaignCreative) {
  return post.type === "text" && Boolean(post.projectId) && !post.publish && !post.request
}

function postTime(post: CampaignCreative) {
  const iso = post.publish?.publishedAt || post.publish?.scheduledAt || post.request?.scheduledAt
  const parsed = iso ? Date.parse(iso) : NaN
  return Number.isNaN(parsed) ? tsToMillis(post.updatedAt) || tsToMillis(post.createdAt) : parsed
}

/** The finer wording shown on the post itself. */
function stageLabel(post: CampaignCreative) {
  if (isCampaignContent(post)) return "In campaign"
  if (post.publish) return PUBLISH_LABELS[post.publish.state]
  return post.status === "Approved" ? "Ready to schedule" : "Waiting for approval"
}

function searchPost(post: CampaignCreative) {
  return [post.title, post.body, stageLabel(post)]
}

/** The post's picture or video, filling whatever holds it. */
function PostMedia({ post }: { post: CampaignCreative }) {
  if (!post.mediaUrl) return null
  return postMediaType(post) === "video"
    ? <VideoThumbnail src={post.mediaUrl} />
    // eslint-disable-next-line @next/next/no-img-element
    : <img src={post.mediaUrl} alt="" loading="lazy" className="size-full object-cover" />
}

/** Pill buttons that narrow a list, beside the search in the filter bar. */
export function PillFilter<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-full bg-card p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * The Social page's front: connected accounts and a direct view of every post.
 */
export function SocialOverview() {
  const { company } = useCompanyPage()
  const { info, reload, request } = useSocialAccounts(company.id)
  const [numbers, setNumbers] = useState<{ accounts: AccountNumbers[]; posts: PostNumbers[] }>({ accounts: [], posts: [] })
  const [posts, setPosts] = useState<CampaignCreative[]>([])
  const [writing, setWriting] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    return watchCompanyCampaignCreatives(
      company.id,
      (rows) => { setPosts(rows.filter((item) => item.type === "text")); setLoaded(true) },
      () => { setPosts([]); setLoaded(true) },
    )
  }, [company.id])

  const accountKey = info?.accounts.map((account) => account.id).join(",") ?? ""
  useEffect(() => {
    if (!accountKey) return
    let active = true
    request<{ accounts: AccountNumbers[]; posts: PostNumbers[] }>(`analytics?companyId=${encodeURIComponent(company.id)}`)
      .then((result) => { if (active) setNumbers(result) })
      .catch(() => undefined)
    return () => { active = false }
  }, [accountKey, company.id, request])

  const allPosts = useMemo(
    () => posts.filter((post) => isSocialPost(post) || isCampaignContent(post)).sort((a, b) => postTime(b) - postTime(a)),
    [posts],
  )
  const postNumbers = new Map(numbers.posts.map((item) => [item.creativeId, item]))
  const accountNumbers = new Map(numbers.accounts.map((item) => [item.id, item]))
  const accounts = (info?.accounts ?? []).filter((account) => account.status !== "disconnected")
  const canEdit = info?.role === "agency"
  const canReview = info?.role === "client"

  const openPost = (post: CampaignCreative) => ({ onClick: () => setOpenId(post.id) })
  const statsLine = (post: CampaignCreative) => {
    const stats = postNumbers.get(post.id)
    return stats ? `${compact.format(stats.likes)} likes · ${compact.format(stats.comments)} comments · ${compact.format(stats.shares)} shares` : undefined
  }
  const subtitle = (post: CampaignCreative) => [stageLabel(post), formatWhen(new Date(postTime(post)).toISOString())].join(" · ")

  async function duplicatePost(post: CampaignCreative) {
    try {
      await addCampaignCreative(
        { agencyId: post.agencyId, companyId: post.companyId, projectId: post.projectId },
        {
          title: `${post.title || "Post"} (copy)`,
          url: "",
          type: "text",
          kind: "content",
          body: post.body ?? "",
          postedBy: post.postedBy || "Founder",
          status: "Draft",
          ...(post.mediaUrl ? { mediaUrl: post.mediaUrl, mediaType: postMediaType(post) } : {}),
        },
      )
    } catch (error) {
      console.error("Error duplicating post:", error)
      toast.error("Couldn't duplicate that post.")
    }
  }

  async function updatePostStatus(id: string, status: string) {
    try {
      await updateCampaignCreative(id, { status })
    } catch (error) {
      console.error("Error updating post:", error)
      toast.error("That change didn't save.")
    }
  }

  async function removePost(id: string) {
    try {
      await deleteCampaignCreative(id)
    } catch (error) {
      console.error("Error deleting post:", error)
      toast.error("Couldn't delete that post.")
    }
  }

  function postActions(post: CampaignCreative) {
    const status = creativeStatus(post)
    return {
      noun: "post",
      name: post.title || "Post",
      onOpen: () => setOpenId(post.id),
      onDuplicate: canEdit ? () => duplicatePost(post) : undefined,
      extra: (canEdit || canReview) ? (
        <>
          {canReview && status !== "Approved" && <DropdownMenuItem onSelect={() => void updatePostStatus(post.id, "Approved")}>Approve</DropdownMenuItem>}
          {canReview && status !== "Approved" && <DropdownMenuItem onSelect={() => void updatePostStatus(post.id, "Changes requested")}>Request changes</DropdownMenuItem>}
          {canReview && status === "Approved" && !post.publish && <DropdownMenuItem onSelect={() => void updatePostStatus(post.id, READY_FOR_REVIEW)}>Undo approval</DropdownMenuItem>}
          {(canEdit || canReview) && (status === "Approved" || post.publish) && (
            <DropdownMenuItem onSelect={() => setPublishingId(post.id)}>{post.publish && post.publish.state !== "failed" ? "Social post" : "Schedule post"}</DropdownMenuItem>
          )}
        </>
      ) : undefined,
      onDelete: canEdit ? () => removePost(post.id) : undefined,
    }
  }

  return (
    <div className="min-w-0 space-y-8">
      {info && !info.configured ? (
        <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          {info.role === "agency" ? (
            <>Add your SocialAPI key in <Link href="/dashboard/account/agency" className="font-medium text-foreground underline underline-offset-4">Agency settings</Link> so posts can go out and followers show here.</>
          ) : (
            "Posting to your accounts isn't switched on yet. You can still write posts; they go to your agency."
          )}
        </p>
      ) : null}

      {accounts.length > 0 && (
        <section aria-label="Accounts" className="grid gap-3 sm:grid-cols-2">
          {accounts.map((account) => {
            const found = accountNumbers.get(account.id)
            const stat = (value: number | null | undefined, label: string) => (
              <div>
                <p className="text-xl font-semibold tabular-nums" title={value == null ? found?.problem : undefined}>{typeof value === "number" ? compact.format(value) : "—"}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            )
            return (
              <div key={account.id} className="rounded-xl border border-border p-4">
                <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <SocialIcon platform={account.platform} />
                  <span className="truncate">{account.username ? `@${account.username.replace(/^@/, "")}` : account.name || platformLabel(account.platform)}</span>
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {stat(found?.posts, "posts")}
                  {stat(found?.followers, "followers")}
                  {stat(found?.following, "following")}
                </div>
              </div>
            )
          })}
        </section>
      )}

      <section aria-label="Posts">
        {/* Nothing posted and nothing connected: the empty list becomes a prompt to connect. */}
        {loaded && allPosts.length === 0 && accounts.length === 0 && info?.configured ? (
          <SocialAccounts companyId={company.id} variant="banner" />
        ) : (
        <CollectionView
          className=""
          items={allPosts}
          getKey={(post) => post.id}
          searchFields={searchPost}
          searchPlaceholder="Search posts"
          viewKey="social-posts"
          fixedView="list"
          listStyle="thumbnail"
          hideToolbar
          loading={!loaded}
          empty={{ icon: ImageIcon, title: allPosts.length ? "No posts here" : "No posts yet" }}
          card={(post) => ({
            title: post.body?.trim() || post.title || "Post",
            preview: post.mediaUrl ? <PostMedia post={post} /> : thumbnailIcon(ImageIcon),
            ariaLabel: `Open ${post.title || "post"}`,
            menuLabel: `Options for ${post.title || "post"}`,
            ...openPost(post),
          })}
          row={(post) => ({ subtitle: subtitle(post), description: statsLine(post) })}
          itemActions={postActions}
        />
        )}
      </section>

      <NewPostDialog open={writing} onOpenChange={setWriting} info={info} accounts={accounts} onSent={reload} />
      <CampaignBrandContext.Provider value={{ name: company.name, logoUrl: company.logoUrl }}>
        <CampaignPostViewDialog
          post={allPosts.find((post) => post.id === openId) ?? null}
          open={openId !== null}
          onClose={() => setOpenId(null)}
          canEdit={canEdit}
          canReview={canReview}
          posts={allPosts}
          onNavigate={(post) => setOpenId(post.id)}
        />
      </CampaignBrandContext.Provider>
      <PublishPostDialog post={allPosts.find((post) => post.id === publishingId) ?? null} companyId={company.id} open={publishingId !== null} onOpenChange={(open) => { if (!open) setPublishingId(null) }} />
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
          <DialogDescription className="sr-only">Write a post</DialogDescription>
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
