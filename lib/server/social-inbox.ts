import { listOf, text } from "@/lib/server/social-api"
import type { InboxItem, InboxKind } from "@/lib/social"

/**
 * SocialAPI's DMs, comments, reviews and mentions in one shape. Field names
 * vary a little between endpoints and webhooks, so each value is looked for
 * under the names SocialAPI uses.
 */

type Raw = Record<string, unknown>

function record(value: unknown): Raw {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Raw : {}
}

function first(...values: unknown[]) {
  for (const value of values) {
    const found = text(value)
    if (found) return found
  }
  return ""
}

function millis(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && value > 0) return value < 1e12 ? value * 1000 : value
    if (typeof value === "string" && value) {
      const parsed = Date.parse(value)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return 0
}

const KINDS: Record<string, InboxKind> = {
  dm: "message", message: "message", direct_message: "message", conversation: "message",
  comment: "comment", reply: "comment",
  review: "review",
  mention: "mention",
}

export function kindFrom(value: string, fallback: InboxKind): InboxKind {
  return KINDS[value.toLowerCase().replace(/\.received$|\.updated$/, "")] ?? fallback
}

export function toInboxItem(raw: Raw, fallbackKind: InboxKind, extra: Partial<InboxItem> = {}): InboxItem | null {
  const author = record(raw.author ?? raw.from ?? raw.reviewer ?? raw.participant ?? raw.sender)
  const content = record(raw.content)
  const lastMessage = record(raw.last_message ?? raw.latest_message)
  const id = first(raw.id, raw.interaction_id, raw.review_id, raw.comment_id, raw.conversation_id)
  if (!id) return null
  const kind = kindFrom(first(raw.type, raw.kind), fallbackKind)
  const rating = Number(raw.rating ?? raw.star_rating ?? raw.stars)
  const reply = raw.reply ?? raw.review_reply ?? raw.replied_at
  return {
    id,
    kind,
    platform: first(raw.platform, extra.platform),
    accountId: first(raw.account_id, extra.accountId),
    authorName: first(author.name, author.display_name, author.username, raw.author_name) || "Someone",
    ...(first(author.avatar_url, author.avatar, author.profile_picture_url, author.picture) ? { authorAvatar: first(author.avatar_url, author.avatar, author.profile_picture_url, author.picture) } : {}),
    text: first(content.text, raw.text, raw.message, raw.comment, lastMessage.text, record(lastMessage.content).text),
    at: millis(raw.created_at, raw.timestamp, raw.created_time, raw.updated_at, lastMessage.created_at) || Date.now(),
    ...(first(raw.permalink, raw.url) ? { permalink: first(raw.permalink, raw.url) } : {}),
    ...(Number.isFinite(rating) && rating > 0 ? { rating } : {}),
    ...(kind === "message" ? { conversationId: first(raw.conversation_id, extra.conversationId, fallbackKind === "message" && !raw.conversation_id ? id : "") } : {}),
    ...(kind === "comment" ? { postId: first(raw.post_id, raw.platform_post_id, extra.postId), commentId: first(raw.comment_id, id) } : {}),
    ...(reply ? { replied: true } : {}),
    ...Object.fromEntries(Object.entries(extra).filter(([key]) => !["platform", "accountId", "conversationId", "postId"].includes(key))),
  }
}

export function inboxItemsFrom(value: unknown, kind: InboxKind, extra: Partial<InboxItem> = {}) {
  return listOf(value).map((raw) => toInboxItem(raw, kind, extra)).filter((item): item is InboxItem => Boolean(item))
}
