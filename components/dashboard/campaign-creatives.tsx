"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { ChevronLeft, ChevronRight, ExternalLink, Folder, FolderInput, Image as ImageIcon, Images, ImagePlus, Link2, Palette, Pencil, Video, X } from "lucide-react"
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
import { SectionAddButton } from "@/components/company/section-add-button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CollectionView } from "@/components/dashboard/collection-view"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  /** The campaign's Media files, to pick a post's picture from. */
  library?: CampaignCreative[]
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
export function CampaignCreatives({ creatives, agencyId, companyId, projectId, canEdit, canReview = false, kind = "content", library = [] }: CampaignCreativesProps) {
  const scope = { agencyId, companyId, projectId }
  // Posts read in the order they were written, so the announcement leads.
  const posts = kind === "content" ? creatives.filter((item) => item.type === "text").reverse() : []
  const files = creatives.filter((item) => item.type !== "text")
  const [editing, setEditing] = useState<CampaignCreative | "new" | null>(null)
  const [deleting, setDeleting] = useState<CampaignCreative | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = posts.find((post) => post.id === selectedId) ?? null

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
        ...(post.mediaUrl ? { mediaUrl: post.mediaUrl, mediaType: post.mediaType ?? "image" } : {}),
      })
    } catch (error) {
      console.error("Error duplicating post:", error)
      toast.error("Couldn't duplicate that post.")
    }
  }

  function postMenu(post: CampaignCreative) {
    if (!canEdit && !canReview) return undefined
    const status = creativeStatus(post)
    const setStatus = (next: string) => void saveCreative(post.id, { status: next })
    return (
      <>
        <DropdownMenuItem onSelect={() => setEditing(post)}>{canEdit ? "Edit" : "Edit text"}</DropdownMenuItem>
        {canReview && status !== "Approved" && <DropdownMenuItem onSelect={() => setStatus("Approved")}>Approve</DropdownMenuItem>}
        {canReview && status !== "Approved" && <DropdownMenuItem onSelect={() => setStatus("Changes requested")}>Request changes</DropdownMenuItem>}
        {canReview && status === "Approved" && <DropdownMenuItem onSelect={() => setStatus(READY_FOR_REVIEW)}>Undo approval</DropdownMenuItem>}
        {canEdit && <DropdownMenuItem onSelect={() => void duplicatePost(post)}>Duplicate</DropdownMenuItem>}
        {canEdit && <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(post)}>Delete</DropdownMenuItem>}
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
          searchFields={(post) => [post.title, post.body, creativeStatus(post)]}
          searchPlaceholder="Search content"
          viewKey="campaign-content"
          actions={canEdit || canReview ? <SectionAddButton label={canEdit ? "New post" : "Suggest a post"} onClick={() => setEditing("new")} /> : undefined}
          empty={{
            icon: Palette,
            title: "No posts yet",
            description: "Write the posts and hooks for this campaign here.",
            action: canEdit || canReview ? <SectionAddButton label={canEdit ? "New post" : "Suggest a post"} onClick={() => setEditing("new")} /> : undefined,
          }}
          card={(post) => ({
            icon: <Palette className="size-4 text-muted-foreground" aria-hidden="true" />,
            title: post.title || "Post",
            subtitle: [creativeStatus(post), postDate(post)].filter(Boolean).join(" · "),
            preview: post.mediaUrl ? (
              post.mediaType === "video"
                ? <video src={post.mediaUrl} muted playsInline preload="metadata" className="size-full object-cover" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={post.mediaUrl} alt="" loading="lazy" className="size-full object-cover" />
            ) : (
              <p className="line-clamp-6 size-full p-4 text-left text-sm leading-6 text-muted-foreground">{post.body?.trim() || "No caption yet."}</p>
            ),
            onClick: () => setSelectedId(post.id),
            ariaLabel: `Preview ${post.title}`,
            menuLabel: `Options for ${post.title}`,
            menu: postMenu(post),
          })}
          row={(post) => ({ subtitle: post.body?.trim() || post.title, description: creativeStatus(post), trailing: postDate(post) })}
        />

        <Dialog open={Boolean(selected)} onOpenChange={(next) => { if (!next) setSelectedId(null) }}>
          <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="min-w-0 truncate">{selected?.title || "Post"}</span>
                {selected && <StatusPill status={creativeStatus(selected)} />}
              </DialogTitle>
              <DialogDescription className="sr-only">The post&apos;s picture and caption.</DialogDescription>
            </DialogHeader>
            {selected && <PostPreview post={selected} />}
            {selected && (canEdit || canReview) && (
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => { setEditing(selected); setSelectedId(null) }}>{canEdit ? "Edit" : "Edit text"}</Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        <PostDialog
          post={editing === "new" ? null : editing}
          open={editing !== null}
          onClose={() => setEditing(null)}
          scope={scope}
          canEdit={canEdit}
          library={library.filter((item) => item.type === "image" || item.type === "video")}
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

  return <MediaLibrary files={files} scope={scope} canEdit={canEdit} />
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

function postDate(post: CampaignCreative) {
  const ms = (post.createdAt ?? post.updatedAt)?.toMillis()
  return ms ? new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""
}

/** The chosen post in full: its picture, status and caption. */
function PostPreview({ post }: { post: CampaignCreative }) {
  return (
    <article className="min-w-0">
      {post.mediaUrl && (
        <div className="mb-4 overflow-hidden rounded-xl bg-muted">
          {post.mediaType === "video" ? (
            <video key={post.mediaUrl} src={post.mediaUrl} controls playsInline className="max-h-[32rem] w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.mediaUrl} alt="" className="max-h-[32rem] w-full object-contain" />
          )}
        </div>
      )}
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{post.body?.trim() || <span className="text-muted-foreground">No caption yet.</span>}</p>
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
    <form onSubmit={save} className="grid gap-5 md:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="flex min-w-0 flex-col gap-3">
        {canEdit && (
          <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" aria-label="Title" />
            <Select value={postedBy} onValueChange={setPostedBy}>
              <SelectTrigger size="default" className="w-full" aria-label="Assigned to"><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSTED_BY.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
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
              {canEdit && (uploading ? "Uploading…" : "Upload")}
            </button>
          )}
          {media && canEdit && (
            <div className="absolute right-2 top-2 flex gap-1">
              <button type="button" onClick={() => fileInput.current?.click()} aria-label="Replace" title="Replace" className="grid size-7 place-items-center rounded-full bg-black/70 text-white outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ImagePlus className="size-3.5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setMedia(null)} aria-label="Remove" title="Remove" className="grid size-7 place-items-center rounded-full bg-black/70 text-white outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        {canEdit && library.length > 0 && (
          <div className="grid grid-cols-5 gap-1">
            {library.slice(0, 10).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMedia({ url: item.url, type: item.type === "video" ? "video" : "image" })}
                aria-label={`Use ${item.title}`}
                title={item.title}
                className={cn("aspect-square overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring", media?.url === item.url ? "ring-2 ring-foreground" : "opacity-70 hover:opacity-100")}
              >
                {item.type === "video" ? (
                  <video src={item.url} muted playsInline preload="metadata" className="size-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}
        <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = "" }} />
      </div>

      <DialogFooter className="md:col-span-2">
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
function MediaLibrary({ files, scope, canEdit }: { files: CampaignCreative[]; scope: { agencyId?: string; companyId: string; projectId: string }; canEdit: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [linking, setLinking] = useState(false)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [folderDialog, setFolderDialog] = useState<CampaignCreative | "new" | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<CampaignCreative | null>(null)
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
    if (activeFolderId && files.length > 0 && !folders.some((item) => item.id === activeFolderId)) setActiveFolderId(null)
  }, [activeFolderId, files, folders])

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return
    for (const file of Array.from(list)) {
      const isVideo = file.type.startsWith("video/")
      if (!isVideo && !file.type.startsWith("image/")) {
        toast.error(`${file.name} isn't an image or video.`)
        continue
      }
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
          folderId: activeFolderId || undefined,
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
    setDeletingFolder(null)
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
      menu: canEdit ? (
        <>
          <DropdownMenuItem onSelect={() => setFolderDialog(folder)}><Pencil className="size-4" aria-hidden="true" />Rename</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeletingFolder(folder)}>Delete folder</DropdownMenuItem>
        </>
      ) : undefined,
    }
  }

  function mediaCard(creative: CampaignCreative) {
    return {
      title: creative.title,
      subtitle: creative.type === "video" ? "Video" : creative.type === "link" ? "Link" : "Image",
      icon: creative.type === "video" ? <Video className="size-4 text-muted-foreground" aria-hidden="true" /> : creative.type === "link" ? <Link2 className="size-4 text-muted-foreground" aria-hidden="true" /> : <ImageIcon className="size-4 text-muted-foreground" aria-hidden="true" />,
      imageUrl: creative.type === "image" ? creative.url : undefined,
      preview: creative.type === "video" ? <video src={creative.url} muted playsInline preload="metadata" className="size-full object-cover" /> : undefined,
      placeholder: <ExternalLink className="size-8 text-muted-foreground" aria-hidden="true" />,
      onClick: () => open(creative),
      ariaLabel: `Open ${creative.title}`,
      menuLabel: `Options for ${creative.title}`,
      menu: canEdit ? (
        <>
          <DropdownMenuItem onSelect={() => open(creative)}>Open</DropdownMenuItem>
          {folders.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><FolderInput className="size-4" aria-hidden="true" />Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled={!creative.folderId} onSelect={() => void moveMedia(creative.id, "")}>All media</DropdownMenuItem>
                {folders.filter((folder) => folder.id !== creative.folderId).map((folder) => (
                  <DropdownMenuItem key={folder.id} onSelect={() => void moveMedia(creative.id, folder.id)}>{folder.title}</DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => void removeCreative(creative.id)}>Delete</DropdownMenuItem>
        </>
      ) : undefined,
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
          <DropdownMenu>
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
        row={(item) => item.type === "folder"
          ? { subtitle: folderCountLabel(item) }
          : { subtitle: item.type === "video" ? "Video" : item.type === "link" ? "Link" : "Image" }}
      />

      <Lightbox items={viewable} activeId={viewingId} onChange={setViewingId} />

      {canEdit && (
        <>
          <MediaFolderDialog
            folder={folderDialog === "new" ? null : folderDialog}
            open={folderDialog !== null}
            onOpenChange={(open) => { if (!open) setFolderDialog(null) }}
            scope={scope}
          />
          <AddLinkDialog open={linking} onOpenChange={setLinking} scope={scope} folderId={activeFolderId || undefined} />
          <AlertDialog open={Boolean(deletingFolder)} onOpenChange={(open) => { if (!open) setDeletingFolder(null) }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this folder?</AlertDialogTitle>
                <AlertDialogDescription>The media inside {deletingFolder?.title || "this folder"} will move back to All media.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletingFolder) void removeFolder(deletingFolder) }}>Delete folder</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          <DialogDescription>Figma, Google Drive, Canva or any other link.</DialogDescription>
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

/** Full-size pictures and videos with previous and next, by button or arrow key. */
function Lightbox({ items, activeId, onChange }: { items: CampaignCreative[]; activeId: string | null; onChange: (id: string | null) => void }) {
  const index = items.findIndex((item) => item.id === activeId)
  const item = index >= 0 ? items[index] : null
  const step = (by: number) => {
    if (index < 0 || items.length < 2) return
    onChange(items[(index + by + items.length) % items.length].id)
  }

  useEffect(() => {
    if (!item) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") step(-1)
      if (event.key === "ArrowRight") step(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <Dialog open={Boolean(item)} onOpenChange={(next) => { if (!next) onChange(null) }}>
      <DialogContent className="max-w-none gap-0 border-0 bg-black/95 p-0 text-white sm:max-w-[min(96vw,72rem)] [&>button]:text-white">
        <DialogTitle className="sr-only">{item?.title ?? "Media"}</DialogTitle>
        <DialogDescription className="sr-only">Use the arrow keys to move between pictures.</DialogDescription>
        {item && (
          <div className="relative flex h-[85vh] items-center justify-center">
            {item.type === "video" ? (
              <video key={item.id} src={item.url} controls autoPlay playsInline className="max-h-full max-w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={item.id} src={item.url} alt={item.title} className="max-h-full max-w-full object-contain" />
            )}
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous" className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white">
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next" className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white">
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-sm">
              <span className="min-w-0 truncate">{item.title}</span>
              <span className="shrink-0 tabular-nums text-white/70">{index + 1} / {items.length}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
