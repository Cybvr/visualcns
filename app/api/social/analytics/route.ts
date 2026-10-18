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

const FOLLOWER_NAMES = ["followers_count", "follower_count", "followersCount", "followerCount", "followers", "fan_count", "fans", "subscriber_count", "subscriberCount", "subscribers", "audience_size"]

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  // e.g. { followers: { count: 378 } }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const inner = value as Raw
    for (const key of ["count", "total", "value", "current"]) {
      const found = asNumber(inner[key])
      if (found !== null) return found
    }
  }
  return null
}

/** The first number found under any of the names, looking into nested objects too. */
function pick(source: Raw, names: string[]): number | null {
  for (const name of names) {
    const found = asNumber(source[name])
    if (found !== null) return found
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
    const { db, agencyId, role } = await authorizeSocial(request, companyId)
    const accounts = await companyAccountIds(db, companyId)

    // Followers can sit in the account summary, the account itself or the
    // accounts list, depending on platform and key scopes; take the first found.
    let listed: Record<string, Raw> | null = null
    const listedAccount = async (id: string) => {
      if (!listed) {
        listed = {}
        try {
          for (const item of listOf(await socialApi(agencyId, "/accounts"))) listed[text(item.id)] = item
        } catch { /* the other sources may still have it */ }
      }
      return listed[id] ?? {}
    }

    const summaries = await Promise.all(accounts.map(async (account) => {
      const platform = account.platform || ""
      const problems: string[] = []
      const read = async (label: string, path: string) => {
        try {
          return record(await socialApi(agencyId, path))
        } catch (error) {
          problems.push(`${label}: ${error instanceof Error ? error.message : "failed"}`)
          return {}
        }
      }
      const summary = SUMMARY_PLATFORMS.has(platform) ? await read("summary", `/platforms/${platform}/accounts/${encodeURIComponent(account.id)}/summary`) : {}
      let followers = pick(summary, FOLLOWER_NAMES)
      const single = followers === null ? await read("account", `/accounts/${encodeURIComponent(account.id)}`) : {}
      if (followers === null) followers = pick(single, FOLLOWER_NAMES)
      const fromList = followers === null ? await listedAccount(account.id) : {}
      if (followers === null) followers = pick(fromList, FOLLOWER_NAMES)
      const sources = [summary, single, fromList]
      const firstOf = (names: string[]) => sources.map((source) => pick(source, names)).find((value) => value !== null) ?? null

      const ref = db.collection("socialAccounts").doc(account.id)
      if (followers !== null) await ref.set({ followers, followersAt: new Date().toISOString() }, { merge: true }).catch(() => undefined)
      else {
        // Last known count, and a note in the logs to see what SocialAPI sent instead.
        const saved = (await ref.get()).data()
        if (typeof saved?.followers === "number") followers = saved.followers
        console.warn("Social followers not found", account.id, platform, { summaryKeys: Object.keys(summary), problems })
      }

      return {
        id: account.id,
        platform,
        available: Object.keys(summary).length > 0 || followers !== null,
        followers,
        posts: firstOf(["media_count", "mediaCount", "posts_count", "post_count", "video_count"]),
        following: firstOf(["follows_count", "following_count", "followingCount", "follows"]),
        followerChange: pick(summary, ["net_follower_change", "follower_change", "followers_change", "net_followers", "subscribers_gained"]),
        reach: pick(summary, ["reach", "reach_30d"]),
        views: pick(summary, ["views", "impressions", "view_count", "views_30d"]),
        interactions: pick(summary, ["interactions", "total_interactions", "engagement", "interactions_30d"]),
        // Shown to the agency only, so a missing number can be traced.
        ...(role === "agency" && followers === null && problems.length ? { problem: problems.join(" · ") } : {}),
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
