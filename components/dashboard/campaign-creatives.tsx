"use client"

import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { createContext, useContext, useEffect, useRef, useState, type FormEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Bookmark, ChevronLeft, ChevronRight, Download, ExternalLink, Folder, FolderInput, Heart, Image as ImageIcon, Images, ImagePlus, Link2, MessageCircle, MoreHorizontal, Palette, Repeat2, Send, Trash2, Video, VolumeX, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { SectionAddButton } from "@/components/company/section-add-button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CollectionView, type CollectionItemActions } from "@/components/dashboard/collection-view"
import { filterBySearch } from "@/components/dashboard/list-search"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { Input } from "@/components/ui/input"
import { MediaLightbox } from "@/components/ui/media-lightbox"
import { Textarea } from "@/components/ui/textarea"
import {
  addCampaignCreative,
  CREATIVE_STATUSES,
  creativeStatus,
  deleteCampaignCreative,
  deleteCampaignMediaFolder,
  READY_FOR_REVIEW,
  updateCampaignCreative,
  type CampaignCreative,
} from "@/lib/campaign-creatives"
import { uploadFileToStorage } from "@/lib/documents"
import { mediaKindForFile, mediaKindForUrl } from "@/lib/media"
import { cn } from "@/lib/utils"
import { PUBLISH_LABELS } from "@/lib/social"
import { PublishPill, PublishPostDialog } from "@/components/company/publish-post-dialog"

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
  /** The campaign's Media files, to pick a post's picture from. */
  library?: CampaignCreative[]
  /** Opens the relevant create flow when the campaign home quick action is used. */
  startNew?: boolean
  onActionHandled?: () => void
  /** Builds a public deep link for an individual content post. */
  sharePath?: (post: CampaignCreative) => string
  /** Shows only the newest posts as cards, with no filter bar: the campaign home's Content strip. */
  limit?: number
}

// Images are shrunk before upload; these match what the storage rules accept.
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_BYTES = 20 * 1024 * 1024

export function postMediaType(post: Pick<CampaignCreative, "mediaUrl" | "mediaType">): "image" | "video" {
  return post.mediaType === "video" || mediaKindForUrl(post.mediaUrl ?? "") === "video" ? "video" : "image"
}

