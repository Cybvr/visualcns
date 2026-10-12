"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Check, ExternalLink, Images, ImagePlus, Link2, MessageSquare, Pencil, Plus, Send, Trash2, Users, X } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  addCampaignCreative,
  CREATIVE_STATUSES,
  creativeStatus,
  deleteCampaignCreative,
  READY_FOR_REVIEW,
  updateCampaignCreative,
  type CampaignCreative,
} from "@/lib/campaign-creatives"
import { uploadFileToStorage } from "@/lib/documents"
import { cn } from "@/lib/utils"

interface CampaignCreativesProps {
  creatives: CampaignCreative[]
  agencyId?: string
  companyId: string
  projectId: string
  /** The agency: can add, rename, remove and set any status. */
  canEdit: boolean
  /** The client's own people: can edit post text, approve or send back, and suggest posts. The agency sets status instead. */
  canReview?: boolean
  /** Content has written posts and a review status; media is just files. */
  kind?: "content" | "media"
  /** Shown at the top of posts the client makes themselves. */
  brandName?: string
  brandImage?: string
}

// Images are shrunk before upload; these match what the storage rules accept.
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_BYTES = 20 * 1024 * 1024

export const statusTone: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  [READY_FOR_REVIEW]: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "Changes requested": "bg-red-500/10 text-red-700 dark:text-red-300",
  Approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
}

export function StatusPill({ status }: { status: string }) {
  return <span className={cn("inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", statusTone[status] ?? statusTone.Draft)}>{status}</span>
}

/**
 * A campaign's Content (written posts and hooks to approve) or its Media
 * (images, videos and links kept with it).
 */
export function CampaignCreatives({ creatives, agencyId, companyId, projectId, canEdit, canReview = false, kind = "content", brandName = "", brandImage }: CampaignCreativesProps) {
  const scope = { agencyId, companyId, projectId }
  // Posts read in the order they were written, so the announcement leads.
  const posts = kind === "content" ? creatives.filter((item) => item.type === "text").reverse() : []
  const files = creatives.filter((item) => item.type !== "text")
  const [editing, setEditing] = useState<CampaignCreative | "new" | null>(null)
  const [deleting, setDeleting] = useState<CampaignCreative | null>(null)

  if (kind === "content") {
    return (
      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Copy and hooks</h3>
          {(canEdit || canReview) && (
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden="true" />
              {canEdit ? "Add post" : "Suggest a post"}
            </Button>
          )}
        </div>
        <div className="mt-4 max-w-xl space-y-4">
          {posts.length === 0 && <p className="py-6 text-sm text-muted-foreground">No posts yet.</p>}
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              brandName={brandName}
              brandImage={brandImage}
              canEdit={canEdit}
              canReview={canReview}
              onEdit={() => setEditing(post)}
              onDelete={() => setDeleting(post)}
            />
          ))}
        </div>

        <PostDialog
          post={editing === "new" ? null : editing}
          open={editing !== null}
          onClose={() => setEditing(null)}
          scope={scope}
          canEdit={canEdit}
        />
        <AlertDialog open={Boolean(deleting)} onOpenChange={(next) => { if (!next) setDeleting(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this post?</AlertDialogTitle>
              <AlertDialogDescription>{deleting?.title || "This post"} will be removed for good.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => { if (deleting) void removeCreative(deleting.id); setDeleting(null) }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    )
  }

  return (
    <section>
      {canEdit && <AddFiles scope={scope} kind={kind} />}
      {files.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Images className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No media yet.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((creative) => (
            <FileCard key={creative.id} creative={creative} canEdit={canEdit} showStatus={false} />
          ))}
        </div>
      )}
    </section>
  )
}

async function saveCreative(id: string, patch: Partial<Pick<CampaignCreative, "title" | "status" | "body" | "postedBy" | "mediaUrl" | "mediaType">>) {
  try {
    await updateCampaignCreative(id, patch)
  } catch (error) {
    console.error("Error saving content:", error)
    toast.error("That change didn't save.")
  }
}

async function removeCreative(id: string) {
  try {
    await deleteCampaignCreative(id)
  } catch (error) {
    console.error("Error removing content:", error)
    toast.error("Couldn't remove it.")
  }
}

// Stored as Founder or Roster; shown in plain words.
const POSTED_BY = [{ value: "Founder", label: "You" }, { value: "Roster", label: "Creators" }] as const

