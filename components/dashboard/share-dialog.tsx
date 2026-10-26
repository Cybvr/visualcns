"use client"

import { useState } from "react"
import { Globe2, Link2, Send, UsersRound } from "lucide-react"
import { toast } from "sonner"

import { ShareLinkField } from "@/components/dashboard/share-link-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { siteUrl } from "@/lib/email-composer"
import { cn } from "@/lib/utils"

type ShareDialogProps = {
  path: string
  title: string
  triggerLabel?: string
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
  /** When provided, the public link follows the record's persisted share setting. */
  access?: {
    enabled: boolean
    onEnabledChange: (enabled: boolean) => void
    disabled?: boolean
  }
  /** For opening over something that sits above the usual dialog layer, like the post viewer. */
  contentClassName?: string
}

/** The reusable share modal for public links. The email composer lives separately. */
export function ShareDialog({
  path,
  title,
  triggerLabel = "Share",
  triggerClassName,
  open,
  onOpenChange,
  showTrigger = true,
  access,
  contentClassName,
}: ShareDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const url = path ? siteUrl(path) : ""
  const itemTitle = title.replace(/^Share\s+/i, "")
  const canCopy = Boolean(path && (access?.enabled ?? true))

  async function copyLink() {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Could not copy the link. Please try again.")
    }
  }

  return (
    <Dialog open={open ?? internalOpen} onOpenChange={onOpenChange ?? setInternalOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={triggerLabel} title={triggerLabel} className={cn("shrink-0 rounded-full text-foreground hover:bg-muted/50", triggerClassName)}>
            <Send className="size-[18px]" aria-hidden="true" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className={cn("max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg gap-0 overflow-y-auto p-0", contentClassName)}>
        <DialogHeader className="border-b border-border px-5 pb-5 pt-6 pr-12 sm:px-6">
          <DialogTitle className="text-xl leading-snug tracking-tight">Share &ldquo;{itemTitle}&rdquo;</DialogTitle>
          <DialogDescription className="sr-only">Control link access and copy the shareable link.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-5 py-6 sm:px-6">
          <Input
            readOnly
            value={canCopy ? url : ""}
            placeholder={path ? "Turn on the public link to share" : "Save this item to generate a link"}
            aria-label="Shareable link"
            onClick={(event) => event.currentTarget.select()}
          />

          <section aria-labelledby="share-people-title" className="space-y-3">
            <h3 id="share-people-title" className="text-sm font-semibold text-foreground">People with access</h3>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UsersRound className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">No individual access list</p>
                <p className="text-xs text-muted-foreground">This link has no individual access controls.</p>
              </div>
            </div>
          </section>

          <section aria-labelledby="share-general-title" className="space-y-3 border-t border-border pt-5">
            <h3 id="share-general-title" className="text-sm font-semibold text-foreground">General access</h3>
            {access ? (
              <ShareLinkField enabled={access.enabled} onEnabledChange={access.onEnabledChange} disabled={access.disabled || !path} path={path || undefined} showActions={false} />
            ) : (
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Globe2 className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Anyone with the link</p>
                  <p className="text-xs text-muted-foreground">Anyone can open this public page without signing in.</p>
                </div>
              </div>
            )}
            {access && <p className="text-xs text-muted-foreground">{access.enabled ? "Anyone with the link can open this shared page." : "Turn on the public link to allow access."}</p>}
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" className="h-9 border border-border bg-transparent px-4" onClick={() => void copyLink()} disabled={!canCopy}>
            <Link2 className="size-4" aria-hidden="true" />
            Copy link
          </Button>
          <DialogClose asChild>
            <Button type="button" className="h-9 px-5">Done</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
