"use client"

import { ExternalLink, Mail, Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/**
 * Email and share actions for a public document.
 */
export function DocumentActions({
  /** Set when the record is a link to a file held elsewhere. */
  url,
  title = "Document",
  className,
  onShare,
  iconOnly = false,
}: {
  url?: string
  title?: string
  className?: string
  onShare?: () => void
  iconOnly?: boolean
}) {
  function handleEmail() {
    const subject = encodeURIComponent(title)
    const body = encodeURIComponent(`View ${title}: ${window.location.href}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  async function handleShare() {
    const shareData = { title, url: window.location.href }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return
        toast.error("This document could not be shared.")
      }
      return
    }

    try {
      await navigator.clipboard.writeText(shareData.url)
      toast.success("Document link copied")
    } catch {
      toast.error("The document link could not be copied.")
    }
  }

  return (
    <div className={className ?? "flex flex-wrap items-center gap-2 print:hidden"}>
      {url && (
        <Button asChild variant="outline" size="icon" className={iconOnly ? "size-9 p-0" : "sm:size-auto sm:px-3"}>
          <a href={url} target="_blank" rel="noreferrer" aria-label="Open original" title="Open original">
            <span className={iconOnly ? "sr-only" : "sr-only sm:not-sr-only"}>Open original</span>
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </Button>
      )}
      <Button type="button" variant="outline" size="icon" onClick={handleEmail} aria-label="Email document" title="Email document" className={iconOnly ? "size-9 p-0" : "sm:size-auto sm:px-3"}>
        <Mail className="size-3.5" aria-hidden="true" />
        <span className={iconOnly ? "sr-only" : "sr-only sm:not-sr-only"}>Email</span>
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={onShare ?? (() => void handleShare())} aria-label="Share document" title="Share document" className={iconOnly ? "size-9 p-0" : "sm:size-auto sm:px-3"}>
        <Share2 className="size-3.5" aria-hidden="true" />
        <span className={iconOnly ? "sr-only" : "sr-only sm:not-sr-only"}>Share</span>
      </Button>
    </div>
  )
}
