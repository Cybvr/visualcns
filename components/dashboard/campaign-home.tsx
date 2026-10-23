"use client"

import type { ReactNode } from "react"
import { Images, Megaphone, PenLine, Share2, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CampaignCreative } from "@/lib/campaign-creatives"

export type CampaignTab = "home" | "build" | "analytics" | "about" | "people" | "creatives" | "media" | "payments" | "tasks" | "settings"
export type CampaignQuickAction = "run" | "creator" | "post" | "media"

/** A campaign at a glance: where it stands and what's waiting on you. */
export function CampaignHome({
  content,
  canEdit,
  onOpen,
  onAction,
  name,
  bannerImage: campaignImage,
  latestContent,
  sharePath,
}: {
  content: CampaignCreative[]
  canEdit: boolean
  onOpen: (tab: CampaignTab) => void
  onAction: (action: CampaignQuickAction) => void
  /** The campaign's name, shown on the banner. */
  name: string
  /** The campaign cover/logo/media image, when one has been attached. */
  bannerImage?: string
  /** The newest posts, drawn by the Content tab's own list so cards, menus and the viewer match it. */
  latestContent: ReactNode
  /** The campaign's public share page, opened from the banner. */
  sharePath?: string
}) {
  const posts = content.filter((item) => item.type === "text")
  const bannerImage = campaignImage || posts.find((post) => post.mediaUrl && post.mediaType !== "video")?.mediaUrl

  return (
    <div className="space-y-5">
      <div aria-label="Campaign overview" className="relative h-20 overflow-hidden rounded-xl bg-muted sm:h-24">
        {bannerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImage} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
        <p className="relative flex h-full items-center px-4 text-sm font-semibold text-white sm:px-5">{name}</p>
        {sharePath && (
          <a
            href={sharePath}
            target="_blank"
            rel="noreferrer"
            aria-label="Open campaign share page"
            title="Share campaign"
            className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white outline-none transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-ring sm:right-4"
          >
            <Share2 className="size-4" aria-hidden="true" />
          </a>
        )}
      </div>

      {canEdit && (
        <section aria-label="Campaign actions" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { action: "run" as const, label: "Run Campaign", icon: Megaphone },
            { action: "creator" as const, label: "New Creator", icon: UserPlus },
            { action: "post" as const, label: "New Post", icon: PenLine },
            { action: "media" as const, label: "New Media", icon: Images },
          ].map(({ action, label, icon: Icon }) => (
            <button
              key={action}
              type="button"
              onClick={() => onAction(action)}
              className="group flex min-h-14 items-center gap-2.5 rounded-sm bg-primary/5 p-3 text-left outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-5 text-primary transition-colors" aria-hidden="true" />
              <span className="block text-sm font-semibold text-primary">{label}</span>
            </button>
          ))}
        </section>
      )}

      {posts.length > 0 && (
        <section aria-labelledby="campaign-content-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 id="campaign-content-heading" className="text-lg font-semibold tracking-[-0.01em] text-foreground">Content</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpen("creatives")}>View all</Button>
          </div>
          {latestContent}
        </section>
      )}

    </div>
  )
}
