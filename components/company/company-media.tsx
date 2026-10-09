"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react"

import { mediaKindForUrl, type MediaKind } from "@/lib/media"
import type { Project } from "@/lib/projects"

interface MediaItem {
  url: string
  label: string
  project: string
  kind: MediaKind
}

function derivedMedia(logoUrl: string | undefined, projects: Project[]): MediaItem[] {
  const items: MediaItem[] = []

  if (logoUrl) items.push({ url: logoUrl, label: "Company logo", project: "Company", kind: mediaKindForUrl(logoUrl) })

  for (const project of projects) {
    const cover = project.imageUrl || project.thumbnailUrl
    if (cover) items.push({ url: cover, label: "Project cover", project: project.title, kind: mediaKindForUrl(cover) })
    if (project.logoUrl) items.push({ url: project.logoUrl, label: "Project logo", project: project.title, kind: mediaKindForUrl(project.logoUrl) })
    for (const [index, url] of (project.gallery ?? []).entries()) {
      if (url) items.push({ url, label: `Gallery media ${index + 1}`, project: project.title, kind: mediaKindForUrl(url) })
    }
  }

  return items
}

function galleryItems(logoUrl: string | undefined, projects: Project[], uploaded: string[]): MediaItem[] {
  const uploadedItems: MediaItem[] = uploaded
    .filter(Boolean)
    .map((url) => ({ url, label: "Uploaded media", project: "Company", kind: mediaKindForUrl(url) }))

  return [...new Map([...uploadedItems, ...derivedMedia(logoUrl, projects)].map((item) => [item.url, item])).values()]
}

export function companyMediaCount(logoUrl: string | undefined, projects: Project[], uploaded: string[] = []) {
  return galleryItems(logoUrl, projects, uploaded).length
}

/**
 * The company's images and videos as tiles for the Drive grid, plus the
 * lightbox they open. Render it inside the same grid as the documents.
 */
export function CompanyMedia({
  logoUrl,
  projects,
  uploaded = [],
  onUploadedChange,
  query = "",
}: {
  logoUrl?: string
  projects: Project[]
  /** Media an admin added directly to the company (persisted on the organization). */
  uploaded?: string[]
  /** Present only for admins; lets them remove what they uploaded. */
  onUploadedChange?: (urls: string[]) => void
  /** Only tiles whose label, project or file name contain this text are shown. */
  query?: string
}) {
  const isAdmin = Boolean(onUploadedChange)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const term = query.trim().toLowerCase()
  const gallery = galleryItems(logoUrl, projects, uploaded).filter(
    (item) => !term || [item.label, item.project, item.kind, item.url.split("/").pop()].some((field) => field?.toLowerCase().includes(term)),
  )

  const lightbox = lightboxIndex === null ? null : gallery[lightboxIndex] ?? null
  const showArrows = gallery.length > 1
  const step = (delta: number) =>
    setLightboxIndex((current) => (current === null ? current : (current + delta + gallery.length) % gallery.length))

  useEffect(() => {
    if (lightbox === null) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxIndex(null)
      else if (event.key === "ArrowRight") step(1)
      else if (event.key === "ArrowLeft") step(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox, gallery.length])

  return (
    <>
      {gallery.map((item, index) => (
        <div key={item.url} className="group relative">
          {isAdmin && uploaded.includes(item.url) && (
            <button
              type="button"
              onClick={() => onUploadedChange?.(uploaded.filter((url) => url && url !== item.url))}
              aria-label={`Remove ${item.kind}`}
              className="absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`View ${item.label} from ${item.project}`}
          >
            {item.kind === "video" ? (
              <>
                <video
                  src={item.url}
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 text-white">
                  <Play className="size-7 fill-current" aria-hidden="true" />
                </span>
              </>
            ) : (
              // Media URLs may come from any configured storage host.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt={`${item.label} from ${item.project}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
              />
            )}
          </button>
        </div>
      ))}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${lightbox.label} from ${lightbox.project}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          {showArrows && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  step(-1)
                }}
                aria-label="Previous"
                className="absolute left-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  step(1)
                }}
                aria-label="Next"
                className="absolute right-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            </>
          )}
          {lightbox.kind === "video" ? (
            <video
              src={lightbox.url}
              controls
              playsInline
              preload="metadata"
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.url}
              alt={`${lightbox.label} from ${lightbox.project}`}
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  )
}
