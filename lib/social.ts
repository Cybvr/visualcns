/** Social accounts, publishing and inbox: what the browser and the server both need. Backed by SocialAPI. */

export const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", limit: 2200, needsMedia: true },
  { key: "facebook", label: "Facebook", limit: 63206, needsMedia: false },
  { key: "tiktok", label: "TikTok", limit: 2200, needsMedia: true },
  { key: "linkedin", label: "LinkedIn", limit: 3000, needsMedia: false },
  { key: "twitter", label: "X", limit: 280, needsMedia: false },
  { key: "threads", label: "Threads", limit: 500, needsMedia: false },
  { key: "youtube", label: "YouTube", limit: 5000, needsMedia: true },
  { key: "google", label: "Google Business", limit: 1500, needsMedia: false },
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["key"]

export function platformInfo(key: string) {
  return SOCIAL_PLATFORMS.find((platform) => platform.key === key)
}

export function platformLabel(key: string) {
  return platformInfo(key)?.label ?? (key ? key[0].toUpperCase() + key.slice(1) : "Social")
}

export interface SocialAccount {
  id: string
  platform: string
  name: string
  username: string
  status: string
}

/** What GET /api/social/accounts returns. */
export interface SocialAccountsInfo {
  /** False until the agency has added its SocialAPI key. */
  configured: boolean
  accounts: SocialAccount[]
  /** The agency has let this client post on their own. */
  clientPosting: boolean
  /** The viewer may schedule and publish posts. */
  canPublish: boolean
  role: "agency" | "client"
}

export type PublishState = "scheduled" | "publishing" | "published" | "partial" | "failed" | "cancelled"

/** Saved on a campaign post once it is sent to SocialAPI. Written by the server only. */
export interface PostPublish {
  state: PublishState
  postId: string
  accountIds: string[]
  /** ISO time it goes out; empty when posted straight away. */
  scheduledAt?: string
  publishedAt?: string
  targets?: { accountId: string; platform: string; status: string; permalink?: string; error?: string }[]
  error?: string
  by?: string
}

export const PUBLISH_LABELS: Record<PublishState, string> = {
  scheduled: "Scheduled",
  publishing: "Posting",
  published: "Posted",
  partial: "Partly posted",
  failed: "Failed to post",
  cancelled: "Cancelled",
}

/** SocialAPI's post statuses, mapped onto ours. */
export function publishStateFrom(status: string): PublishState {
  if (status === "published" || status === "partial" || status === "failed" || status === "cancelled" || status === "scheduled") return status
  if (status === "publishing" || status === "pending") return "publishing"
  return "scheduled"
}

export type InboxKind = "message" | "comment" | "review" | "mention"

/** One DM, comment, review or mention, in one shape whatever the platform. */
export interface InboxItem {
  id: string
  kind: InboxKind
  platform: string
  accountId: string
  authorName: string
  authorAvatar?: string
  text: string
  at: number
  permalink?: string
  /** Star rating, for reviews. */
  rating?: number
  /** What a reply needs: the conversation for a DM, the post and comment for a comment. */
  conversationId?: string
  postId?: string
  commentId?: string
  replied?: boolean
}