function localDateTimeValue(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isoFromLocalDateTime(value: string) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

function plannedDateLabel(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

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
export function CampaignCreatives({ creatives, agencyId, companyId, projectId, canEdit, canReview = false, kind = "content", library = [], startNew = false, onActionHandled, sharePath, limit }: CampaignCreativesProps) {
  const scope = { agencyId, companyId, projectId }
  // Newest post first; the list arrives sorted that way.
  const posts = kind === "content" ? creatives.filter((item) => item.type === "text").slice(0, limit) : []
  const files = creatives.filter((item) => item.type !== "text")
  const [editing, setEditing] = useState<CampaignCreative | "new" | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [postQuery, setPostQuery] = useState("")
  const selected = posts.find((post) => post.id === selectedId) ?? null
  // The viewer's arrows step through what the search shows, in the same order.
  const visiblePosts = filterBySearch(posts, postSearchFields, postQuery)
  const postIds = posts.map((post) => post.id).join(" ")
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkedPostId = searchParams.get("post")
  // The ?post= value we last wrote. The address catches up a moment after the
  // viewer moves, so values on the way there are ignored rather than shown.
  const pendingPostParam = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (pendingPostParam.current !== undefined) {
      if (linkedPostId === pendingPostParam.current) pendingPostParam.current = undefined
      return
    }
    if (!linkedPostId) setSelectedId(null)
    else if (postIds.split(" ").includes(linkedPostId)) setSelectedId(linkedPostId)
  }, [linkedPostId, postIds])

  useEffect(() => {
    if (!startNew || (kind !== "content" && kind !== "media")) return
    if (kind === "content") setEditing("new")
    onActionHandled?.()
  }, [kind, onActionHandled, startNew])

  // The copy starts as a draft so it goes through review again.
  async function duplicatePost(post: CampaignCreative) {
    try {
      await addCampaignCreative(scope, {
        title: `${post.title} (copy)`,
        url: "",
        type: "text",
        kind: "content",
        body: post.body ?? "",
        postedBy: post.postedBy || "Founder",
        status: "Draft",
        ...(post.mediaUrl ? { mediaUrl: post.mediaUrl, mediaType: postMediaType(post) } : {}),
      })
    } catch (error) {
      console.error("Error duplicating post:", error)
      toast.error("Couldn't duplicate that post.")
    }
  }

  // Replaced rather than pushed, so Back leaves the page instead of stepping through every post viewed.
  function setPostParam(id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set("post", id)
    else params.delete("post")
    if (params.get("post") === linkedPostId) return
    pendingPostParam.current = id
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function openPost(post: CampaignCreative) {
    setSelectedId(post.id)
    setPostParam(post.id)
  }

  function closePost() {
    setSelectedId(null)
    setShareOpen(false)
    setPostParam(null)
  }

  // The post's own actions, which go between Duplicate and Delete in the shared menu.
  function postExtra(post: CampaignCreative) {
    const status = creativeStatus(post)
    const setStatus = (next: string) => void saveCreative(post.id, { status: next })
    return (
      <>
        {(canEdit || canReview) && <DropdownMenuItem onSelect={() => setEditing(post)}>{canEdit ? "Edit" : "Edit text"}</DropdownMenuItem>}
        {sharePath && <DropdownMenuItem onSelect={() => { openPost(post); setShareOpen(true) }}>Share</DropdownMenuItem>}
        {canReview && status !== "Approved" && <DropdownMenuItem onSelect={() => setStatus("Approved")}>Approve</DropdownMenuItem>}
        {canReview && status !== "Approved" && <DropdownMenuItem onSelect={() => setStatus("Changes requested")}>Request changes</DropdownMenuItem>}
        {canReview && status === "Approved" && !post.publish && <DropdownMenuItem onSelect={() => setStatus(READY_FOR_REVIEW)}>Undo approval</DropdownMenuItem>}
        {(canEdit || canReview) && (status === "Approved" || post.publish) && (
          <DropdownMenuItem onSelect={() => setPublishingId(post.id)}>{post.publish && post.publish.state !== "failed" ? "Social post" : "Schedule post"}</DropdownMenuItem>
        )}
      </>
    )
  }

  if (kind === "content") {
    return (
      <section>
        <h3 className="sr-only">Content</h3>
        <CollectionView
          className=""
          items={posts}
          getKey={(post) => post.id}
          searchFields={postSearchFields}
          onSearch={setPostQuery}
          searchPlaceholder="Search content"
          viewKey="campaign-content"
          gridClassName="gap-px lg:grid-cols-3"
          gridItem={(post) => (
            <button
              type="button"
              onClick={() => openPost(post)}
              aria-label={`Preview ${post.title || "post"}`}
              className="aspect-square w-full overflow-hidden bg-muted outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {post.mediaUrl ? (
                postMediaType(post) === "video"
                  ? <video src={`${post.mediaUrl}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={post.mediaUrl} alt="" loading="lazy" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center" aria-hidden="true"><ImageIcon className="size-10 text-muted-foreground/45" /></span>
              )}
            </button>
          )}
          hideToolbar={limit !== undefined}
          fixedView={limit !== undefined ? "grid" : undefined}
          actions={canEdit || canReview ? <SectionAddButton label={canEdit ? "New post" : "Suggest a post"} onClick={() => setEditing("new")} /> : undefined}
          empty={{
            icon: Palette,
            title: "No posts yet",
            action: canEdit || canReview ? <SectionAddButton label={canEdit ? "New post" : "Suggest a post"} onClick={() => setEditing("new")} /> : undefined,
          }}
          card={(post) => ({
            icon: <Palette className="size-4 text-muted-foreground" aria-hidden="true" />,
            title: post.title || "Post",
            onClick: () => openPost(post),
            ariaLabel: `Preview ${post.title}`,
            menuLabel: `Options for ${post.title}`,
          })}
          date={(post) => post.updatedAt ?? post.createdAt}
          itemActions={(post) => ({
            noun: "post",
            name: post.title || "Post",
            onOpen: () => openPost(post),
            onRename: canEdit ? (title) => saveCreative(post.id, { title }) : undefined,
            onDuplicate: canEdit ? () => duplicatePost(post) : undefined,
            extra: postExtra(post),
            onDelete: canEdit ? () => removeCreative(post.id) : undefined,
          })}
          selection={canEdit && limit === undefined ? {
            noun: "post",
            onDelete: async (selectedPosts) => {
              const results = await Promise.allSettled(selectedPosts.map((post) => deleteCampaignCreative(post.id)))
              const failures = results.filter((result) => result.status === "rejected").length
              if (failures) {
                toast.error(`${failures} ${failures === 1 ? "post" : "posts"} couldn't be deleted.`)
                throw new Error(`Failed to delete ${failures} posts`)
              }
              toast.success(`${selectedPosts.length} ${selectedPosts.length === 1 ? "post" : "posts"} deleted.`)
            },
          } : undefined}
          row={(post) => ({ subtitle: post.body?.trim() || post.title, description: `${post.publish ? `${creativeStatus(post)} · ${PUBLISH_LABELS[post.publish.state]}` : creativeStatus(post)}${plannedDateLabel(post.plannedPublishAt) ? ` · Publishes ${plannedDateLabel(post.plannedPublishAt)}` : ""}` })}
        />

        <CampaignPostViewDialog
          post={selected}
          open={Boolean(selected)}
          onClose={closePost}
          canEdit={canEdit}
          canReview={canReview}
          posts={visiblePosts}
          onNavigate={openPost}
          onShare={sharePath ? () => setShareOpen(true) : undefined}
          library={library.filter((item) => item.type === "image" || item.type === "video")}
        />

        {sharePath && selected && (
          <ShareDialog
            path={sharePath(selected)}
            title={`Share ${selected.title || "post"}`}
            shareText={`See ${selected.title || "this post"}`}
            open={shareOpen}
            onOpenChange={setShareOpen}
            showTrigger={false}
            contentClassName={VIEWER_POPOVER}
          />
        )}

        <PublishPostDialog
          post={posts.find((post) => post.id === publishingId) ?? null}
          companyId={companyId}
          open={publishingId !== null}
          onOpenChange={(open) => { if (!open) setPublishingId(null) }}
        />

        <PostDialog
          post={editing === "new" ? null : editing}
          open={editing !== null}
          onClose={() => setEditing(null)}
          scope={scope}
          canEdit={canEdit}
          library={library.filter((item) => item.type === "image" || item.type === "video")}
        />
      </section>
    )
  }

  return <MediaLibrary files={files} scope={scope} canEdit={canEdit} startNew={startNew} onActionHandled={onActionHandled} />
}

const postSearchFields = (post: CampaignCreative) => [post.title, post.body, creativeStatus(post)]

async function saveCreative(id: string, patch: Partial<Pick<CampaignCreative, "title" | "status" | "body" | "postedBy" | "mediaUrl" | "mediaType" | "plannedPublishAt">>) {
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

/** A post's picture or video also belongs in the campaign's Media, unless it came from there. */
export async function addPostMediaToLibrary(
  scope: { agencyId?: string; companyId: string; projectId: string },
  media: { url: string; type: "image" | "video" },
  library: Pick<CampaignCreative, "url">[],
) {
  if (!media.url || library.some((item) => item.url === media.url)) return
  await addCampaignCreative(scope, { title: media.type === "video" ? "Post video" : "Post image", url: media.url, type: media.type, kind: "media" })
}

/** Delete, then a second tap to confirm, on the left of a post editor's buttons. */
function DeletePostButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  return (
    <Button
      type="button"
      variant={confirming ? "destructive" : "ghost"}
      className={cn("mr-auto", !confirming && "text-destructive hover:text-destructive")}
      disabled={deleting}
      onClick={async () => {
        if (!confirming) return setConfirming(true)
        setDeleting(true)
        try {
          await onDelete()
        } finally {
          setDeleting(false)
          setConfirming(false)
        }
      }}
      onBlur={() => setConfirming(false)}
    >
      <Trash2 className="size-4" aria-hidden="true" />
      {deleting ? "Deleting…" : confirming ? "Delete post?" : "Delete"}
    </Button>
  )
}

