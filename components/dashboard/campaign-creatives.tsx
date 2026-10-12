"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { ExternalLink, Images, ImagePlus, Link2, Palette, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  addCampaignCreative,
  CREATIVE_STATUSES,
  deleteCampaignCreative,
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
  canEdit: boolean
  /** Content has a review status; media is just files. */
  kind?: "content" | "media"
}

// Images are shrunk before upload; these match what the storage rules accept.
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_VIDEO_BYTES = 20 * 1024 * 1024

const statusTone: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  "In review": "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "Changes needed": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
}

/** The artwork, videos and links made for a campaign, each with a review status. */
export function CampaignCreatives({ creatives, agencyId, companyId, projectId, canEdit, kind = "content" }: CampaignCreativesProps) {
  const EmptyIcon = kind === "media" ? Images : Palette
  const scope = { agencyId, companyId, projectId }

  return (
    <div className="space-y-4">
      {canEdit && <AddCreatives scope={scope} kind={kind} />}

      {creatives.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <EmptyIcon className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{kind === "media" ? "No media yet." : "No content yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {creatives.map((creative) => (
            <CreativeCard key={creative.id} creative={creative} canEdit={canEdit} showStatus={kind === "content"} />
          ))}
        </div>
      )}
    </div>
  )
}

function AddCreatives({ scope, kind }: { scope: { agencyId?: string; companyId: string; projectId: string }; kind: "content" | "media" }) {
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
        console.error("Error uploading creative:", error)
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
      console.error("Error adding creative link:", error)
      toast.error("Couldn't add that link.")
    }
  }

  const fieldClass = "h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center">
      <input ref={fileInput} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => void handleFiles(event.target.files)} />
      <Button type="button" onClick={() => fileInput.current?.click()} disabled={Boolean(uploading)} className="h-10 shrink-0 gap-1.5">
        <ImagePlus className="size-4" aria-hidden="true" />
        {uploading ? `Uploading ${uploading}` : "Upload images or videos"}
      </Button>
      <form onSubmit={handleLink} className="flex min-w-0 flex-1 flex-wrap gap-3">
        <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="Or paste a link (Figma, Drive, Canva…)" aria-label="Content link" className={cn(fieldClass, "min-w-48 flex-[2]")} />
        <input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Name (optional)" aria-label="Link name" className={cn(fieldClass, "min-w-32 flex-1")} />
        <Button type="submit" variant="outline" disabled={!link.trim()} className="h-10 gap-1.5">
          <Link2 className="size-4" aria-hidden="true" />
          Add link
        </Button>
      </form>
    </div>
  )
}

function CreativeCard({ creative, canEdit, showStatus }: { creative: CampaignCreative; canEdit: boolean; showStatus: boolean }) {
  const [title, setTitle] = useState(creative.title)
  useEffect(() => setTitle(creative.title), [creative.title])

  async function save(patch: Partial<Pick<CampaignCreative, "title" | "status">>) {
    try {
      await updateCampaignCreative(creative.id, patch)
    } catch (error) {
      console.error("Error saving creative:", error)
      toast.error("That change didn't save.")
    }
  }

  async function remove() {
    try {
      await deleteCampaignCreative(creative.id)
    } catch (error) {
      console.error("Error removing creative:", error)
      toast.error("Couldn't remove it.")
    }
  }

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
              if (next !== creative.title) void save({ title: next })
            }}
            aria-label="Name"
            className="h-8 w-full min-w-0 rounded-md bg-transparent px-1 text-sm font-medium text-foreground outline-none hover:bg-background/60 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            {showStatus ? (
            <select
              value={creative.status}
              onChange={(event) => void save({ status: event.target.value })}
              aria-label="Status"
              className={cn("h-8 min-w-0 flex-1 rounded-full px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring", statusTone[creative.status] ?? statusTone.Draft)}
            >
              {[...new Set([...CREATIVE_STATUSES, creative.status])].map((item) => <option key={item}>{item}</option>)}
            </select>
            ) : (
              <span className="min-w-0 flex-1 truncate px-1 text-xs text-muted-foreground">{creative.type === "link" ? "Link" : creative.type === "video" ? "Video" : "Image"}</span>
            )}
            <button
              type="button"
              onClick={() => void remove()}
              aria-label={`Remove ${creative.title}`}
              title="Remove"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-background/60 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        <div className="min-w-0 px-1">
          <p className="truncate text-sm font-medium text-foreground">{creative.title}</p>
          {showStatus && (
            <span className={cn("mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusTone[creative.status] ?? statusTone.Draft)}>
              {creative.status}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
