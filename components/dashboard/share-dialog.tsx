"use client"

import { Share2 } from "lucide-react"

import { ShareLinkActions } from "@/components/dashboard/share-link-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
}: ShareDialogProps) {
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className={cn("shrink-0", triggerClassName)}>
            <Share2 className="size-4" aria-hidden="true" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Copy the link or share it on another platform.</DialogDescription>
        </DialogHeader>
        <ShareLinkActions url={url} label={`${title} link`} shareText={shareText} />
      </DialogContent>
    </Dialog>
  )
}
