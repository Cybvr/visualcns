"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { CompactListRow, CompactListSkeleton } from "@/components/dashboard/compact-list-row"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { campaignSharePath, formatBriefDate } from "@/lib/campaign-brief"
import { formatPay } from "@/lib/campaign-people"

type CreatorCampaign = {
  id: string
  projectId: string
  title: string
  client: string
  logoUrl: string
  status: string
  handle: string
  app: string
  pay: number
  currency: string
  offer: string
  /** The opening they applied for, e.g. Graphic designer. Empty for creators who post. */
  role: string
  openingId: string
  postFrom: string
  postTo: string
  postLink: string
  paid: boolean
}

/** A creator's Campaigns page: every campaign they applied to, and the link to their post on each. */
export function CreatorCampaigns() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<CreatorCampaign[] | null>(null)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState<CreatorCampaign | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const response = await fetch("/api/creator", { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" })
      if (!response.ok) throw new Error()
      const result = await response.json() as { campaigns: CreatorCampaign[] }
      setCampaigns(result.campaigns)
    } catch {
      setError(true)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      {error ? (
        <p role="alert" className="mt-10 text-sm text-destructive">Campaigns unavailable. Refresh to try again.</p>
      ) : campaigns === null ? (
        <CompactListSkeleton rows={3} />
      ) : campaigns.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No campaigns yet.</p>
      ) : (
        campaigns.map((campaign) => {
          const pay = campaign.pay ? formatPay(campaign.pay, campaign.currency) : campaign.offer
          const dates = [formatBriefDate(campaign.postFrom), formatBriefDate(campaign.postTo)].filter(Boolean).join(" to ")
          return (
            <CompactListRow
              key={campaign.id}
              title={campaign.title}
              leading={campaign.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={campaign.logoUrl} alt="" className="size-11 rounded-full object-cover" />
              ) : undefined}
              avatarText={campaign.client || campaign.title}
              subtitle={[campaign.client, campaign.role || campaign.handle, dates].filter(Boolean).join(" · ")}
              meta={pay}
              trailing={
                <span className="flex items-center gap-3">
                  {pay && <span className="whitespace-nowrap">{pay}</span>}
                  <Badge variant="secondary" className="rounded-full">{campaign.paid ? "Paid" : campaign.status}</Badge>
                </span>
              }
              onClick={() => setOpen(campaign)}
              ariaLabel={`Open ${campaign.title}`}
            />
          )
        })
      )}

      <PostLinkDialog
        campaign={open}
        onClose={() => setOpen(null)}
        onSaved={async () => { setOpen(null); await load() }}
      />
    </main>
  )
}

function PostLinkDialog({ campaign, onClose, onSaved }: { campaign: CreatorCampaign | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const { user } = useAuth()
  const [postLink, setPostLink] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => setPostLink(campaign?.postLink ?? ""), [campaign])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!user || !campaign || saving) return
    setSaving(true)
    try {
      const response = await fetch("/api/creator", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: campaign.id, postLink }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(result.error || "That didn't save.")
      toast.success("Saved")
      await onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={campaign !== null} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="dashboard-body max-w-md">
        <form onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{campaign?.title}</DialogTitle>
            <DialogDescription>{campaign?.client}</DialogDescription>
          </DialogHeader>
          <Input value={postLink} onChange={(event) => setPostLink(event.target.value)} placeholder="https://" aria-label="Post link" type="url" />
          <DialogFooter>
            <Button type="button" variant="outline" asChild>
              <a href={campaignSharePath(campaign?.projectId ?? "", campaign?.openingId)} target="_blank" rel="noreferrer">Brief</a>
            </Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
