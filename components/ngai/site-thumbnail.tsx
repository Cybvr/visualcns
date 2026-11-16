"use client"

import { Globe } from "lucide-react"

/**
 * A site's own page, drawn at a quarter size and not clickable, the same
 * thumbnail Juju Sites shows on its projects. Fills whatever box it sits in.
 */
export function SiteThumbnail({ code, title }: { code: string; title: string }) {
  if (!code) {
    return (
      <span className="flex size-full items-center justify-center bg-muted/50">
        <Globe className="size-8 text-muted-foreground/60" aria-hidden="true" />
      </span>
    )
  }
  return (
    <span className="relative block size-full overflow-hidden bg-white">
      <iframe
        title={`${title} preview`}
        srcDoc={code}
        // Scripts only: no same-origin access, forms or popups.
        sandbox="allow-scripts"
        loading="lazy"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-[0.25] border-0 bg-white"
      />
    </span>
  )
}
