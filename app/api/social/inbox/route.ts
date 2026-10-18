import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { authorizeSocial, companyAccountIds, listOf, socialApi, SocialApiError, socialFailure, text } from "@/lib/server/social-api"
import { inboxItemsFrom } from "@/lib/server/social-inbox"
import type { InboxItem } from "@/lib/social"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A company's DMs, comments, Google reviews and mentions in one list.
 * - GET ?companyId=                         newest first: what webhooks saved plus a fresh read from SocialAPI
 * - POST { companyId, item, text }           reply to one
 */

const LIMIT = 200
const COMMENT_POSTS = 10

function failure(error: unknown) {
  const { body, status } = socialFailure(error)
  return NextResponse.json(body, { status })
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || ""
    const { db, agencyId } = await authorizeSocial(request, companyId)
    const accounts = await companyAccountIds(db, companyId)
    if (!accounts.length) return NextResponse.json({ items: [] })
    const ours = new Set(accounts.map((account) => account.id))
    const mine = (item: InboxItem) => ours.has(item.accountId)

    const saved = await db.collection("socialInbox").where("companyId", "==", companyId).orderBy("at", "desc").limit(LIMIT).get()
    const items = new Map<string, InboxItem>()
    for (const doc of saved.docs) {
      const { companyId: _companyId, agencyId: _agencyId, ...item } = doc.data()
      items.set(doc.id, item as InboxItem)
    }

    // Reads are free on SocialAPI; any that fail just leave what webhooks saved.
    const missed: string[] = []
    const read = async (label: string, run: () => Promise<InboxItem[]>) => {
      try {
        for (const item of (await run()).filter(mine)) items.set(item.id, { ...items.get(item.id), ...item, replied: item.replied || items.get(item.id)?.replied })
      } catch (error) {
        console.error(`Social inbox: ${label} failed`, error)
        missed.push(label)
      }
    }
    await Promise.all([
      read("messages", async () => inboxItemsFrom(await socialApi(agencyId, "/inbox/conversations"), "message")),
      read("reviews", async () => inboxItemsFrom(await socialApi(agencyId, "/inbox/reviews"), "review")),
      read("comments", async () => {
        const posts = listOf(await socialApi(agencyId, "/inbox/comments"))
          .filter((post) => ours.has(text(post.account_id)))
          .slice(0, COMMENT_POSTS)
        const lists = await Promise.all(posts.map(async (post) => {
          const postId = text(post.id) || text(post.post_id)
          if (!postId) return []
          const extra = { platform: text(post.platform), accountId: text(post.account_id), postId, ...(text(post.permalink) ? { permalink: text(post.permalink) } : {}) }
          return inboxItemsFrom(await socialApi(agencyId, `/inbox/comments/${encodeURIComponent(postId)}`), "comment", extra)
        }))
        return lists.flat()
      }),
    ])

    const list = [...items.values()].sort((a, b) => b.at - a.at).slice(0, LIMIT)
    return NextResponse.json({ items: list, missed })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; item?: Partial<InboxItem>; text?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const reply = typeof body.text === "string" ? body.text.trim() : ""
    const item = body.item ?? {}
    const { db, agencyId } = await authorizeSocial(request, companyId)
    if (!reply) return NextResponse.json({ error: "Write a reply first." }, { status: 400 })
    const ours = new Set((await companyAccountIds(db, companyId)).map((account) => account.id))
    if (!item.accountId || !ours.has(item.accountId)) return NextResponse.json({ error: "That message isn't for this company's accounts." }, { status: 404 })

    if (item.kind === "message" && item.conversationId) {
      await socialApi(agencyId, `/inbox/conversations/${encodeURIComponent(item.conversationId)}/messages`, { method: "POST", body: { text: reply } })
    } else if (item.kind === "comment" && item.postId) {
      await socialApi(agencyId, `/inbox/comments/${encodeURIComponent(item.postId)}`, { method: "POST", body: { text: reply, account_id: item.accountId, comment_id: item.commentId || item.id } })
    } else if (item.kind === "review" && item.id) {
      await socialApi(agencyId, `/inbox/reviews/${encodeURIComponent(item.id)}/reply`, { method: "POST", body: { account_id: item.accountId, text: reply } })
    } else {
      return NextResponse.json({ error: "Replies aren't supported for this one. Open it on the platform instead." }, { status: 400 })
    }

    if (item.id) {
      // Only items a webhook saved are kept here; others are read fresh each time.
      await db.collection("socialInbox").doc(item.id).update({ replied: true, updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SocialApiError && error.status === 501) {
      return NextResponse.json({ error: "This platform doesn't allow replies from outside its app." }, { status: 400 })
    }
    return failure(error)
  }
}
