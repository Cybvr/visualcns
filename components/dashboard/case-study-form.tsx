"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Check, Loader2, Trash2 } from "lucide-react"

import { GalleryDropzone, ImageDropzone } from "@/components/image-dropzone"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { projectSlug, projectStatusMeta, slugify, updateProject, type Project, type ProjectStatus } from "@/lib/projects"
import { cn } from "@/lib/utils"

/** A pill toggle: solid with a check when on, outlined with a dot when off. */
function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {active ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <span className="size-1.5 rounded-full bg-current opacity-50" aria-hidden="true" />
      )}
      {label}
    </button>
  )
}

/** "brand, product" <-> ["brand", "product"], so list fields edit as plain text. */
function listToText(value?: string[]): string {
  return (value ?? []).join(", ")
}

function textToList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

type FormState = {
  isCaseStudy: boolean
  caseStudyStatus: "draft" | "published"
  featured: boolean
  status: ProjectStatus
  title: string
  slug: string
  client: string
  excerpt: string
  description: string
  category: string
  projectUrl: string
  imageUrl: string
  logoUrl: string
  gallery: string[]
  technologies: string
  tags: string
}

function formStateFrom(project: Project): FormState {
  return {
    isCaseStudy: project.isCaseStudy ?? false,
    caseStudyStatus: project.caseStudyStatus === "published" ? "published" : "draft",
    featured: project.featured ?? false,
    status: project.status,
    title: project.title ?? "",
    slug: projectSlug(project),
    client: project.client ?? "",
    excerpt: project.excerpt ?? "",
    description: project.description ?? "",
    category: listToText(project.category),
    projectUrl: project.projectUrl ?? "",
    imageUrl: project.imageUrl || project.thumbnailUrl || "",
    logoUrl: project.logoUrl ?? "",
    gallery: project.gallery ?? [],
    technologies: listToText(project.technologies),
    tags: listToText(project.tags),
  }
}

/**
 * Everything the public case study renders, edited on the project that carries
 * it. Publishing here is what puts the project on /case-studies.
 */
export function CaseStudyForm({
  project,
  onSaved,
  onDelete,
}: {
  project: Project
  onSaved?: (patch: Partial<Project>) => void
  onDelete?: () => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(() => formStateFrom(project))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setForm(formStateFrom(project))
    setError(null)
    setSaved(false)
    // Only a different project reloads the fields, so a save that echoes the
    // same project back doesn't wipe anything still being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const patch: Partial<Project> = {
        isCaseStudy: form.isCaseStudy,
        caseStudyStatus: form.caseStudyStatus,
        featured: form.featured,
        status: form.status,
        title: form.title.trim(),
        slug: slugify(form.slug) || slugify(form.title),
        client: form.client.trim(),
        excerpt: form.excerpt.trim(),
        description: form.description.trim(),
        category: textToList(form.category),
        projectUrl: form.projectUrl.trim(),
        imageUrl: form.imageUrl.trim(),
        logoUrl: form.logoUrl.trim(),
        gallery: form.gallery,
        technologies: textToList(form.technologies),
        tags: textToList(form.tags),
      }
      // The marketing grid reads imageUrl and the dashboard cards read
      // thumbnailUrl, so the cover keeps both in step.
      if (patch.imageUrl) patch.thumbnailUrl = patch.imageUrl
      await updateProject(project.id, patch)
      setForm((current) => ({ ...current, slug: patch.slug ?? current.slug }))
      setSaved(true)
      onSaved?.(patch)
    } catch (saveError) {
      console.error("Error saving case study:", saveError)
      setError(saveError instanceof Error ? saveError.message : "The case study could not be saved.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <ToggleChip
              label="Case studies"
              active={form.isCaseStudy}
              onClick={() => set("isCaseStudy", !form.isCaseStudy)}
            />
            <ToggleChip label="Featured" active={form.featured} onClick={() => set("featured", !form.featured)} />
            <ToggleChip
              label="Published"
              active={form.caseStudyStatus === "published"}
              onClick={() => set("caseStudyStatus", form.caseStudyStatus === "published" ? "draft" : "published")}
            />
          </div>

          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(event) => set("status", event.target.value as ProjectStatus)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {(Object.keys(projectStatusMeta) as ProjectStatus[]).map((value) => (
                <option key={value} value={value}>{projectStatusMeta[value].label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Headline</Label>
              <Input id="title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea id="excerpt" rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={6}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="Brand, Product"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="projectUrl">Live site</Label>
                <Input
                  id="projectUrl"
                  value={form.projectUrl}
                  onChange={(e) => set("projectUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="technologies">Technologies</Label>
                <Input
                  id="technologies"
                  value={form.technologies}
                  onChange={(e) => set("technologies", e.target.value)}
                  placeholder="Next.js, Figma"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Media</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <ImageDropzone label="Cover" value={form.imageUrl} onChange={(url) => set("imageUrl", url)} />
              <ImageDropzone label="Client logo" value={form.logoUrl} onChange={(url) => set("logoUrl", url)} />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Gallery</p>
              <GalleryDropzone value={form.gallery} onChange={(urls) => set("gallery", urls)} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {onDelete ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="ml-auto flex items-center gap-3">
              {saved && <span className="text-xs text-muted-foreground">Saved</span>}
              <Button type="submit" disabled={saving || deleting}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>

          {onDelete && (
            <AlertDialog open={confirmDelete} onOpenChange={(open) => !open && !deleting && setConfirmDelete(false)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the project and its tasks. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleting}
                    onClick={(event) => {
                      event.preventDefault()
                      setDeleting(true)
                      void onDelete().catch(() => setDeleting(false))
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
    </form>
  )
}
