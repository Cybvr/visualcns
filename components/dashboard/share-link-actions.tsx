"use client"

import { Facebook, Linkedin, Link2, MessageCircle, Twitter } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ShareLinkActionsProps = {
  url: string
  label?: string
  shareText?: string
  compact?: boolean
}

/** One link, copy action, and social destinations used by every public share. */
export function ShareLinkActions({ url, label = "Public link", shareText = "View this shared link", compact = false }: ShareLinkActionsProps) {
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(shareText)
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, icon: MessageCircle },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, icon: Linkedin },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, icon: Facebook },
    { label: "X", href: `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`, icon: Twitter },
  ]

  return (
    <div className={cn("space-y-3", compact ? "mt-2" : "pt-2")}>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={url}
          aria-label={label}
          className="font-mono text-xs"
          onClick={(event) => event.currentTarget.select()}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => {
            void navigator.clipboard.writeText(url)
            toast.success("Link copied to clipboard")
          }}
        >
          <Link2 className="size-3.5" aria-hidden="true" />
          {compact ? "Copy" : "Copy link"}
        </Button>
      </div>
      <div className={cn("grid gap-2", compact ? "grid-cols-4" : "grid-cols-2")}>
        {links.map(({ label: socialLabel, href, icon: Icon }) => (
          <a
            key={socialLabel}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Share on ${socialLabel}`}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "px-2" : "px-3",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className={compact ? "sr-only" : undefined}>{socialLabel}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
