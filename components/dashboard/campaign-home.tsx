"use client"

import { useState } from "react"
import { Image as ImageIcon, Images, Megaphone, Palette, PenLine, UserPlus } from "lucide-react"

import { CampaignPostViewDialog } from "@/components/dashboard/campaign-creatives"
import { CollectionItemMenu } from "@/components/dashboard/collection-view"
import { Button } from "@/components/ui/button"
import type { CampaignCreative } from "@/lib/campaign-creatives"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"

export type CampaignTab = "home" | "build" | "analytics" | "about" | "people" | "creatives" | "media" | "payments" | "tasks" | "settings"
export type CampaignQuickAction = "run" | "creator" | "post" | "media"

/** A campaign at a glance: where it stands and what's waiting on you. */
export function CampaignHome({
  content,
  canEdit,
  onOpen,
  onAction,
  bannerImage: campaignImage,
}: {
  content: CampaignCreative[]
  canEdit: boolean
  onOpen: (tab: CampaignTab) => void
  onAction: (action: CampaignQuickAction) => void
  /** The campaign cover/logo/media image, when one has been attached. */
  bannerImage?: string
}) {
  const posts = content.filter((item) => item.type === "text")
  // Held by id so the open post picks up edits made in the viewer.
  const [viewingId, setViewingId] = useState<string | null>(null)
  const viewingPost = posts.find((post) => post.id === viewingId) ?? null
  const setViewingPost = (post: CampaignCreative | null) => setViewingId(post?.id ?? null)
  const bannerImage = campaignImage || posts.find((post) => post.mediaUrl && post.mediaType !== "video")?.mediaUrl

  return (
    <div className="space-y-5">
      <CampaignPostViewDialog
        post={viewingPost}
        open={Boolean(viewingPost)}
        onClose={() => setViewingPost(null)}
        canEdit={canEdit}
        posts={posts}
        onNavigate={setViewingPost}
      />
      <div aria-label="Campaign overview" className="relative h-20 overflow-hidden rounded-xl bg-muted sm:h-24">
        {bannerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImage} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
        <p className="relative flex h-full items-center px-4 text-sm font-semibold text-white sm:px-5">Campaign at a glance</p>
      </div>

      {canEdit && (
        <section aria-label="Campaign actions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <GridCardList>
            {posts.slice(0, 4).map((post) => (
              <GridCard
                key={post.id}
                icon={<Palette className="size-4 text-muted-foreground" aria-hidden="true" />}
                title={post.title || "Post"}
                menuLabel={`Options for ${post.title || "post"}`}
                menu={<CollectionItemMenu actions={{ noun: "post", name: post.title || "Post", onOpen: () => setViewingPost(post) }} />}
                preview={post.mediaUrl ? (
                  post.mediaType === "video"
                    ? <video src={post.mediaUrl} muted playsInline preload="metadata" className="size-full object-cover" />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={post.mediaUrl} alt="" loading="lazy" className="size-full object-cover" />
                ) : undefined}
                placeholder={<div className="flex size-full items-center justify-center bg-muted/30" aria-label="No thumbnail available"><ImageIcon className="size-10 text-muted-foreground/45" aria-hidden="true" /></div>}
                onClick={() => setViewingPost(post)}
                ariaLabel={`Open content: ${post.title || "Post"}`}
              />
            ))}
          </GridCardList>
        </section>
      )}

    </div>
  )
}
