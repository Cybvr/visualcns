"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShareLinkActions } from "@/components/dashboard/share-link-actions"
import { siteUrl } from "@/lib/email-composer"

/**
 * The public-link toggle shared by tasks, invoices, contracts, and estimates.
 * Turning it on is what lets `path` be opened with no account, via the
 * matching /share route and the shareEnabled read rule in firestore.rules.
 */
export function ShareLinkField({
  enabled,
  onEnabledChange,
  disabled = false,
  showActions = true,
  /** Only set once the record has been saved and has an id. */
  path,
}: {
  enabled: boolean
  onEnabledChange: (value: boolean) => void
  disabled?: boolean
  showActions?: boolean
  path?: string
}) {
  const url = path ? siteUrl(path) : ""

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="share-toggle" className="text-sm font-medium">
          Public link
        </Label>
        <Switch id="share-toggle" checked={enabled} onCheckedChange={onEnabledChange} disabled={disabled} />
      </div>
      {showActions && enabled && path && <ShareLinkActions url={url} label="Public link" compact />}
    </div>
  )
}
