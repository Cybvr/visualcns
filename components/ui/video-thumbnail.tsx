import { Play } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A still of a video for cards and pickers, with a small play badge so it reads as a video.
 * The `#t=0.1` asks the browser for a frame just past the start; with only the metadata
 * loaded, most browsers otherwise paint the tile black.
 */
export function VideoThumbnail({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn("relative block size-full", className)}>
      <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
      <span className="absolute bottom-1.5 left-1.5 grid size-6 place-items-center rounded-full bg-black/55 text-white" aria-hidden="true">
        <Play className="size-3 fill-current" />
      </span>
    </span>
  )
}
