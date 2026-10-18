import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { authorizeSocial, canPublish, companyAccountIds, listOf, socialApi, SocialApiError, socialFailure, text } from "@/lib/server/social-api"
import { publishStateFrom, type PostPublish } from "@/lib/social"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Sends an approved campaign post to the company's social accounts.
 * - POST { companyId, creativeId, accountIds, scheduledAt? }   post now, or at scheduledAt (ISO)
 * - GET ?companyId=&creativeId=                               refresh its status from SocialAPI
 * - DELETE { companyId, creativeId }                           cancel a scheduled post
 */

function failure(error: unknown) {
  const { body, status } = socialFailure(error)
  return NextResponse.json(body, { status })
}

async function loadCreative(db: FirebaseFirestore.Firestore, companyId: string, creativeId: string) {
  const ref = db.collection("campaignCreatives").doc(creativeId)
  const creative = creativeId ? (await ref.get()).data() : undefined
  if (!creative || creative.companyId !== companyId) throw new SocialApiError("We couldn't find that post.", 404)
  return { ref, creative }
}

/** SocialAPI's post, in the shape we keep on the campaign post. */
function publishFrom(post: Record<string, unknown>, previous: Partial<PostPublish>): Partial<PostPublish> {
  const targets = listOf(post.targets).map((target) => ({
    accountId: text(target.account_id),
    platform: text(target.platform),
    status: text(target.status),
    ...(text(target.permalink) ? { permalink: text(target.permalink) } : {}),
    ...(target.error ? { error: typeof target.error === "string" ? target.error : text((target.error as Record<string, unknown>).message) } : {}),
  }))
  const status = text(post.status)
  const state = publishStateFrom(status)
  return {
    ...(status ? { state } : {}),
    postId: text(post.id) || previous.postId || "",
    ...(targets.length ? { targets } : {}),
    ...(status && (state === "published" || state === "partial") ? { publishedAt: previous.publishedAt || new Date().toISOString() } : {}),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; creativeId?: unknown; accountIds?: unknown; scheduledAt?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const creativeId = typeof body.creativeId === "string" ? body.creativeId.trim() : ""
    const { db, agencyId, org, role, uid } = await authorizeSocial(request, companyId)
    if (!canPublish(role, org)) return NextResponse.json({ error: "Your agency posts for you. Ask them to switch on posting for your account." }, { status: 403 })

    const { ref, creative } = await loadCreative(db, companyId, creativeId)
    if (creative.status !== "Approved") return NextResponse.json({ error: "Only approved posts can go out." }, { status: 400 })
    const current = creative.publish as PostPublish | undefined
    if (current && ["scheduled", "publishing", "published", "partial"].includes(current.state)) {
      return NextResponse.json({ error: "This post is already scheduled or posted." }, { status: 409 })
    }

    const linked = new Set((await companyAccountIds(db, companyId)).map((account) => account.id))
    const accountIds = Array.isArray(body.accountIds) ? body.accountIds.filter((id): id is string => typeof id === "string" && linked.has(id)) : []
    if (!accountIds.length) return NextResponse.json({ error: "Pick at least one connected account." }, { status: 400 })

    let scheduledAt = ""
    if (typeof body.scheduledAt === "string" && body.scheduledAt) {
      const at = new Date(body.scheduledAt)
      if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 60_000) return NextResponse.json({ error: "Pick a time at least a minute from now." }, { status: 400 })
      scheduledAt = at.toISOString()
    }

    const mediaUrl = text(creative.mediaUrl)
    const post = await socialApi(agencyId, "/posts", {
      method: "POST",
      body: {
        text: text(creative.body),
        targets: accountIds.map((account_id) => ({ account_id })),
        ...(mediaUrl ? { media: [{ source_type: "url", source: mediaUrl }] } : {}),
        ...(scheduledAt ? { scheduled_at: scheduledAt } : { publish_now: true }),
      },
    })
    const publish: PostPublish = {
      state: scheduledAt ? "scheduled" : "publishing",
      postId: "",
      accountIds,
      ...(scheduledAt ? { scheduledAt } : {}),
      by: uid,
      ...publishFrom(post, {}),
    }
    await ref.update({ publish, updatedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ publish })
  } catch (error) {
    return failure(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || ""
    const creativeId = request.nextUrl.searchParams.get("creativeId")?.trim() || ""
    const { db, agencyId } = await authorizeSocial(request, companyId)
    const { ref, creative } = await loadCreative(db, companyId, creativeId)
    const current = creative.publish as PostPublish | undefined
    if (!current?.postId) return NextResponse.json({ publish: current ?? null })
    const post = await socialApi(agencyId, `/posts/${encodeURIComponent(current.postId)}`)
    const publish = { ...current, ...publishFrom(post, current) }
    await ref.update({ publish })
    return NextResponse.json({ publish })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; creativeId?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const creativeId = typeof body.creativeId === "string" ? body.creativeId.trim() : ""
    const { db, agencyId, org, role } = await authorizeSocial(request, companyId)
    if (!canPublish(role, org)) return NextResponse.json({ error: "Ask your agency to cancel this post." }, { status: 403 })
    const { ref, creative } = await loadCreative(db, companyId, creativeId)
    const current = creative.publish as PostPublish | undefined
    if (!current || current.state !== "scheduled") return NextResponse.json({ error: "Only scheduled posts can be cancelled." }, { status: 400 })
    if (current.postId) {
      await socialApi(agencyId, `/posts/${encodeURIComponent(current.postId)}`, { method: "DELETE" }).catch((error) => {
        if (!(error instanceof SocialApiError && error.status === 404)) throw error
      })
    }
    // Cleared rather than marked cancelled, so the post can be scheduled again.
    await ref.update({ publish: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
