import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { authorizeSocial, canPublish, companyAccountIds, listOf, socialApi, SocialApiError, socialApiKey, socialFailure, text } from "@/lib/server/social-api"
import { publishStateFrom, type PostPublish } from "@/lib/social"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Sends posts to the company's social accounts.
 * - POST { companyId, creativeId, accountIds, scheduledAt? }   an approved campaign post, now or at scheduledAt (ISO)
 * - POST { companyId, post: { body, mediaUrl?, mediaType? }, accountIds, scheduledAt? }
 *                                                              a new post; sent for approval when the writer can't post
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

/** Sends a post's words and picture to SocialAPI and returns what we keep on the campaign post. */
async function send(agencyId: string, uid: string, content: { body: string; mediaUrl: string }, accountIds: string[], scheduledAt: string): Promise<PostPublish> {
  const post = await socialApi(agencyId, "/posts", {
    method: "POST",
    body: {
      text: content.body,
      targets: accountIds.map((account_id) => ({ account_id })),
      ...(content.mediaUrl ? { media: [{ source_type: "url", source: content.mediaUrl }] } : {}),
      ...(scheduledAt ? { scheduled_at: scheduledAt } : { publish_now: true }),
    },
  })
  return {
    state: scheduledAt ? "scheduled" : "publishing",
    postId: "",
    accountIds,
    ...(scheduledAt ? { scheduledAt } : {}),
    by: uid,
    ...publishFrom(post, {}),
  }
}

function readSchedule(value: unknown): string | NextResponse {
  if (typeof value !== "string" || !value) return ""
  const at = new Date(value)
  if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 60_000) return NextResponse.json({ error: "Pick a time at least a minute from now." }, { status: 400 })
  return at.toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; creativeId?: unknown; post?: { body?: unknown; mediaUrl?: unknown; mediaType?: unknown }; accountIds?: unknown; scheduledAt?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const creativeId = typeof body.creativeId === "string" ? body.creativeId.trim() : ""
    const { db, agencyId, org, role, uid } = await authorizeSocial(request, companyId)
    const allowed = canPublish(role, org) && Boolean(await socialApiKey(agencyId))

    const linked = new Set((await companyAccountIds(db, companyId)).map((account) => account.id))
    const accountIds = Array.isArray(body.accountIds) ? body.accountIds.filter((id): id is string => typeof id === "string" && linked.has(id)) : []
    const scheduledAt = readSchedule(body.scheduledAt)
    if (scheduledAt instanceof NextResponse) return scheduledAt

    // A new post written on the Social page. It goes straight out when the
    // writer may post; otherwise it waits for the agency with the chosen accounts and time.
    if (!creativeId) {
      const words = typeof body.post?.body === "string" ? body.post.body.trim() : ""
      const mediaUrl = typeof body.post?.mediaUrl === "string" && /^https:\/\//.test(body.post.mediaUrl) ? body.post.mediaUrl : ""
      const mediaType = body.post?.mediaType === "video" ? "video" : "image"
      if (!words && !mediaUrl) return NextResponse.json({ error: "Write something or add a picture." }, { status: 400 })
      if (allowed && !accountIds.length) return NextResponse.json({ error: "Pick at least one connected account." }, { status: 400 })
      const ref = db.collection("campaignCreatives").doc()
      const firstLine = words.split("\n")[0].slice(0, 60)
      await ref.set({
        agencyId,
        companyId,
        projectId: "",
        title: firstLine || "Post",
        url: "",
        type: "text",
        kind: "content",
        body: words,
        ...(mediaUrl ? { mediaUrl, mediaType } : {}),
        postedBy: "Founder",
        status: allowed ? "Approved" : "Draft",
        // What the client asked for, so the agency can approve and send it as asked.
        ...(!allowed ? { request: { accountIds, ...(scheduledAt ? { scheduledAt } : {}), by: uid } } : {}),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      if (!allowed) return NextResponse.json({ creativeId: ref.id, queued: true })
      const publish = await send(agencyId, uid, { body: words, mediaUrl }, accountIds, scheduledAt)
      await ref.update({ publish, updatedAt: FieldValue.serverTimestamp() })
      return NextResponse.json({ creativeId: ref.id, publish })
    }

    if (!canPublish(role, org)) return NextResponse.json({ error: "Your agency posts for you. Ask them to switch on posting for your account." }, { status: 403 })
    const { ref, creative } = await loadCreative(db, companyId, creativeId)
    if (creative.status !== "Approved") return NextResponse.json({ error: "Only approved posts can go out." }, { status: 400 })
    const current = creative.publish as PostPublish | undefined
    if (current && ["scheduled", "publishing", "published", "partial"].includes(current.state)) {
      return NextResponse.json({ error: "This post is already scheduled or posted." }, { status: 409 })
    }
    if (!accountIds.length) return NextResponse.json({ error: "Pick at least one connected account." }, { status: 400 })

    const publish = await send(agencyId, uid, { body: text(creative.body), mediaUrl: text(creative.mediaUrl) }, accountIds, scheduledAt)
    await ref.update({ publish, request: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() })
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
