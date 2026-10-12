"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ProjectCover } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadFileToStorage } from "@/lib/documents"
import { slugify, updateProject, type Project } from "@/lib/projects"

/** Where a campaign's name, profile image and banner are changed. */
export function CampaignSettings({ project, onPatched }: { project: Project; onPatched?: (patch: Partial<Project>) => void }) {
  const [title, setTitle] = useState(project.title)
  const [busy, setBusy] = useState<"logo" | "banner" | "title" | null>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const bannerInput = useRef<HTMLInputElement>(null)

  useEffect(() => setTitle(project.title), [project.title])

  async function save(patch: Partial<Project>, what: "logo" | "banner" | "title") {
    setBusy(what)
    try {
      await updateProject(project.id, patch)
      onPatched?.(patch)
    } catch (error) {
      console.error("Error saving campaign settings:", error)
      toast.error("That change didn't save.")
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
      await save(what === "logo" ? { logoUrl: url } : { thumbnailUrl: url }, what)
    } catch (error) {
      console.error("Error uploading campaign image:", error)
      toast.error(error instanceof Error ? error.message : "The image didn't upload.")
      setBusy(null)
    }
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
          <div className="size-20 shrink-0 overflow-hidden rounded-full bg-muted">
            {project.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.logoUrl} alt="" className="size-full object-cover" />
            ) : (
              <ProjectCover project={{ ...project, thumbnailUrl: "" }} />
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
          <ProjectCover project={project} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy === "banner"} onClick={() => bannerInput.current?.click()} className="gap-1.5">
            <ImagePlus className="size-4" aria-hidden="true" />
            {busy === "banner" ? "Uploading…" : project.thumbnailUrl ? "Change" : "Upload"}
          </Button>
          {project.thumbnailUrl && (
            <Button type="button" variant="ghost" disabled={busy === "banner"} onClick={() => void save({ thumbnailUrl: "" }, "banner")} className="gap-1.5 text-muted-foreground">
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">The banner is also the picture on the campaign&apos;s card.</p>
        <input ref={bannerInput} type="file" accept="image/*" hidden onChange={(event) => { void upload(event.target.files?.[0], "banner"); event.target.value = "" }} />
      </section>
    </div>
  )
}
