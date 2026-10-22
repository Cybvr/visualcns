"use client"

import { Send } from "lucide-react"

import { ShareLinkActions } from "@/components/dashboard/share-link-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { siteUrl } from "@/lib/email-composer"
import { cn } from "@/lib/utils"

type ShareDialogProps = {
  path: string
  title: string
  shareText?: string
  triggerLabel?: string
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
  /** For opening over something that sits above the usual dialog layer, like the post viewer. */
  contentClassName?: string
}

/** The shared share modal for company, campaign, and post links. */
export function ShareDialog({
  path,
  title,
  shareText,
  triggerLabel = "Share",
  triggerClassName,
  open,
  onOpenChange,
  showTrigger = true,
  contentClassName,
}: ShareDialogProps) {
  const url = siteUrl(path)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          {/* An icon button, like the other header actions; the label is for screen readers and the tooltip. */}
          <Button type="button" variant="ghost" size="icon" aria-label={triggerLabel} title={triggerLabel} className={cn("shrink-0 rounded-full text-foreground hover:bg-muted/50", triggerClassName)}>
            <Send className="size-[18px]" aria-hidden="true" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className={cn("max-w-md", contentClassName)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Copy the link or share it on another platform.</DialogDescription>
        </DialogHeader>
        <ShareLinkActions url={url} label={`${title} link`} shareText={shareText} />
      </DialogContent>
    </Dialog>
  )
}
