import { NextResponse, type NextRequest } from "next/server"

import { authorizeSocial, companyAccountIds, listOf, socialApi, socialFailure, text } from "@/lib/server/social-api"
import type { PostPublish } from "@/lib/social"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET ?companyId= the company's social numbers: followers, reach and
 * engagement for each account SocialAPI has a summary for (Instagram and
 * YouTube today), and likes, comments and shares on its recent posts.
 */

const SUMMARY_PLATFORMS = new Set(["instagram", "youtube"])
const RECENT_POSTS = 12

type Raw = Record<string, unknown>

function record(value: unknown): Raw {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Raw : {}
}

/** The first number found under any of the names, looking one level into nested objects too. */
function pick(source: Raw, names: string[]): number | null {
  for (const name of names) {
    const value = source[name]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  }
  for (const value of Object.values(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const found = pick(value as Raw, names)
      if (found !== null) return found
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || ""
    const { db, agencyId } = await authorizeSocial(request, companyId)
    const accounts = await companyAccountIds(db, companyId)

    const summaries = await Promise.all(accounts.map(async (account) => {
      const platform = account.platform || ""
      const base = { id: account.id, platform }
      if (!SUMMARY_PLATFORMS.has(platform)) return { ...base, available: false }
      try {
        const summary = record(await socialApi(agencyId, `/platforms/${platform}/accounts/${encodeURIComponent(account.id)}/summary`))
        return {
          ...base,
          available: true,
          followers: pick(summary, ["followers_count", "followers", "subscriber_count", "subscribers"]),
          followerChange: pick(summary, ["net_follower_change", "follower_change", "followers_change", "net_followers", "subscribers_gained"]),
          reach: pick(summary, ["reach", "reach_30d"]),
          views: pick(summary, ["views", "impressions", "view_count", "views_30d"]),
          interactions: pick(summary, ["interactions", "total_interactions", "engagement", "interactions_30d"]),
        }
      } catch (error) {
        console.error("Social summary failed", account.id, error)
        return { ...base, available: false }
      }
    }))

    const published = await db.collection("campaignCreatives").where("companyId", "==", companyId).where("publish.state", "in", ["published", "partial"]).get()
    const recent = published.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .sort((a, b) => String((b.data.publish as PostPublish).publishedAt || "").localeCompare(String((a.data.publish as PostPublish).publishedAt || "")))
      .slice(0, RECENT_POSTS)
    const posts = await Promise.all(recent.map(async ({ id, data }) => {
      const publish = data.publish as PostPublish
      const base = { creativeId: id, title: text(data.title) || "Post", publishedAt: publish.publishedAt || "", likes: 0, comments: 0, shares: 0, saves: 0 }
      try {
        const metrics = listOf(await socialApi(agencyId, `/posts/${encodeURIComponent(publish.postId)}/metrics`))
        for (const target of metrics) {
          const numbers = { ...record(target.metrics), ...target }
          base.likes += pick(numbers, ["likes", "like_count"]) ?? 0
          base.comments += pick(numbers, ["comments", "comment_count"]) ?? 0
          base.shares += pick(numbers, ["shares", "share_count", "reposts"]) ?? 0
          base.saves += pick(numbers, ["saves", "saved"]) ?? 0
        }
      } catch (error) {
        console.error("Social post metrics failed", id, error)
      }
      return base
    }))

    return NextResponse.json({ accounts: summaries, posts })
  } catch (error) {
    const { body, status } = socialFailure(error)
    return NextResponse.json(body, { status })
  }
}
