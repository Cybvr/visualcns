"use client"

import { useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

export interface MediaLightboxItem {
  id: string
  title: string
  url: string
  type: "image" | "video"
}

/** Full-size campaign media with wraparound buttons and arrow-key navigation. */
export function MediaLightbox({ items, activeId, onChange }: {
  items: MediaLightboxItem[]
  activeId: string | null
  onChange: (id: string | null) => void
}) {
  const index = items.findIndex((item) => item.id === activeId)
  const item = index >= 0 ? items[index] : null

  useEffect(() => {
    if (!item || items.length < 2) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      const by = event.key === "ArrowLeft" ? -1 : 1
      onChange(items[(index + by + items.length) % items.length].id)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, item, items, onChange])

  const step = (by: number) => {
    if (index < 0 || items.length < 2) return
    onChange(items[(index + by + items.length) % items.length].id)
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={(next) => { if (!next) onChange(null) }}>
      <DialogContent className="max-w-none gap-0 border-0 bg-black/95 p-0 text-white sm:max-w-[min(96vw,72rem)] [&>button]:text-white">
        <DialogTitle className="sr-only">{item?.title ?? "Media"}</DialogTitle>
        <DialogDescription className="sr-only">Use the left and right arrow keys to move between media.</DialogDescription>
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
