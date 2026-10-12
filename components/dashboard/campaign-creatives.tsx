"use client"

import { useRef, useState, type FormEvent } from "react"
import { ExternalLink, Image as ImageIcon, Images, ImagePlus, Link2, Palette, Video, X } from "lucide-react"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ListToolbar, useListSearch } from "@/components/dashboard/list-search"
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

  if (kind === "content") {
    return (
      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Copy and hooks</h3>
          {(canEdit || canReview) && (
            <SectionAddButton label={canEdit ? "New post" : "Suggest a post"} onClick={() => setEditing("new")} />
          )}
        </div>
        <div className="mt-4">
          {posts.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            <GridCardList>
              {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canEdit={canEdit}
              canReview={canReview}
              onEdit={() => setEditing(post)}
              onDelete={() => setDeleting(post)}
            />
              ))}
            </GridCardList>
          )}
        </div>

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

/** One post as the shared grid card: its picture as the preview, its status under it, and every action in the menu. */
function PostCard({
  post,
  canEdit,
  canReview,
  onEdit,
  onDelete,
}: {
  post: CampaignCreative
  canEdit: boolean
  canReview: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const status = creativeStatus(post)
  const setStatus = (next: string) => void saveCreative(post.id, { status: next })
  const menu = (canEdit || canReview) ? (
    <>
      <DropdownMenuItem onSelect={onEdit}>{canEdit ? "Edit" : "Edit text"}</DropdownMenuItem>
      {canReview && status !== "Approved" && <DropdownMenuItem onSelect={() => setStatus("Approved")}>Approve</DropdownMenuItem>}
      {canReview && status !== "Approved" && <DropdownMenuItem onSelect={() => setStatus("Changes requested")}>Request changes</DropdownMenuItem>}
      {canReview && status === "Approved" && <DropdownMenuItem onSelect={() => setStatus(READY_FOR_REVIEW)}>Undo approval</DropdownMenuItem>}
      {canEdit && !canReview && (status === "Draft" || status === "Changes requested") && (
        <DropdownMenuItem onSelect={() => setStatus(READY_FOR_REVIEW)}>Send for review</DropdownMenuItem>
      )}
      {canEdit && <DropdownMenuItem variant="destructive" onSelect={onDelete}>Delete</DropdownMenuItem>}
    </>
  ) : undefined

  return (
    <GridCard
      title={post.title}
      subtitle={status}
      icon={<Palette className="size-4 text-muted-foreground" aria-hidden="true" />}
      imageUrl={post.mediaType === "video" ? undefined : post.mediaUrl}
      preview={post.mediaUrl && post.mediaType === "video" ? <video src={post.mediaUrl} muted playsInline preload="metadata" className="size-full object-cover" /> : undefined}
      placeholder={<ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />}
      onClick={canEdit || canReview ? onEdit : undefined}
      ariaLabel={`Open ${post.title}`}
      menu={menu}
      menuLabel={`Options for ${post.title}`}
    />
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
    <form onSubmit={save} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-5">
      <div className="space-y-2">
        {media ? (
          <div className="relative overflow-hidden rounded-xl bg-muted">
            {media.type === "video" ? (
              <video src={media.url} controls playsInline className="aspect-square w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt="" className="aspect-square w-full object-cover" />
            )}
            {canEdit && (
              <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 size-8" onClick={() => setMedia(null)} aria-label="Remove picture">
                <X className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        ) : canEdit ? (
          <>
            {library.length > 0 && (
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1">
                {library.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMedia({ url: item.url, type: item.type === "video" ? "video" : "image" })}
                    aria-label={`Use ${item.title}`}
                    title={item.title}
                    className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted outline-none hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring"
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
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring",
                library.length ? "py-3" : "aspect-square",
              )}
            >
              <ImagePlus className="size-5" aria-hidden="true" />
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-xl bg-muted">
            <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
        <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = "" }} />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {canEdit && (
          <div className="grid grid-cols-[1fr_7.5rem] gap-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name" aria-label="Name" />
            <Select value={postedBy} onValueChange={setPostedBy}>
              <SelectTrigger size="default" className="w-full" aria-label="Posted by"><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSTED_BY.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={7} placeholder="What should it say?" aria-label="Post" className="min-h-40 flex-1 resize-none text-sm leading-6" />
        {canEdit && (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger size="default" className="w-full" aria-label="Status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...new Set([...CREATIVE_STATUSES, status])].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <DialogFooter className="mt-auto">
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          <Button type="submit" disabled={saving || uploading}>{saving ? "Saving…" : post ? "Save" : canEdit ? "Add post" : "Send suggestion"}</Button>
        </DialogFooter>
      </div>
    </form>
  )
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
  const { query, setQuery, results } = useListSearch(files, (item) => [item.title, item.type])

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
        await addCampaignCreative(scope, { title: file.name.replace(/\.[^.]+$/, ""), url, type: isVideo ? "video" : "image", kind: "media" })
      } catch (error) {
        console.error("Error uploading file:", error)
        toast.error(`${file.name} didn't upload.`)
      }
    }
    setUploading(null)
  }

  return (
    <section
      className={cn("relative rounded-2xl transition-colors", dragging && "bg-muted/60 ring-2 ring-ring ring-offset-4 ring-offset-background")}
      onDragOver={canEdit ? (event) => { event.preventDefault(); setDragging(true) } : undefined}
      onDragLeave={canEdit ? (event) => { if (event.currentTarget === event.target) setDragging(false) } : undefined}
      onDrop={canEdit ? (event) => { event.preventDefault(); setDragging(false); void handleFiles(event.dataTransfer.files) } : undefined}
    >
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search media"
        actions={canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SectionAddButton label="New media" disabled={Boolean(uploading)} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => fileInput.current?.click()}>Upload images or videos</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLinking(true)}>Add link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined}
      />
      <input ref={fileInput} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => { void handleFiles(event.target.files); event.target.value = "" }} />

      {files.length === 0 ? (
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => fileInput.current?.click()}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-14 text-center outline-none transition-colors enabled:hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Images className="size-6 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">{canEdit ? "Drop images or videos here, or click to upload" : "No media yet."}</span>
        </button>
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing matches your search.</p>
      ) : (
        <div className="mt-4">
          <GridCardList>
            {results.map((creative) => (
              <GridCard
                key={creative.id}
                title={creative.title}
                icon={creative.type === "video" ? <Video className="size-4 text-muted-foreground" aria-hidden="true" /> : creative.type === "link" ? <Link2 className="size-4 text-muted-foreground" aria-hidden="true" /> : <ImageIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
                imageUrl={creative.type === "image" ? creative.url : undefined}
                preview={creative.type === "video" ? <video src={creative.url} muted playsInline preload="metadata" className="size-full object-cover" /> : undefined}
                placeholder={<ExternalLink className="size-8 text-muted-foreground" aria-hidden="true" />}
                onClick={() => window.open(creative.url, "_blank", "noopener,noreferrer")}
                ariaLabel={`Open ${creative.title}`}
                menuLabel={`Options for ${creative.title}`}
                menu={canEdit ? (
                  <>
                    <DropdownMenuItem onSelect={() => window.open(creative.url, "_blank", "noopener,noreferrer")}>Open</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => void removeCreative(creative.id)}>Delete</DropdownMenuItem>
                  </>
                ) : undefined}
              />
            ))}
          </GridCardList>
        </div>
      )}

      {canEdit && <AddLinkDialog open={linking} onOpenChange={setLinking} scope={scope} />}
    </section>
  )
}

/** Adds a link (Figma, Drive, Canva…) to Media. */
function AddLinkDialog({ open, onOpenChange, scope }: { open: boolean; onOpenChange: (open: boolean) => void; scope: { agencyId?: string; companyId: string; projectId: string } }) {
  const [link, setLink] = useState("")
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)

  async function add(event: FormEvent) {
    event.preventDefault()
    const url = link.trim()
    if (!/^https?:\/\//i.test(url)) return toast.error("Links need to start with http:// or https://")
    setBusy(true)
    try {
      await addCampaignCreative(scope, { title: name.trim() || new URL(url).hostname, url, type: "link", kind: "media" })
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
