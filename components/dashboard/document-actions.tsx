"use client"

import { ExternalLink, Mail, Printer, Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/**
 * Email, share, and print actions for a public document. Saving as PDF goes
 * through the browser's own print dialog.
 */
export function DocumentActions({
  /** Set when the record is a link to a file held elsewhere. */
  url,
  title = "Document",
  className,
  onShare,
}: {
  url?: string
  title?: string
  className?: string
  onShare?: () => void
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
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            Open original
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" onClick={handleEmail}>
        <Mail className="size-3.5" aria-hidden="true" />
        Email
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onShare ?? (() => void handleShare())}>
        <Share2 className="size-3.5" aria-hidden="true" />
        Share
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-3.5" aria-hidden="true" />
        Print
      </Button>
    </div>
  )
}
