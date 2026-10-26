"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Globe2, Link2, LockKeyhole, Mail, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { buildEmailComposeHref, parseEmailList, siteUrl } from "@/lib/email-composer"
import { cn } from "@/lib/utils"

type ShareDialogProps = {
  path: string
  title: string
  triggerLabel?: string
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
  /** A signed-in person who can manage this item, when known. */
  viewer?: { name?: string | null; email?: string | null }
  /** When provided, the public link follows the record's persisted share setting. */
  access?: {
    enabled: boolean
    onEnabledChange: (enabled: boolean) => void
    disabled?: boolean
  }
  /** Public share pages use the visitor's mail app instead of the dashboard composer. */
  emailMode?: "internal" | "system"
  /** For opening over something above the usual dialog layer, like the post viewer. */
  contentClassName?: string
}

/** The reusable share layout for emailing a link and controlling general access. */
export function ShareDialog({
  path,
  title,
  triggerLabel = "Share",
  triggerClassName,
  open,
  onOpenChange,
  showTrigger = true,
  viewer,
  access,
  emailMode = "internal",
  contentClassName,
}: ShareDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [recipientInput, setRecipientInput] = useState("")
  const url = path ? siteUrl(path) : ""
  const itemTitle = title.replace(/^Share\s+/i, "")
  const canCopy = Boolean(path && (access?.enabled ?? true))
  const restricted = access?.enabled === false
  const viewerName = viewer?.name?.trim() || viewer?.email?.trim() || "You"
  const viewerEmail = viewer?.email?.trim() || ""

  async function copyLink() {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Could not copy the link. Please try again.")
    }
  }

  function emailLink() {
    if (!canCopy) return
    const { valid, invalid } = parseEmailList(recipientInput)
    if (invalid.length || !valid.length) {
      toast.error("Enter a valid email address.")
      return
    }
    const subject = "Sharing " + itemTitle
    const body = "Hi,\n\nHere is the link to " + itemTitle + ":\n" + url
    if (emailMode === "system") {
      window.location.href = "mailto:" + valid.join(",") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body)
    } else {
      router.push(buildEmailComposeHref({ recipientEmail: valid[0], cc: valid.slice(1).join(","), subject, body }))
    }
    setRecipientInput("")
    onOpenChange?.(false)
    setInternalOpen(false)
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
        <DialogHeader className="px-5 pb-2 pt-6 pr-12 sm:px-6">
          <DialogTitle className="text-2xl font-normal leading-snug tracking-tight">Share &lsquo;{itemTitle}&rsquo;</DialogTitle>
          <DialogDescription className="sr-only">Email a link or control who can open it.</DialogDescription>
        </DialogHeader>

        <div className="space-y-7 px-5 py-5 sm:px-6">
          <fieldset className="rounded-md border border-input px-3 pb-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <legend className="px-1 text-sm text-muted-foreground">Email people a link</legend>
            <div className="flex items-center gap-2">
              <Input
                value={recipientInput}
                onChange={(event) => setRecipientInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); emailLink() } }}
                placeholder="Email address"
                aria-label="Email addresses to share with"
                disabled={!canCopy}
                className="h-9 min-w-0 flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
              />
              <Button type="button" size="icon" variant="ghost" className="size-8 shrink-0 text-primary" aria-label="Open email draft" title="Open email draft" onClick={emailLink} disabled={!canCopy || !recipientInput.trim()}>
                <Mail className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </fieldset>

          <section aria-labelledby="share-people-title" className="space-y-3">
            <h3 id="share-people-title" className="text-base font-semibold text-foreground">People with access</h3>
            {viewer ? (
              <div className="flex items-center gap-3 rounded-lg py-1">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" aria-hidden="true">{viewerName.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{viewerName} (you)</p>
                  {viewerEmail && <p className="truncate text-xs text-muted-foreground">{viewerEmail}</p>}
                </div>
                <span className="text-sm text-muted-foreground">Can manage</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Individual access is not available for this link.</p>
            )}
          </section>

          <section aria-labelledby="share-general-title" className="space-y-3 border-t border-border pt-5">
            <h3 id="share-general-title" className="text-base font-semibold text-foreground">General access</h3>
            <div className="flex items-center gap-3">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", restricted ? "bg-muted text-foreground" : "bg-primary/10 text-primary")} aria-hidden="true">
                {restricted ? <LockKeyhole className="size-5" /> : <Globe2 className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                {access ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" className="-ml-2 h-8 gap-1 px-2 text-sm font-medium" disabled={access.disabled || !path}>
                        {restricted ? "Restricted" : "Anyone with the link"}<ChevronDown className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onSelect={() => access.onEnabledChange(false)}>Restricted</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => access.onEnabledChange(true)}>Anyone with the link</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : <p className="text-sm font-medium text-foreground">Anyone with the link</p>}
                <p className="text-xs text-muted-foreground">{!path ? "Save this item to generate a link." : restricted ? "Turn on the link to let others view this item." : "Anyone with the link can view this item."}</p>
              </div>
              {canCopy && <span className="text-sm text-muted-foreground">Viewer</span>}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
          <Button type="button" variant="outline" className="h-10 rounded-full px-4 text-primary" onClick={() => void copyLink()} disabled={!canCopy}>
            <Link2 className="size-4" aria-hidden="true" />Copy link
          </Button>
          <DialogClose asChild>
            <Button type="button" className="h-10 rounded-full px-6">Done</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
