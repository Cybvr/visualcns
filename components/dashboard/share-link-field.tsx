"use client"

import { Link2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

/**
 * The public-link toggle shared by invoices, contracts, and estimates. Turning
 * it on is what lets `path` be opened with no account, via the matching
 * /share route and the shareEnabled read rule in firestore.rules.
 */
export function ShareLinkField({
  enabled,
  onEnabledChange,
  /** Only set once the record has been saved and has an id. */
  path,
}: {
  enabled: boolean
  onEnabledChange: (value: boolean) => void
  path?: string
}) {
  const url = path && typeof window !== "undefined" ? `${window.location.origin}${path}` : ""

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Label htmlFor="share-toggle" className="text-sm font-medium" title="Anyone with the link can view this without an account">
        Public link
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        {enabled && path && (
          <>
            <Input
              readOnly
              value={url}
              className="h-8 w-56 font-mono text-xs"
              onClick={(event) => (event.target as HTMLInputElement).select()}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(url)
                toast.success("Link copied")
              }}
            >
              <Link2 className="size-3.5" />
              Copy
            </Button>
          </>
        )}
        <Switch id="share-toggle" checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
    </div>
  )
}
