"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ProjectCover } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CampaignCreative } from "@/lib/campaign-creatives"
import { uploadFileToStorage } from "@/lib/documents"
import { slugify, updateProject, type Project } from "@/lib/projects"
import { cn } from "@/lib/utils"

function MediaImagePicker({
  images,
  value,
  disabled,
  onSelect,
}: {
  images: CampaignCreative[]
  value?: string
  disabled?: boolean
  onSelect: (url: string) => void
}) {
  if (images.length === 0) return null

  return (
    <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto p-1">
      {images.map((image) => (
        <button
          key={image.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(image.url)}
          aria-label={`Use ${image.title}`}
          aria-pressed={value === image.url}
          title={image.title}
          className={cn(
            "size-14 shrink-0 overflow-hidden rounded-lg bg-muted outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            value === image.url && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
        </button>
      ))}
    </div>
  )
}

/** Where a campaign's name, profile image and banner are changed. */
export function CampaignSettings({
  project,
  library = [],
  onPatched,
}: {
  project: Project
  library?: CampaignCreative[]
  onPatched?: (patch: Partial<Project>) => void
}) {
  const [title, setTitle] = useState(project.title)
  const [busy, setBusy] = useState<"logo" | "banner" | "title" | null>(null)
  const [bannerChooserOpen, setBannerChooserOpen] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)
  const bannerInput = useRef<HTMLInputElement>(null)
  const mediaImages = library.filter((item) => item.type === "image")

  useEffect(() => setTitle(project.title), [project.title])

  async function save(patch: Partial<Project>, what: "logo" | "banner" | "title") {
    setBusy(what)
    try {
      await updateProject(project.id, patch)
      onPatched?.(patch)
      return true
    } catch (error) {
      console.error("Error saving campaign settings:", error)
      toast.error("That change didn't save.")
      return false
    } finally {
      setBusy(null)
    }
  }

  async function upload(file: File | undefined, what: "logo" | "banner") {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image.")
      return
    }
    setBusy(what)
    try {
      const url = await uploadFileToStorage(file)
      if (await save(what === "logo" ? { logoUrl: url } : { thumbnailUrl: url }, what)) setBannerChooserOpen(false)
    } catch (error) {
      console.error("Error uploading campaign image:", error)
      toast.error(error instanceof Error ? error.message : "The image didn't upload.")
      setBusy(null)
    }
  }

  async function selectBannerFromMedia(url: string) {
    if (await save({ thumbnailUrl: url }, "banner")) setBannerChooserOpen(false)
  }

  const nextTitle = title.trim()

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-2">
        <Label htmlFor={`campaign-title-${project.id}`}>Title</Label>
        <div className="flex gap-2">
          <Input
            id={`campaign-title-${project.id}`}
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && nextTitle && nextTitle !== project.title) void save({ title: nextTitle, slug: slugify(nextTitle) }, "title") }}
            className="h-10"
          />
          <Button
            type="button"
            disabled={!nextTitle || nextTitle === project.title || busy === "title"}
            onClick={() => void save({ title: nextTitle, slug: slugify(nextTitle) }, "title")}
            className="h-10"
          >
            {busy === "title" ? "Saving…" : "Save"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <Label>Profile image</Label>
        <div className="flex items-center gap-4">
          <div className="size-20 shrink-0 overflow-hidden rounded-none bg-muted">
            {project.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.logoUrl} alt="" className="size-full object-cover" />
            ) : (
              <ProjectCover project={{ ...project, thumbnailUrl: "", logoUrl: "" }} />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy === "logo"} onClick={() => logoInput.current?.click()} className="gap-1.5">
              <ImagePlus className="size-4" aria-hidden="true" />
              {busy === "logo" ? "Uploading…" : project.logoUrl ? "Change" : "Upload"}
            </Button>
            {project.logoUrl && (
              <Button type="button" variant="ghost" disabled={busy === "logo"} onClick={() => void save({ logoUrl: "" }, "logo")} className="gap-1.5 text-muted-foreground">
                <Trash2 className="size-4" aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>
        </div>
        <input ref={logoInput} type="file" accept="image/*" hidden onChange={(event) => { void upload(event.target.files?.[0], "logo"); event.target.value = "" }} />
      </section>

      <section className="space-y-3">
        <Label>Banner</Label>
        <div className="aspect-[3/1] w-full overflow-hidden rounded-2xl bg-muted">
          <ProjectCover project={{ ...project, logoUrl: "" }} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy === "banner"} onClick={() => setBannerChooserOpen(true)} className="gap-1.5">
            <ImagePlus className="size-4" aria-hidden="true" />
            {busy === "banner" ? "Saving…" : project.thumbnailUrl ? "Change" : "Choose image"}
          </Button>
          {project.thumbnailUrl && (
            <Button type="button" variant="ghost" disabled={busy === "banner"} onClick={() => void save({ thumbnailUrl: "" }, "banner")} className="gap-1.5 text-muted-foreground">
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
        <input ref={bannerInput} type="file" accept="image/*" hidden onChange={(event) => { void upload(event.target.files?.[0], "banner"); event.target.value = "" }} />
      </section>

      <Dialog open={bannerChooserOpen} onOpenChange={setBannerChooserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose banner</DialogTitle>
            <DialogDescription className="sr-only">Choose an image from campaign Media or upload a new one.</DialogDescription>
          </DialogHeader>
          {mediaImages.length > 0 ? (
            <MediaImagePicker
              images={mediaImages}
              value={project.thumbnailUrl}
              disabled={busy !== null}
              onSelect={(url) => void selectBannerFromMedia(url)}
            />
          ) : (
            <p className="py-4 text-sm text-muted-foreground">No images in Media yet.</p>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => bannerInput.current?.click()}
            className="w-full gap-1.5"
          >
            <ImagePlus className="size-4" aria-hidden="true" />
            {busy ? "Uploading…" : "Upload image"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
