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
}: {
  url?: string
  title?: string
  className?: string
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
        <Button asChild variant="outline" size="icon" aria-label="Open original" title="Open original">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>
      )}
      <Button type="button" variant="outline" size="icon" onClick={handleEmail} aria-label="Email" title="Email">
        <Mail className="size-4" aria-hidden="true" />
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={() => void handleShare()} aria-label="Share" title="Share">
        <Share2 className="size-4" aria-hidden="true" />
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={() => window.print()} aria-label="Print" title="Print">
        <Printer className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