/** One post laid out like it will look on the app: who posts it, the words, the picture, then the review buttons. */
function PostCard({
  post,
  brandName,
  brandImage,
  canEdit,
  canReview,
  onEdit,
  onDelete,
}: {
  post: CampaignCreative
  brandName: string
  brandImage?: string
  canEdit: boolean
  canReview: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const status = creativeStatus(post)
  const byCreators = post.postedBy === "Roster"
  const name = byCreators ? "Creators" : brandName || "You"

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-3 px-4 pt-4">
        {!byCreators && brandImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brandImage} alt="" className="size-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground" aria-hidden="true">
            {byCreators ? <Users className="size-4" /> : name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{post.title}</p>
        </div>
        <StatusPill status={status} />
        {(canEdit || canReview) && (
          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={onEdit} aria-label={`Edit ${post.title}`} title="Edit">
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        )}
        {canEdit && (
          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={onDelete} aria-label={`Delete ${post.title}`} title="Delete">
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </header>

      <p className="whitespace-pre-wrap px-4 pt-3 text-[15px] leading-6 text-foreground">{post.body || <span className="text-muted-foreground">No text yet.</span>}</p>

      {post.mediaUrl && (
        <div className="mt-3 border-y border-border bg-muted">
          {post.mediaType === "video" ? (
            <video src={post.mediaUrl} controls playsInline preload="metadata" className="max-h-[32rem] w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.mediaUrl} alt="" loading="lazy" className="max-h-[32rem] w-full object-contain" />
          )}
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 px-4 py-3">
        {canReview ? (
          status === "Approved" ? (
            <button type="button" onClick={() => void saveCreative(post.id, { status: READY_FOR_REVIEW })} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
              Undo approval
            </button>
          ) : (
            <>
              <Button type="button" size="sm" onClick={() => void saveCreative(post.id, { status: "Approved" })}>
                <Check className="size-4" aria-hidden="true" />
                Approve
              </Button>
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void saveCreative(post.id, { status: "Changes requested" })}>
                <MessageSquare className="size-4" aria-hidden="true" />
                Request changes
              </Button>
            </>
          )
        ) : canEdit && (status === "Draft" || status === "Changes requested") ? (
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void saveCreative(post.id, { status: READY_FOR_REVIEW })}>
            <Send className="size-4" aria-hidden="true" />
            Send for review
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">{status === "Approved" ? "Approved by the client" : "Waiting for the client"}</span>
        )}
      </footer>
    </article>
  )
}

/**
 * Write or change a post. The agency sets who posts it, its picture and its
 * status; the client can only change the words.
 */
function PostDialog({
  post,
  open,
  onClose,
  scope,
  canEdit,
}: {
  post: CampaignCreative | null
  open: boolean
  onClose: () => void
  scope: { agencyId?: string; companyId: string; projectId: string }
  canEdit: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? "Edit post" : canEdit ? "New post" : "Suggest a post"}</DialogTitle>
          <DialogDescription className="sr-only">Write the post and add a picture.</DialogDescription>
        </DialogHeader>
        {open && <PostForm key={post?.id ?? "new"} post={post} scope={scope} canEdit={canEdit} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function PostForm({ post, scope, canEdit, onDone }: { post: CampaignCreative | null; scope: { agencyId?: string; companyId: string; projectId: string }; canEdit: boolean; onDone: () => void }) {
  const [title, setTitle] = useState(post?.title ?? (canEdit ? "Announcement post" : "Suggested post"))
  const [postedBy, setPostedBy] = useState(post?.postedBy || "Founder")
  const [body, setBody] = useState(post?.body ?? "")
  const [status, setStatus] = useState(post ? creativeStatus(post) : "Draft")
  const [media, setMedia] = useState<{ url: string; type: "image" | "video" } | null>(post?.mediaUrl ? { url: post.mediaUrl, type: post.mediaType ?? "image" } : null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function upload(file: File | undefined) {
    if (!file) return
    const isVideo = file.type.startsWith("video/")
    if (!isVideo && !file.type.startsWith("image/")) return toast.error("Choose an image or video.")
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return toast.error("That file is too big. Images up to 12 MB, videos up to 20 MB.")
    setUploading(true)
    try {
      setMedia({ url: await uploadFileToStorage(file), type: isVideo ? "video" : "image" })
    } catch (error) {
      console.error("Error uploading post media:", error)
      toast.error("It didn't upload.")
    } finally {
      setUploading(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      if (post) {
        await updateCampaignCreative(post.id, canEdit
          ? { title: title.trim() || post.title, postedBy, body, status, mediaUrl: media?.url ?? "", mediaType: media?.type ?? "image" }
          : { body })
      } else {
        await addCampaignCreative(scope, {
          title: title.trim() || "Post",
          url: "",
          type: "text",
          kind: "content",
          body,
          postedBy,
          status: canEdit ? status : "Draft",
          ...(canEdit && media ? { mediaUrl: media.url, mediaType: media.type } : {}),
        })
      }
      onDone()
    } catch (error) {
      console.error("Error saving post:", error)
      toast.error("That didn't save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {canEdit && (
        <div className="grid grid-cols-[1fr_9rem] gap-3">
          <label className="block space-y-1.5">
            <span className="text-sm text-muted-foreground">Name</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Announcement post" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-muted-foreground">Posted by</span>
            <Select value={postedBy} onValueChange={setPostedBy}>
              <SelectTrigger size="default" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSTED_BY.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm text-muted-foreground">Post</span>
        <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="What should it say?" className="text-base leading-7" />
      </label>

      {canEdit && (
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Picture or video</span>
          {media ? (
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
              {media.type === "video" ? (
                <video src={media.url} controls playsInline className="max-h-64 w-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.url} alt="" className="max-h-64 w-full object-contain" />
              )}
              <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 size-8" onClick={() => setMedia(null)} aria-label="Remove picture">
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full rounded-xl border-dashed" disabled={uploading} onClick={() => fileInput.current?.click()}>
              <ImagePlus className="size-4" aria-hidden="true" />
              {uploading ? "Uploading…" : "Add a picture or video"}
            </Button>
          )}
          <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = "" }} />
        </div>
      )}

      {canEdit && (
        <label className="block space-y-1.5">
          <span className="text-sm text-muted-foreground">Status</span>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger size="default" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...new Set([...CREATIVE_STATUSES, status])].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving || uploading}>{saving ? "Saving…" : post ? "Save" : canEdit ? "Add post" : "Send suggestion"}</Button>
      </DialogFooter>
    </form>
  )
}

function AddFiles({ scope, kind }: { scope: { agencyId?: string; companyId: string; projectId: string }; kind: "content" | "media" }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [link, setLink] = useState("")
  const [linkTitle, setLinkTitle] = useState("")

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/")
      const isImage = file.type.startsWith("image/")
      if (!isVideo && !isImage) {
        toast.error(`${file.name} isn't an image or video.`)
        continue
      }
      if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
        toast.error(`${file.name} is too big. Images can be up to 12 MB and videos up to 20 MB.`)
        continue
      }
      try {
        setUploading(`${file.name} 0%`)
        const url = await uploadFileToStorage(file, (pct) => setUploading(`${file.name} ${pct}%`))
        await addCampaignCreative(scope, { title: file.name.replace(/\.[^.]+$/, ""), url, type: isVideo ? "video" : "image", kind })
      } catch (error) {
        console.error("Error uploading file:", error)
        toast.error(`${file.name} didn't upload.`)
      }
    }
    setUploading(null)
    if (fileInput.current) fileInput.current.value = ""
  }

  async function handleLink(event: FormEvent) {
    event.preventDefault()
    const url = link.trim()
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Links need to start with http:// or https://")
      return
    }
    try {
      await addCampaignCreative(scope, { title: linkTitle.trim() || new URL(url).hostname, url, type: "link", kind })
      setLink("")
      setLinkTitle("")
    } catch (error) {
      console.error("Error adding link:", error)
      toast.error("Couldn't add that link.")
    }
  }

  const fieldClass = "h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center">
      <input ref={fileInput} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => void handleFiles(event.target.files)} />
      <Button type="button" onClick={() => fileInput.current?.click()} disabled={Boolean(uploading)} className="h-10 shrink-0 gap-1.5">
        <ImagePlus className="size-4" aria-hidden="true" />
        {uploading ? `Uploading ${uploading}` : "Upload"}
      </Button>
      <form onSubmit={handleLink} className="flex min-w-0 flex-1 flex-wrap gap-3">
        <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="Paste a link" aria-label="Link" className={cn(fieldClass, "min-w-48 flex-[2]")} />
        <input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Name" aria-label="Link name" className={cn(fieldClass, "min-w-32 flex-1")} />
        <Button type="submit" variant="outline" disabled={!link.trim()} className="h-10 gap-1.5">
          <Link2 className="size-4" aria-hidden="true" />
          Add link
        </Button>
      </form>
    </div>
  )
}

function FileCard({ creative, canEdit, showStatus }: { creative: CampaignCreative; canEdit: boolean; showStatus: boolean }) {
  const status = creativeStatus(creative)
  const [title, setTitle] = useState(creative.title)
  useEffect(() => setTitle(creative.title), [creative.title])

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <a
        href={creative.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${creative.title}`}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {creative.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creative.url} alt="" loading="lazy" className="size-full object-cover" />
        ) : creative.type === "video" ? (
          <video src={creative.url} muted playsInline preload="metadata" className="size-full object-cover" />
        ) : (
          <ExternalLink className="size-8 text-muted-foreground" aria-hidden="true" />
        )}
      </a>

      {canEdit ? (
        <>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => {
              const next = title.trim()
              if (!next) return setTitle(creative.title)
              if (next !== creative.title) void saveCreative(creative.id, { title: next })
            }}
            aria-label="Name"
            className="h-8 w-full min-w-0 rounded-md bg-transparent px-1 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            {showStatus ? (
              <select
                value={status}
                onChange={(event) => void saveCreative(creative.id, { status: event.target.value })}
                aria-label="Status"
                className={cn("h-8 min-w-0 flex-1 rounded-full px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring", statusTone[status] ?? statusTone.Draft)}
              >
                {[...new Set([...CREATIVE_STATUSES, status])].map((item) => <option key={item}>{item}</option>)}
              </select>
            ) : (
              <span className="min-w-0 flex-1 truncate px-1 text-xs text-muted-foreground">{creative.type === "link" ? "Link" : creative.type === "video" ? "Video" : "Image"}</span>
            )}
            <button
              type="button"
              onClick={() => void removeCreative(creative.id)}
              aria-label={`Remove ${creative.title}`}
              title="Remove"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        <div className="min-w-0 px-1">
          <p className="truncate text-sm font-medium text-foreground">{creative.title}</p>
          {showStatus && <div className="mt-1.5"><StatusPill status={status} /></div>}
        </div>
      )}
    </div>
  )
}
