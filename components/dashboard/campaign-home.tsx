"use client"

import { Images, Megaphone, PenLine, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { creativeStatus, READY_FOR_REVIEW, updateCampaignCreative, type CampaignCreative } from "@/lib/campaign-creatives"
import type { CampaignPerson } from "@/lib/campaign-people"
import { toast } from "sonner"

export type CampaignTab = "home" | "analytics" | "about" | "people" | "creatives" | "media" | "payments" | "tasks" | "settings"
export type CampaignQuickAction = "run" | "creator" | "post" | "media"

/** A campaign at a glance: where it stands and what's waiting on you. */
export function CampaignHome({
  people,
  content,
  canReview,
  canEdit,
  onOpen,
  onAction,
}: {
  people: CampaignPerson[]
  content: CampaignCreative[]
  canReview: boolean
  canEdit: boolean
  onOpen: (tab: CampaignTab) => void
  onAction: (action: CampaignQuickAction) => void
}) {
  const posts = content.filter((item) => item.type === "text")
  const approved = posts.filter((post) => creativeStatus(post) === "Approved").length
  const waiting = posts.filter((post) => creativeStatus(post) === READY_FOR_REVIEW)
  const waves = [...new Set(people.map((person) => person.wave).filter(Boolean))]
  const wavesDone = waves.filter((wave) => people.filter((person) => person.wave === wave).every((person) => person.status === "Posted")).length
  const posted = people.filter((person) => person.status === "Posted").length

  const stats = [
    { value: String(people.length), label: "Creators" },
    { value: `${approved}/${posts.length}`, label: "Posts approved" },
    { value: waves.length ? `${wavesDone}/${waves.length}` : "—", label: "Posting days done" },
    { value: `${posted}/${people.length}`, label: "Posted" },
  ]

  const share = (done: number, total: number) => (total ? done / total : 0)
  const rows: { label: string; value: string; progress?: number }[] = [
    { label: "Creators", value: String(people.length) },
    { label: "Posts approved", value: `${approved} of ${posts.length}`, progress: share(approved, posts.length) },
    { label: "Posted", value: `${posted} of ${people.length}`, progress: share(posted, people.length) },
    { label: "Posting days", value: waves.length ? `${wavesDone} of ${waves.length} done` : "Not started" },
  ]

  async function approve(post: CampaignCreative) {
    try {
      await updateCampaignCreative(post.id, { status: "Approved" })
    } catch (error) {
      console.error("Error approving post:", error)
      toast.error("That didn't save.")
    }
  }

  return (
    <div className="space-y-10">
      {/* Phones: a plain list with progress bars. */}
      <div className="md:hidden">
        {rows.map((row) => (
          <div key={row.label} className="border-b border-border py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] text-foreground">{row.label}</p>
              <p className="text-[15px] tabular-nums text-muted-foreground">{row.value}</p>
            </div>
            {row.progress !== undefined && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(row.progress * 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 max-md:hidden lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-muted/60 px-4 py-4">
            <p className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-foreground">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {canEdit && (
        <section aria-label="Campaign actions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { action: "run" as const, label: "Run Campaign", description: "Build the strategy, posts and tasks.", icon: Megaphone },
            { action: "creator" as const, label: "New Creator", description: "Add someone to the campaign roster.", icon: UserPlus },
            { action: "post" as const, label: "New Post", description: "Write a post for review or approval.", icon: PenLine },
            { action: "media" as const, label: "New Media", description: "Upload a file or add a useful link.", icon: Images },
          ].map(({ action, label, description, icon: Icon }) => (
            <button
              key={action}
              type="button"
              onClick={() => onAction(action)}
              className="group flex min-h-28 flex-col items-start justify-between rounded-2xl border border-border bg-card p-5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-5 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
              <span>
                <span className="block text-sm font-semibold text-foreground">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
              </span>
            </button>
          ))}
        </section>
      )}

      <section>
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">To review</h3>
        <div className="mt-3">
          {waiting.length === 0 ? (
            <p className="border-b border-border py-4 text-sm text-muted-foreground">Nothing to review.</p>
          ) : waiting.map((post) => (
            <div key={post.id} className="flex items-center gap-4 border-b border-border py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{post.body?.split("\n").find(Boolean) || "No text yet."}</p>
              </div>
              {canReview && <Button type="button" size="sm" onClick={() => void approve(post)}>Approve</Button>}
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => onOpen("creatives")}>Open</Button>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
