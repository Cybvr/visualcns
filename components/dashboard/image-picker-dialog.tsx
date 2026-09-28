"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { ImagePlus, Loader2, Search, Upload } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { createDocument, getDocuments, uploadFileToStorage, type SharedDocument } from "@/lib/documents"
import { mediaKindForUrl, uploadedAtFromUrl } from "@/lib/media"
import { getOrganizations } from "@/lib/organizations"
import { getProjects } from "@/lib/projects"
import { tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp"

/** One pickable image, from Drive or from a company or project page. */
type PickerImage = { id: string; url: string; thumbnailUrl?: string; title: string; source: string; /** Last updated, in ms, for newest-first order. */ at: number }

/** Fallback date for an image whose link carries no upload time: its page's last update. */
function updatedMillis(record: { updatedAt?: unknown; createdAt?: unknown }): number {
  return tsToMillis(record.updatedAt) || tsToMillis(record.createdAt)
}

function newestFirst(a: PickerImage, b: PickerImage) {
  return b.at - a.at
}

function isImageUrl(url: string | undefined): url is string {
  return Boolean(url) && mediaKindForUrl(url as string) === "image"
}

/**
 * Admins see every image in the agency: Drive, plus what's on each company
 * page (uploads, logo) and each project (cover, logo, gallery). Clients see
 * only their own Drive images, as before.
 */
async function loadImages(workspaceId: string, allAgency: boolean): Promise<PickerImage[]> {
  const documents = await getDocuments()
  const driveImages = documents
    .filter((item) => item.type === "image" && item.url && (allAgency || !item.companyId || item.companyId === workspaceId))
    .map((item) => ({ id: item.id, url: item.url, thumbnailUrl: item.thumbnailUrl, title: item.title, source: "Drive", at: updatedMillis(item) }))
    .sort(newestFirst)
  if (!allAgency) return driveImages

  const [organizations, projects] = await Promise.all([getOrganizations().catch(() => []), getProjects().catch(() => [])])
  const companyNames = new Map(organizations.map((organization) => [organization.id, organization.name]))
  const pageImages: PickerImage[] = []
  for (const organization of organizations) {
    const urls = [organization.logoUrl, ...(organization.media ?? [])].filter(isImageUrl)
    urls.forEach((url, index) => pageImages.push({ id: `org-${organization.id}-${index}`, url, title: url === organization.logoUrl ? "Logo" : "Company image", source: organization.name, at: uploadedAtFromUrl(url) || updatedMillis(organization) }))
  }
  for (const project of projects) {
    const urls = [project.imageUrl || project.thumbnailUrl, project.logoUrl, ...(project.gallery ?? [])].filter(isImageUrl)
    const source = [companyNames.get(project.companyId), project.title].filter(Boolean).join(" · ")
    urls.forEach((url, index) => pageImages.push({ id: `project-${project.id}-${index}`, url, title: project.title, source, at: uploadedAtFromUrl(url) || updatedMillis(project) }))
  }

  // Newest first. The same file linked in two places shows once, at its newest.
  const seen = new Set<string>()
  return [...driveImages, ...pageImages].sort(newestFirst).filter((image) => (seen.has(image.url) ? false : (seen.add(image.url), true)))
}

export function ImagePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (image: { src: string; alt: string }) => void
}) {
  const { appUser, user, isAdmin, isImpersonating } = useAuth()
  const workspaceId = appUser?.companyId || user?.uid || ""
  const allAgency = isAdmin && !isImpersonating
  const inputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<PickerImage[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
      if (!open) return
      let active = true
      setLoading(true)
      setError("")
      setQuery("")
    void loadImages(workspaceId, allAgency)
      .then((items) => {
        if (active) setDocuments(items)
      })
      .catch(() => {
        if (active) setError("The images could not be loaded.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [allAgency, open, workspaceId])

  const visibleDocuments = useMemo(() => {
    const value = query.trim().toLowerCase()
    return value ? documents.filter((item) => `${item.title} ${item.source}`.toLowerCase().includes(value)) : documents
  }, [documents, query])

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const source = event.target.files?.[0]
    event.target.value = ""
    if (!source) return
    setError("")
    setUploading(true)
    try {
      const url = await uploadFileToStorage(source)
      const id = await createDocument({
        title: source.name.replace(/\.[^.]+$/, "") || "Email image",
        url,
        description: "Email media",
        companyId: workspaceId,
        sharedWith: "Private",
        sharedWithUserIds: [],
        type: "image",
        thumbnailUrl: url,
      })
      const document: SharedDocument = {
        id,
        title: source.name.replace(/\.[^.]+$/, "") || "Email image",
        url,
        description: "Email media",
        companyId: workspaceId,
        sharedWith: "Private",
        sharedWithUserIds: [],
        type: "image",
        thumbnailUrl: url,
      }
      setDocuments((current) => [{ id, url, thumbnailUrl: url, title: document.title, source: "Drive", at: Date.now() }, ...current])
      onSelect({ src: url, alt: document.title })
      onOpenChange(false)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The image could not be uploaded.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle>Choose an image</DialogTitle>
          <DialogDescription>
            Pick an image from Drive or your company pages, or upload one. Uploads are resized to a 1600px maximum edge and compressed below 1.75 MB.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search images or companies" aria-label="Search images" className="pl-9" />
          </div>
          <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} onChange={handleUpload} className="hidden" />
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            {uploading ? "Uploading" : "Upload image"}
          </Button>
        </div>
        <div className="max-h-[min(60vh,32rem)] min-h-48 overflow-y-auto p-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="status" aria-label="Loading images">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="aspect-[4/3] w-full rounded-xl" />)}</div>
          ) : visibleDocuments.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">{query ? "No matching images" : "No images yet"}</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Upload an image here and it will also appear in the Drive page for reuse.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleDocuments.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  aria-label={`Use ${document.title}`}
                  onClick={() => { onSelect({ src: document.url, alt: document.title }); onOpenChange(false) }}
                  className="group overflow-hidden rounded-[10px] border border-border bg-card text-left outline-none transition-colors hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={document.thumbnailUrl || document.url} alt="" className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                  </div>
                  <span className="block px-2.5 py-2">
                    <span className={cn("block truncate text-xs font-medium", document.title && "text-foreground")}>{document.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{document.source}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
