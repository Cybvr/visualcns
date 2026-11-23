"use client"

import { Maximize2, Minimize2, X } from "lucide-react"

const BUTTON = "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

/** Expand (the item takes the whole width, Ngai steps aside) and close (the item goes, the chat stays). */
export function ArtifactWindowControls({ expanded, onToggleExpand, onClose }: { expanded: boolean; onToggleExpand: () => void; onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 max-lg:hidden">
      <button type="button" onClick={onToggleExpand} aria-label={expanded ? "Exit full width" : "Expand"} title={expanded ? "Exit full width" : "Expand"} className={BUTTON}>
        {expanded ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
      </button>
      <button type="button" onClick={onClose} aria-label="Close" title="Close" className={BUTTON}>
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