/** The client whose campaign this is, so a post shows their name and logo as the poster. */
export const CampaignBrandContext = createContext<{ name: string; logoUrl?: string }>({ name: "" })

/** The client's logo in a circle, or their initials when there is none. */
function BrandAvatar({ className }: { className?: string }) {
  const { name, logoUrl } = useContext(CampaignBrandContext)
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-white", className)}>
      {logoUrl ? (
        // Company logos can be hosted outside the configured image domains.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-[#16181D]">{initials || "?"}</span>
      )}
    </span>
  )
}
function postDate(post: CampaignCreative) {
  const ms = (post.createdAt ?? post.updatedAt)?.toMillis()
  return ms ? new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""
}

// The post viewer sits at z-[100], above the usual z-50 popover layer, so anything it opens goes higher.
const VIEWER_POPOVER = "z-[110]"

/** The poster's name, then the caption with a gap between its lines, the way Instagram spaces a caption. */
function PostCaption({ name, body }: { name: string; body?: string }) {
  const paragraphs = (body ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (paragraphs.length === 0) return <p><span className="font-semibold">{name}</span> <span className="text-muted-foreground">No caption yet.</span></p>
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{index === 0 && <><span className="font-semibold">{name}</span>{" "}</>}{paragraph}</p>
      ))}
    </div>
  )
}

