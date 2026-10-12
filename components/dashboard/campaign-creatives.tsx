"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { ExternalLink, Images, ImagePlus, Link2, Palette, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
  /** The agency or the client's own people: can edit post text, approve, and suggest hooks. */
  canReview?: boolean
  /** Content has written posts and a review status; media is just files. */
  kind?: "content" | "media"
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
 * A campaign's Content (written posts and hooks to approve, then the files
 * made for it) or its Media (raw files kept with it).
 */
export function CampaignCreatives({ creatives, agencyId, companyId, projectId, canEdit, canReview = canEdit, kind = "content" }: CampaignCreativesProps) {
  const scope = { agencyId, companyId, projectId }
  // Posts read in the order they were written, so the announcement leads.
  const posts = kind === "content" ? creatives.filter((item) => item.type === "text").reverse() : []
  const files = creatives.filter((item) => item.type !== "text")

  return (
    <div className="space-y-10">
      {kind === "content" && (
        <section>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Copy and hooks</h3>
          <p className="mt-1 text-sm text-muted-foreground">Every post we've drafted for you. Edit anything. Nothing goes out until you approve it.</p>
          <div className="mt-4 space-y-3">
            {posts.length === 0 && <p className="py-6 text-sm text-muted-foreground">No posts yet.</p>}
            {posts.map((post) => (
              <PostRow key={post.id} post={post} canEdit={canEdit} canReview={canReview} />
            ))}
          </div>
          {canReview && <AddPost scope={scope} canEdit={canEdit} />}
        </section>
      )}

      <section>
        {kind === "content" && (
          <>
            <h3 className="mb-4 text-lg font-semibold tracking-[-0.01em] text-foreground">Files</h3>
          </>
        )}
        {canEdit && <AddFiles scope={scope} kind={kind} />}
        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            {kind === "media" ? <Images className="size-6 text-muted-foreground" aria-hidden="true" /> : <Palette className="size-6 text-muted-foreground" aria-hidden="true" />}
            <p className="text-sm text-muted-foreground">{kind === "media" ? "No media yet." : "No files yet."}</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {files.map((creative) => (
              <FileCard key={creative.id} creative={creative} canEdit={canEdit} showStatus={kind === "content"} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

async function saveCreative(id: string, patch: Partial<Pick<CampaignCreative, "title" | "status" | "body" | "postedBy">>) {
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

const POSTED_BY = ["Founder", "Roster"] as const

/** One written post as a card: who posts it, its status, the words, and approve or request changes. */
function PostRow({ post, canEdit, canReview }: { post: CampaignCreative; canEdit: boolean; canReview: boolean }) {
  const status = creativeStatus(post)
  const [title, setTitle] = useState(post.title)
  const [body, setBody] = useState(post.body ?? "")
  useEffect(() => setTitle(post.title), [post.title])
  useEffect(() => setBody(post.body ?? ""), [post.body])

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 text-sm font-medium text-foreground">
          {canEdit ? (
            <>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  const next = title.trim()
                  if (!next) return setTitle(post.title)
                  if (next !== post.title) void saveCreative(post.id, { title: next })
                }}
                aria-label="Post name"
                className="h-7 min-w-0 max-w-[60%] rounded-md bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ width: `${Math.max(6, title.length + 1)}ch` }}
              />
              <span aria-hidden="true">·</span>
              <select
                value={post.postedBy || "Roster"}
                onChange={(event) => void saveCreative(post.id, { postedBy: event.target.value })}
                aria-label="Who posts it"
                className="h-7 rounded-md bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {POSTED_BY.map((item) => <option key={item}>{item}</option>)}
              </select>
            </>
          ) : (
            <p className="truncate">{post.title}{post.postedBy ? ` · ${post.postedBy}` : ""}</p>
          )}
        </div>
        {canEdit ? (
          <select
            value={status}
            onChange={(event) => void saveCreative(post.id, { status: event.target.value })}
            aria-label="Status"
            className={cn("h-7 rounded-full px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring", statusTone[status] ?? statusTone.Draft)}
          >
            {[...new Set([...CREATIVE_STATUSES, status])].map((item) => <option key={item}>{item}</option>)}
          </select>
        ) : (
          <StatusPill status={status} />
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => void removeCreative(post.id)}
            aria-label={`Remove ${post.title}`}
            title="Remove"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {canReview ? (
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onBlur={() => { if (body !== (post.body ?? "")) void saveCreative(post.id, { body }) }}
          rows={3}
          aria-label={`${post.title} text`}
          className="mt-3 min-h-20 resize-y text-base leading-7"
        />
      ) : (
        <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border px-3 py-2 text-base leading-7 text-foreground">{post.body || "No text yet."}</p>
      )}

      {canReview && (
        status === "Approved" ? (
          <button type="button" onClick={() => void saveCreative(post.id, { status: READY_FOR_REVIEW })} className="mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
            Undo approval
          </button>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveCreative(post.id, { status: "Approved", ...(body !== (post.body ?? "") ? { body } : {}) })}>Approve</Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => void saveCreative(post.id, { status: "Changes requested" })}>Request changes</Button>
          </div>
        )
      )}
    </div>
  )
}

/** Adds a written post. A client's suggestion starts as a draft for the agency to pick up. */
function AddPost({ scope, canEdit }: { scope: { agencyId?: string; companyId: string; projectId: string }; canEdit: boolean }) {
  const [busy, setBusy] = useState(false)

  async function add() {
    setBusy(true)
    try {
      await addCampaignCreative(scope, { title: canEdit ? "New post" : "Hook", postedBy: "Roster", url: "", type: "text", body: "", kind: "content", status: "Draft" })
    } catch (error) {
      console.error("Error adding post:", error)
      toast.error("Couldn't add a post.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" variant="outline" className="mt-3 rounded-full" disabled={busy} onClick={() => void add()}>
      <Plus className="size-4" aria-hidden="true" />
      {canEdit ? "Add a post" : "Suggest a hook"}
    </Button>
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