function PostContextMenu({ canEdit, canReview, onEdit, className }: { canEdit: boolean; canReview: boolean; onEdit: () => void; className?: string }) {
  if (!canEdit && !canReview) return <MoreHorizontal className={cn("size-5 text-muted-foreground", className)} aria-hidden="true" />
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={cn("size-8 text-muted-foreground", className)} aria-label="Post options" title="Post options">
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={VIEWER_POPOVER}>
        <DropdownMenuItem onSelect={onEdit}>{canEdit ? "Edit post" : "Edit text"}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Shared read-only view for posts opened from Content or campaign Home. */
export function CampaignPostViewDialog({
  post,
  open,
  onClose,
  canEdit = false,
  canReview = false,
  posts = [],
  onNavigate,
  onShare,
  library = [],
}: {
  post: CampaignCreative | null
  open: boolean
  onClose: () => void
  canEdit?: boolean
  canReview?: boolean
  posts?: CampaignCreative[]
  onNavigate?: (post: CampaignCreative) => void
  onShare?: () => void
  /** The campaign's images and videos, to pick from when editing the post. */
  library?: CampaignCreative[]
}) {
  const brand = useContext(CampaignBrandContext)
  const currentIndex = post ? posts.findIndex((item) => item.id === post.id) : -1
  const previous = currentIndex > 0 ? posts[currentIndex - 1] : null
  const next = currentIndex >= 0 && currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  const [editing, setEditing] = useState(false)
  const [captionOpen, setCaptionOpen] = useState(false)
  const swipeStart = useRef<number | null>(null)
  useEffect(() => { setEditing(false); setCaptionOpen(false) }, [open, post?.id])
  // While editing, the big preview shows the picture or video chosen in the editor, before it is saved.
  const [draftMedia, setDraftMedia] = useState<{ url: string; type: "image" | "video" } | null | undefined>(undefined)
  useEffect(() => { if (!editing) setDraftMedia(undefined) }, [editing, post?.id])
  const shownMedia = editing && draftMedia !== undefined
    ? draftMedia
    : post?.mediaUrl ? { url: post.mediaUrl, type: postMediaType(post) } : null

  useEffect(() => {
    if (!open || !post) return
    const handleKeyDown = (event: KeyboardEvent) => {
      // Menus and dialogs on top (Share, post options, the select) handle their own keys first.
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      const layer = target?.closest("[role=\"dialog\"], [role=\"alertdialog\"], [role=\"menu\"], [role=\"listbox\"]")
      if (layer && !layer.hasAttribute("data-post-viewer")) return
      if (event.key === "Escape") {
        event.preventDefault()
        // Escape leaves the editor first, so a half-written caption isn't lost with the viewer.
        if (editing) setEditing(false)
        else onClose()
        return
      }
      if (editing || !onNavigate || posts.length < 2) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (target?.matches("input, textarea, select, [contenteditable=\"true\"]") || target?.tagName === "VIDEO") return
      if (event.key === "ArrowLeft" && previous) {
        event.preventDefault()
        onNavigate(previous)
      } else if (event.key === "ArrowRight" && next) {
        event.preventDefault()
        onNavigate(next)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [editing, next, onClose, onNavigate, open, post, posts.length, previous])

  useEffect(() => {
    if (!open || !post) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previousOverflow }
  }, [open, post])

  if (!open || !post) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <button type="button" aria-label="Close post preview" onClick={onClose} className="fixed right-4 top-4 z-[102] grid size-10 place-items-center rounded-full text-white outline-none max-md:right-3 max-md:top-3 max-md:bg-black/40 transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/80">
        <X className="size-7" aria-hidden="true" />
      </button>
      {onNavigate && posts.length > 1 && !editing && (
        <div className="max-md:hidden">
          <button type="button" aria-label="Previous post" disabled={!previous} onClick={() => previous && onNavigate(previous)} className="fixed left-3 top-1/2 z-[102] grid size-10 -translate-y-1/2 place-items-center rounded-full bg-background text-foreground shadow-lg outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35 sm:left-6">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next post" disabled={!next} onClick={() => next && onNavigate(next)} className="fixed right-3 top-1/2 z-[102] grid size-10 -translate-y-1/2 place-items-center rounded-full bg-background text-foreground shadow-lg outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35 sm:right-6">
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
      {/* Phones: laid out like an Instagram post, picture edge to edge, then the actions and caption. */}
      <section
        role="dialog"
        aria-modal="true"
        data-post-viewer=""
        aria-label={post.title || "Post"}
        className="fixed inset-0 z-[101] overflow-y-auto overscroll-contain bg-background md:hidden"
      >
        <div
          className="relative bg-black"
          onTouchStart={(event) => {
            // Dragging along a video's scrubber is not a swipe to the next post.
            swipeStart.current = (event.target as HTMLElement).tagName === "VIDEO" ? null : event.touches[0]?.clientX ?? null
          }}
          onTouchEnd={(event) => {
            const start = swipeStart.current
            swipeStart.current = null
            const end = event.changedTouches[0]?.clientX
            if (start === null || end === undefined || !onNavigate || editing || Math.abs(end - start) < 50) return
            const target = end < start ? next : previous
            if (target) onNavigate(target)
          }}
        >
          {shownMedia ? (
            shownMedia.type === "video" ? (
              <video key={shownMedia.url} src={shownMedia.url} controls playsInline className="max-h-[80svh] w-full object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownMedia.url} alt="" className="max-h-[80svh] w-full object-contain" />
            )
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center" aria-label="No media attached">
              <ImageIcon className="size-8 text-white/40" aria-hidden="true" />
            </div>
          )}
          <BrandAvatar className="absolute bottom-3 left-3 size-9 shadow-md" />
          <PostContextMenu canEdit={canEdit} canReview={canReview} onEdit={() => setEditing(true)} className="absolute right-14 top-3 text-white hover:bg-white/15 hover:text-white" />
        </div>

        {editing ? (
          <InlinePostEditor post={post} canEdit={canEdit} canReview={canReview} library={library} onMediaChange={setDraftMedia} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} onDeleted={onClose} />
        ) : (
          <div className="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-center justify-between text-foreground">
              <div className="flex items-center gap-5">
                <Heart className="size-7 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />
                <MessageCircle className="size-7 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />
                <Repeat2 className="size-7 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />
                {onShare ? (
                  <Button type="button" variant="ghost" size="icon" className="size-8 text-foreground" onClick={onShare} aria-label="Share post" title="Share post">
                    <Send className="size-6 shrink-0" strokeWidth={2} aria-hidden="true" />
                  </Button>
                ) : <Send className="size-7 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />}
              </div>
              <Bookmark className="size-7 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />
            </div>
            <div className={cn("mt-3 break-words text-sm leading-5 text-foreground", !captionOpen && "line-clamp-3")}>
              <PostCaption name={post.postedBy === "Roster" ? "Creators" : brand.name || "Post"} body={post.body} />
            </div>
            {!captionOpen && (post.body?.trim().length ?? 0) > 120 && (
              <button type="button" onClick={() => setCaptionOpen(true)} className="mt-0.5 text-[15px] text-muted-foreground outline-none">more</button>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 truncate">{post.title || "Post"}</span>
              <StatusPill status={creativeStatus(post)} />
              <PublishPill post={post} />
              {plannedDateLabel(post.plannedPublishAt) && <span className="shrink-0">Planned {plannedDateLabel(post.plannedPublishAt)}</span>}
              <span className="shrink-0">{postDate(post)}</span>
            </div>
          </div>
        )}
      </section>

      <section
        role="dialog"
        aria-modal="true"
        data-post-viewer=""
        aria-labelledby={`post-view-title-${post.id}`}
        className="relative hidden h-[min(90svh,52rem)] min-h-0 w-full max-w-5xl overflow-hidden rounded-2xl bg-background shadow-2xl md:grid md:grid-rows-1 md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]"
      >
        <div className="relative flex min-h-0 shrink-0 items-center justify-center overflow-hidden bg-black">
            {shownMedia ? (
              shownMedia.type === "video" ? (
                <video key={shownMedia.url} src={shownMedia.url} controls playsInline className="size-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownMedia.url} alt="" className="size-full object-contain" />
              )
            ) : (
              <div className="flex size-full min-h-64 items-center justify-center" aria-label="No media attached">
                <ImageIcon className="size-8 text-muted-foreground/50" aria-hidden="true" />
              </div>
            )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          <header className="relative flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
            <BrandAvatar className="size-9" />
            <div className="min-w-0 flex-1">
              <h2 id={`post-view-title-${post.id}`} className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <span className="min-w-0 truncate">{post.title || "Post"}</span>
                <StatusPill status={creativeStatus(post)} />
                <PublishPill post={post} />
              </h2>
              <p className="text-xs text-muted-foreground">{post.plannedPublishAt ? `Planned for ${plannedDateLabel(post.plannedPublishAt)}` : postDate(post) || "Campaign"}</p>
            </div>
            <PostContextMenu canEdit={canEdit} canReview={canReview} onEdit={() => setEditing(true)} className="-mr-1.5" />
          </header>
          {editing ? (
            <InlinePostEditor post={post} canEdit={canEdit} canReview={canReview} library={library} onMediaChange={setDraftMedia} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} onDeleted={onClose} />
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                <div className="flex gap-3 text-sm leading-6 text-foreground">
                  <BrandAvatar className="mt-0.5 size-6" />
                  <div className="min-w-0 break-words text-sm leading-5"><PostCaption name={post.postedBy === "Roster" ? "Creators" : brand.name || "Post"} body={post.body} /></div>
                </div>
              </div>
              <footer className="shrink-0 border-t border-border px-5 py-4">
                <div className="flex items-center justify-between text-foreground">
                  <div className="flex items-center gap-4">
                    <Heart className="size-6 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />
                    <MessageCircle className="size-6 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />
                    <Repeat2 className="size-6 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />
                    {onShare ? (
                      <Button type="button" variant="ghost" size="icon" className="size-8 text-foreground" onClick={onShare} aria-label="Share post" title="Share post">
                        <Send className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                      </Button>
                    ) : <Send className="size-6 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />}
                  </div>
                  <Bookmark className="size-6 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />
                </div>
              </footer>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

/** The campaign's images and videos as small tiles; clicking one uses it for the post. Shared by New post and the post editor. */
function MediaLibraryStrip({ library, selectedUrl, onPick }: { library: CampaignCreative[]; selectedUrl?: string; onPick: (media: { url: string; type: "image" | "video" }) => void }) {
  if (library.length === 0) return null
  return (
    <div className="grid grid-cols-5 gap-1">
      {library.slice(0, 10).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPick({ url: item.url, type: item.type === "video" ? "video" : "image" })}
          aria-label={`Use ${item.title}`}
          title={item.title}
          className={cn("aspect-square overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring", selectedUrl === item.url ? "ring-2 ring-foreground" : "opacity-70 hover:opacity-100")}
        >
          {item.type === "video" ? (
            <VideoThumbnail src={item.url} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />
          )}
        </button>
      ))}
    </div>
  )
}

function InlinePostEditor({ post, canEdit, canReview, library = [], onMediaChange, onCancel, onSaved, onDeleted }: { post: CampaignCreative; canEdit: boolean; canReview: boolean; library?: CampaignCreative[]; onMediaChange?: (media: { url: string; type: "image" | "video" } | null) => void; onCancel: () => void; onSaved: () => void; onDeleted?: () => void }) {
  const [body, setBody] = useState(post.body ?? "")
  const [status, setStatus] = useState(creativeStatus(post))
  const [plannedPublishAt, setPlannedPublishAt] = useState(localDateTimeValue(post.plannedPublishAt))
  const [media, setMedia] = useState<{ url: string; type: "image" | "video" } | null>(post.mediaUrl ? { url: post.mediaUrl, type: postMediaType(post) } : null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  // The big preview beside the editor follows whatever is picked here.
  const reportMedia = useRef(onMediaChange)
  reportMedia.current = onMediaChange
  useEffect(() => { reportMedia.current?.(media) }, [media])

  // The same checks as the New post form: images and videos only, within the storage limits.
  async function upload(file: File | undefined) {
    if (!file) return
    const kind = mediaKindForFile(file)
    if (!kind) return toast.error("Choose an image or video.")
    const isVideo = kind === "video"
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return toast.error("That file is too big. Images up to 12 MB, videos up to 20 MB.")
    setUploading(true)
    try {
      const uploaded = { url: await uploadFileToStorage(file), type: isVideo ? "video" as const : "image" as const }
      setMedia(uploaded)
      // Into the campaign's Media straight away, whether or not the post is saved.
      if (canEdit) await addPostMediaToLibrary(post, uploaded, library).catch((error) => console.error("Error adding post media to Media:", error))
    } catch (error) {
      console.error("Error uploading post media:", error)
      toast.error("It didn't upload.")
    } finally {
      setUploading(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving || uploading) return
    setSaving(true)
    try {
      await updateCampaignCreative(post.id, canEdit
        ? { body, status, plannedPublishAt: isoFromLocalDateTime(plannedPublishAt), mediaUrl: media?.url ?? "", ...(media ? { mediaType: media.type } : {}) }
        : { body })
      toast.success("Saved")
      onSaved()
    } catch (error) {
      console.error("Error saving post:", error)
      toast.error("That didn't save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
      {canEdit && (
        <div className="flex items-center gap-3">
          <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = "" }} />
          <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading}>
            <ImagePlus className="size-4" aria-hidden="true" />
            {uploading ? "Uploading…" : media ? "Replace picture or video" : "Add picture or video"}
          </Button>
          {media && !uploading && <Button type="button" variant="ghost" onClick={() => setMedia(null)}>Remove</Button>}
        </div>
      )}
      {canEdit && <MediaLibraryStrip library={library} selectedUrl={media?.url} onPick={setMedia} />}
      <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={10} maxLength={CAPTION_MAX} placeholder="Caption" aria-label="Caption" className="min-h-48 flex-1 resize-none text-sm leading-6" />
      {canEdit && (
        <div role="radiogroup" aria-label="Status" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {CREATIVE_STATUSES.map((item) => (
            <button key={item} type="button" role="radio" aria-checked={status === item} onClick={() => setStatus(item)} className="h-8 truncate rounded-md px-1 text-xs text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-background aria-checked:font-medium aria-checked:text-foreground aria-checked:shadow-sm">
              {STATUS_SHORT[item]}
            </button>
          ))}
        </div>
      )}
      {canEdit && (
        <div className="space-y-1.5">
          <label htmlFor={`planned-publish-${post.id}`} className="text-sm font-medium">Planned publish date</label>
          <input id={`planned-publish-${post.id}`} type="datetime-local" value={plannedPublishAt} onChange={(event) => setPlannedPublishAt(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <p className="text-xs text-muted-foreground">Used as the default when this approved post is scheduled.</p>
        </div>
      )}
      <div className="mt-auto flex justify-end gap-2 border-t border-border pt-4">
        {canEdit && <DeletePostButton onDelete={async () => { await removeCreative(post.id); onDeleted?.() }} />}
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving || uploading}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  )
}

/**
 * Write or change a post. The agency sets its picture and status; the client
 * can only change the words.
 */
function PostDialog({
  post,
  open,
  onClose,
  scope,
  canEdit,
  library,
}: {
  post: CampaignCreative | null
  open: boolean
  onClose: () => void
  scope: { agencyId?: string; companyId: string; projectId: string }
  canEdit: boolean
  library: CampaignCreative[]
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{post ? "Edit post" : canEdit ? "New post" : "Suggest a post"}</DialogTitle>
          <DialogDescription className="sr-only">Write the post and add a picture.</DialogDescription>
        </DialogHeader>
        {open && <PostForm key={post?.id ?? "new"} post={post} scope={scope} canEdit={canEdit} library={library} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function PostForm({ post, scope, canEdit, library, onDone }: { post: CampaignCreative | null; scope: { agencyId?: string; companyId: string; projectId: string }; canEdit: boolean; library: CampaignCreative[]; onDone: () => void }) {
  const [body, setBody] = useState(post?.body ?? "")
  const [status, setStatus] = useState(post ? creativeStatus(post) : "Draft")
  const [plannedPublishAt, setPlannedPublishAt] = useState(localDateTimeValue(post?.plannedPublishAt))
  const [media, setMedia] = useState<{ url: string; type: "image" | "video" } | null>(post?.mediaUrl ? { url: post.mediaUrl, type: postMediaType(post) } : null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function upload(file: File | undefined) {
    if (!file) return
    const kind = mediaKindForFile(file)
    if (!kind) return toast.error("Choose an image or video.")
    const isVideo = kind === "video"
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return toast.error("That file is too big. Images up to 12 MB, videos up to 20 MB.")
    setUploading(true)
    try {
      const uploaded = { url: await uploadFileToStorage(file), type: isVideo ? "video" as const : "image" as const }
      setMedia(uploaded)
      // Into the campaign's Media straight away, whether or not the post is saved.
      if (canEdit) await addPostMediaToLibrary(scope, uploaded, library).catch((error) => console.error("Error adding post media to Media:", error))
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
          ? { body, status, plannedPublishAt: isoFromLocalDateTime(plannedPublishAt), mediaUrl: media?.url ?? "", mediaType: media?.type ?? "image" }
          : { body })
      } else {
        await addCampaignCreative(scope, {
          title: canEdit ? "Announcement post" : "Suggested post",
          url: "",
          type: "text",
          kind: "content",
          body,
          postedBy: "Founder",
          status: canEdit ? status : "Draft",
          ...(canEdit && plannedPublishAt ? { plannedPublishAt: isoFromLocalDateTime(plannedPublishAt) } : {}),
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
    <form onSubmit={save} className="grid gap-5 md:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="relative">
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={8} maxLength={CAPTION_MAX} placeholder="Caption" aria-label="Caption" className="min-h-48 resize-none pb-6 text-sm leading-6" />
          <span className="pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums text-muted-foreground">{body.length}/{CAPTION_MAX}</span>
        </div>
        {canEdit && (
          <div role="radiogroup" aria-label="Status" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
            {CREATIVE_STATUSES.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={status === item}
                onClick={() => setStatus(item)}
                className="h-7 truncate rounded-md px-1 text-xs text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-background aria-checked:font-medium aria-checked:text-foreground aria-checked:shadow-sm"
              >
                {STATUS_SHORT[item]}
              </button>
            ))}
          </div>
        )}
        {canEdit && (
          <div className="space-y-1.5">
            <label htmlFor={`planned-publish-${post?.id ?? "new"}`} className="text-sm font-medium">Planned publish date</label>
            <input id={`planned-publish-${post?.id ?? "new"}`} type="datetime-local" value={plannedPublishAt} onChange={(event) => setPlannedPublishAt(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <p className="text-xs text-muted-foreground">Used as the default when this approved post is scheduled.</p>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          {media ? (
            media.type === "video" ? (
              <video src={media.url} controls playsInline className="size-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt="" className="size-full object-cover" />
            )
          ) : (
            <button
              type="button"
              disabled={!canEdit || uploading}
              onClick={() => fileInput.current?.click()}
              className="flex size-full flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring enabled:hover:bg-muted/70"
            >
              {canEdit ? <ImagePlus className="size-5" aria-hidden="true" /> : <ImageIcon className="size-6" aria-hidden="true" />}
              {canEdit && (uploading ? "Uploading…" : "Upload image or video")}
            </button>
          )}
        </div>
        {media && canEdit && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
              <ImagePlus className="size-4" aria-hidden="true" />
              {uploading ? "Uploading…" : "Replace media"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMedia(null)} disabled={uploading}>
              <X className="size-4" aria-hidden="true" />
              Remove
            </Button>
          </div>
        )}
        {canEdit && <MediaLibraryStrip library={library} selectedUrl={media?.url} onPick={setMedia} />}
        <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = "" }} />
      </div>

      <DialogFooter className="md:col-span-2">
        {post && canEdit && <DeletePostButton onDelete={async () => { await removeCreative(post.id); onDone() }} />}
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving || uploading}>{saving ? "Saving…" : post ? "Save" : canEdit ? "Add post" : "Send suggestion"}</Button>
      </DialogFooter>
    </form>
  )
}

const CAPTION_MAX = 2200
// Short names so all four statuses fit in one row on a phone.
const STATUS_SHORT: Record<(typeof CREATIVE_STATUSES)[number], string> = {
  Draft: "Draft",
  [READY_FOR_REVIEW]: "Review",
  "Changes requested": "Changes",
  Approved: "Approved",
}

/**
 * The Media tab: search, Add link and Upload in the toolbar, then the files.
 * Files can also be dropped anywhere on the tab.
 */
function MediaLibrary({ files, scope, canEdit, startNew = false, onActionHandled }: { files: CampaignCreative[]; scope: { agencyId?: string; companyId: string; projectId: string }; canEdit: boolean; startNew?: boolean; onActionHandled?: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [linking, setLinking] = useState(false)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [folderDialog, setFolderDialog] = useState<CampaignCreative | "new" | null>(null)
  const [newMediaMenuOpen, setNewMediaMenuOpen] = useState(false)
  const folders = files.filter((item) => item.type === "folder")
  const media = files.filter((item) => item.type !== "folder")
  const activeFolder = folders.find((item) => item.id === activeFolderId) ?? null
  const browsedItems = activeFolderId
    ? media.filter((item) => item.folderId === activeFolderId)
    : [...folders, ...media.filter((item) => !item.folderId)]
  // Pictures and videos open in the lightbox, stepping through this folder; links still open in a new tab.
  const viewable = browsedItems.filter((item) => item.type === "image" || item.type === "video")
  const [viewingId, setViewingId] = useState<string | null>(null)
  const open = (creative: CampaignCreative) => (creative.type === "link" ? window.open(creative.url, "_blank", "noopener,noreferrer") : setViewingId(creative.id))

  useEffect(() => {
    if (!canEdit || !startNew) return
    setNewMediaMenuOpen(true)
    onActionHandled?.()
  }, [canEdit, onActionHandled, startNew])

  useEffect(() => {
    if (activeFolderId && files.length > 0 && !folders.some((item) => item.id === activeFolderId)) setActiveFolderId(null)
  }, [activeFolderId, files, folders])

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return
    for (const file of Array.from(list)) {
      const kind = mediaKindForFile(file)
      if (!kind) {
        toast.error(`${file.name} isn't an image or video.`)
        continue
      }
      const isVideo = kind === "video"
      if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
        toast.error(`${file.name} is too big. Images up to 12 MB, videos up to 20 MB.`)
        continue
      }
      try {
        setUploading(`${file.name} 0%`)
        const url = await uploadFileToStorage(file, (pct) => setUploading(`${pct}%`))
        await addCampaignCreative(scope, {
          title: file.name.replace(/\.[^.]+$/, ""),
          url,
          type: isVideo ? "video" : "image",
          kind: "media",
          ...(activeFolderId ? { folderId: activeFolderId } : {}),
        })
      } catch (error) {
        console.error("Error uploading file:", error)
        toast.error(`${file.name} didn't upload.`)
      }
    }
    setUploading(null)
  }

  async function moveMedia(id: string, folderId: string) {
    try {
      await updateCampaignCreative(id, { folderId })
    } catch (error) {
      console.error("Error moving media:", error)
      toast.error("Couldn't move that media.")
    }
  }

  async function removeFolder(folder: CampaignCreative) {
    if (activeFolderId === folder.id) setActiveFolderId(null)
    try {
      await deleteCampaignMediaFolder(scope.projectId, folder.id)
    } catch (error) {
      console.error("Error deleting media folder:", error)
      toast.error("Couldn't delete that folder.")
    }
  }

  function folderCountLabel(folder: CampaignCreative) {
    const count = media.filter((item) => item.folderId === folder.id).length
    return `${count} ${count === 1 ? "item" : "items"}`
  }

  function folderCard(folder: CampaignCreative) {
    return {
      icon: <Folder className="size-4 text-muted-foreground" aria-hidden="true" />,
      title: folder.title,
      subtitle: folderCountLabel(folder),
      placeholder: <Folder className="size-10 text-muted-foreground" aria-hidden="true" />,
      onClick: () => setActiveFolderId(folder.id),
      ariaLabel: `Open ${folder.title}`,
      menuLabel: `Options for ${folder.title}`,
    }
  }

  function mediaCard(creative: CampaignCreative) {
    return {
      title: creative.title,
      subtitle: creative.type === "video" ? "Video" : creative.type === "link" ? "Link" : "Image",
      icon: creative.type === "video" ? <Video className="size-4 text-muted-foreground" aria-hidden="true" /> : creative.type === "link" ? <Link2 className="size-4 text-muted-foreground" aria-hidden="true" /> : <ImageIcon className="size-4 text-muted-foreground" aria-hidden="true" />,
      imageUrl: creative.type === "image" ? creative.url : undefined,
      preview: creative.type === "video" ? <VideoThumbnail src={creative.url} /> : undefined,
      placeholder: <ExternalLink className="size-8 text-muted-foreground" aria-hidden="true" />,
      onClick: () => open(creative),
      ariaLabel: `Open ${creative.title}`,
      menuLabel: `Options for ${creative.title}`,
    }
  }

  async function duplicateMedia(creative: CampaignCreative) {
    try {
      await addCampaignCreative(scope, { title: `${creative.title} (Copy)`, url: creative.url, type: creative.type, kind: "media", folderId: creative.folderId })
    } catch (error) {
      console.error("Error duplicating media:", error)
      toast.error("Couldn't duplicate that media.")
    }
  }

  function downloadMedia(creative: CampaignCreative) {
    const link = document.createElement("a")
    link.href = creative.url
    link.download = creative.title
    link.rel = "noreferrer"
    document.body.append(link)
    link.click()
    link.remove()
  }

  function itemActions(item: CampaignCreative): CollectionItemActions {
    if (item.type === "folder") {
      return {
        noun: "folder",
        name: item.title,
        onOpen: () => setActiveFolderId(item.id),
        onRename: canEdit ? (title) => saveCreative(item.id, { title }) : undefined,
        onDelete: canEdit ? () => removeFolder(item) : undefined,
        deleteMessage: `The media inside ${item.title || "this folder"} will move back to All media.`,
      }
    }
    return {
      noun: item.type === "link" ? "link" : item.type === "video" ? "video" : "image",
      name: item.title,
      onOpen: () => open(item),
      onRename: canEdit ? (title) => saveCreative(item.id, { title }) : undefined,
      onDuplicate: canEdit ? () => duplicateMedia(item) : undefined,
      extra: item.type !== "link" || (canEdit && folders.length > 0) ? <>
        {item.type !== "link" && <DropdownMenuItem onSelect={() => downloadMedia(item)}><Download className="size-4" aria-hidden="true" />Download</DropdownMenuItem>}
        {canEdit && folders.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><FolderInput className="size-4" aria-hidden="true" />Move to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem disabled={!item.folderId} onSelect={() => void moveMedia(item.id, "")}>All media</DropdownMenuItem>
              {folders.filter((folder) => folder.id !== item.folderId).map((folder) => (
                <DropdownMenuItem key={folder.id} onSelect={() => void moveMedia(item.id, folder.id)}>{folder.title}</DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
      </> : undefined,
      onDelete: canEdit ? () => removeCreative(item.id) : undefined,
    }
  }

  return (
    <section
      className={cn("relative rounded-2xl transition-colors", dragging && "bg-muted/60 ring-2 ring-ring ring-offset-4 ring-offset-background")}
      onDragOver={canEdit ? (event) => { event.preventDefault(); setDragging(true) } : undefined}
      onDragLeave={canEdit ? (event) => { if (event.currentTarget === event.target) setDragging(false) } : undefined}
      onDrop={canEdit ? (event) => { event.preventDefault(); setDragging(false); void handleFiles(event.dataTransfer.files) } : undefined}
    >
      <input ref={fileInput} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => { void handleFiles(event.target.files); event.target.value = "" }} />
      <CollectionView
        key={activeFolderId ?? "all"}
        className=""
        items={browsedItems}
        getKey={(item) => item.id}
        searchFields={(item) => [item.title, item.type]}
        searchPlaceholder={activeFolder ? `Search ${activeFolder.title}` : "Search media"}
        viewKey="campaign-media"
        actions={canEdit ? (
          <DropdownMenu open={newMediaMenuOpen} onOpenChange={setNewMediaMenuOpen}>
            <DropdownMenuTrigger asChild>
              <SectionAddButton label="New media" disabled={Boolean(uploading)} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!activeFolder && <DropdownMenuItem onSelect={() => setFolderDialog("new")}><Folder className="size-4" aria-hidden="true" />New folder</DropdownMenuItem>}
              <DropdownMenuItem onSelect={() => fileInput.current?.click()}><ImagePlus className="size-4" aria-hidden="true" />Upload images or videos</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLinking(true)}><Link2 className="size-4" aria-hidden="true" />Add link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined}
        before={<>
          {activeFolder && (
            <div className="mt-3 flex min-w-0 items-center gap-2 text-sm">
              <button type="button" onClick={() => setActiveFolderId(null)} className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronLeft className="size-4" aria-hidden="true" />
                All media
              </button>
              <span className="text-muted-foreground/50">/</span>
              <span className="min-w-0 truncate font-medium text-foreground">{activeFolder.title}</span>
            </div>
          )}
          {uploading && <p className="mt-3 text-sm text-muted-foreground" role="status">Uploading {uploading}</p>}
        </>}
        empty={activeFolder ? {
          icon: Folder,
          title: "This folder is empty",
          description: canEdit ? "Drop images and videos here, or upload them." : undefined,
          action: canEdit ? <SectionAddButton label="Upload images or videos" onClick={() => fileInput.current?.click()} /> : undefined,
        } : {
          icon: Images,
          title: "No media yet",
          description: canEdit ? "Create a folder or drop images and videos here." : undefined,
          action: canEdit ? <SectionAddButton label="Upload images or videos" onClick={() => fileInput.current?.click()} /> : undefined,
        }}
        card={(item) => item.type === "folder" ? folderCard(item) : mediaCard(item)}
        itemActions={itemActions}
        date={(item) => item.updatedAt ?? item.createdAt}
        row={(item) => item.type === "folder"
          ? { subtitle: folderCountLabel(item) }
          : { subtitle: item.type === "video" ? "Video" : item.type === "link" ? "Link" : "Image" }}
      />

      <MediaLightbox items={viewable.map((item) => ({ id: item.id, title: item.title, url: item.url, type: item.type as "image" | "video" }))} activeId={viewingId} onChange={setViewingId} />

      {canEdit && (
        <>
          <MediaFolderDialog
            folder={folderDialog === "new" ? null : folderDialog}
            open={folderDialog !== null}
            onOpenChange={(open) => { if (!open) setFolderDialog(null) }}
            scope={scope}
          />
          <AddLinkDialog open={linking} onOpenChange={setLinking} scope={scope} folderId={activeFolderId || undefined} />
        </>
      )}
    </section>
  )
}

function MediaFolderDialog({ folder, open, onOpenChange, scope }: { folder: CampaignCreative | null; open: boolean; onOpenChange: (open: boolean) => void; scope: { agencyId?: string; companyId: string; projectId: string } }) {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setName(folder?.title ?? "")
  }, [folder, open])

  async function save(event: FormEvent) {
    event.preventDefault()
    const title = name.trim()
    if (!title || busy) return
    setBusy(true)
    try {
      if (folder) await updateCampaignCreative(folder.id, { title })
      else await addCampaignCreative(scope, { title, url: "", type: "folder", kind: "media" })
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving media folder:", error)
      toast.error(`Couldn't ${folder ? "rename" : "create"} that folder.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{folder ? "Rename folder" : "New folder"}</DialogTitle>
          <DialogDescription className="sr-only">{folder ? "Change this media folder's name." : "Create a folder for this campaign's media."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Folder name" aria-label="Folder name" autoFocus />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Saving…" : folder ? "Save" : "Create folder"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Adds a link (Figma, Drive, Canva…) to Media. */
function AddLinkDialog({ open, onOpenChange, scope, folderId }: { open: boolean; onOpenChange: (open: boolean) => void; scope: { agencyId?: string; companyId: string; projectId: string }; folderId?: string }) {
  const [link, setLink] = useState("")
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  async function add(event: FormEvent) {
    event.preventDefault()
    const url = link.trim()
    if (!/^https?:\/\//i.test(url)) return toast.error("Links need to start with http:// or https://")
    setBusy(true)
    try {
      await addCampaignCreative(scope, { title: name.trim() || new URL(url).hostname, url, type: "link", kind: "media", folderId })
      setLink("")
      setName("")
      onOpenChange(false)
    } catch (error) {
      console.error("Error adding link:", error)
      toast.error("Couldn't add that link.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a link</DialogTitle>
          <DialogDescription className="sr-only">Figma, Google Drive, Canva or any other link.</DialogDescription>
        </DialogHeader>
        <form onSubmit={add} className="space-y-4">
          <Input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://" aria-label="Link" autoFocus />
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name (optional)" aria-label="Name" />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !link.trim()}>{busy ? "Adding…" : "Add link"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
