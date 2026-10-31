import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { getAgencySecret } from "@/lib/server/agency-secrets"
import { brandedEmail, escapeHtml, normalizeEmailAddress, SITE_ORIGIN } from "@/lib/server/email-branding"
import { listOf, text, verifyWebhook } from "@/lib/server/social-api"
import { toInboxItem } from "@/lib/server/social-inbox"
import { platformLabel, publishStateFrom, type InboxItem, type InboxKind, type PostPublish } from "@/lib/social"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * SocialAPI calls this the moment something happens: a new DM, comment,
 * review or mention is saved to the company's inbox and emailed to them; a
 * post going out (or failing) updates the campaign post.
 * Register it with POST /api/social/setup.
 */

type Raw = Record<string, unknown>

const INBOX_EVENTS: Record<string, InboxKind> = {
  "dm.received": "message",
  "comment.received": "comment",
  "review.received": "review",
  "mention.received": "mention",
}

const KIND_NAMES: Record<InboxKind, string> = { message: "message", comment: "comment", review: "review", mention: "mention" }

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  let payload: Raw
  try {
    payload = JSON.parse(rawBody) as Raw
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 })
  }
  const event = text(payload.event) || request.headers.get("x-socialapi-event") || ""
  // SocialAPI pings once when the webhook is added; nothing to do but say yes.
  if (event === "webhook.test") return NextResponse.json({ ok: true })

  const data = (payload.data && typeof payload.data === "object" ? payload.data : {}) as Raw
  const post = (data.post && typeof data.post === "object" ? data.post : data) as Raw
  const accountId = text(data.account_id) || text(post.account_id) || text(listOf(post.targets)[0]?.account_id)

  const { db } = adminServices()
  const account = accountId ? (await db.collection("socialAccounts").doc(accountId).get()).data() : undefined
  const agencyId = String(account?.agencyId || "")
  const secret = agencyId
    ? await getAgencySecret(agencyId, "SOCIAL_API_WEBHOOK_SECRET", process.env.SOCIAL_API_WEBHOOK_SECRET || "")
    : process.env.SOCIAL_API_WEBHOOK_SECRET || ""
  if (!verifyWebhook(rawBody, request.headers, secret)) return NextResponse.json({ error: "Bad signature" }, { status: 401 })
  // An account we don't know (another workspace, or since disconnected): nothing to update.
  if (!account) return NextResponse.json({ ok: true })

  // SocialAPI retries until it hears back; handle each delivery once.
  const delivery = request.headers.get("x-socialapi-delivery")
  if (delivery) {
    const fresh = await db.collection("socialWebhookDeliveries").doc(delivery).create({ event, at: FieldValue.serverTimestamp() }).then(() => true, () => false)
    if (!fresh) return NextResponse.json({ ok: true })
  }

  const companyId = String(account.companyId || "")
  try {
    if (INBOX_EVENTS[event]) {
      const item = toInboxItem(data, INBOX_EVENTS[event], { platform: String(account.platform || ""), accountId })
      if (item) {
        await db.collection("socialInbox").doc(item.id).set({ ...item, companyId, agencyId, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        await sendAlert(db, agencyId, companyId, item)
      }
    } else if (event === "review.updated") {
      const id = text(record(data.review).id) || text(data.id)
      if (id) await db.collection("socialInbox").doc(id).update({ replied: true, updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined)
    } else if (event.startsWith("post.")) {
      await updatePost(db, event, post)
    } else if (event === "account.disconnected") {
      await db.collection("socialAccounts").doc(accountId).delete()
    }
  } catch (error) {
    console.error("Social webhook failed", event, error)
    if (delivery) await db.collection("socialWebhookDeliveries").doc(delivery).delete().catch(() => undefined)
    return NextResponse.json({ error: "Could not handle event" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

function record(value: unknown): Raw {
  return value && typeof value === "object" ? value as Raw : {}
}

async function updatePost(db: FirebaseFirestore.Firestore, event: string, post: Raw) {
  const postId = text(post.id) || text(post.post_id)
  if (!postId) return
  const found = await db.collection("campaignCreatives").where("publish.postId", "==", postId).limit(1).get()
  const doc = found.docs[0]
  if (!doc) return
  const current = (doc.data().publish ?? {}) as PostPublish
  const state = text(post.status)
    ? publishStateFrom(text(post.status))
    : event === "post.failed" ? "failed" : event === "post.published" ? "published" : current.state
  const targets = listOf(post.targets).map((target) => ({
    accountId: text(target.account_id),
    platform: text(target.platform),
    status: text(target.status),
    ...(text(target.permalink) ? { permalink: text(target.permalink) } : {}),
    ...(target.error ? { error: typeof target.error === "string" ? target.error : text(record(target.error).message) } : {}),
  }))
  const error = text(post.error) || text(record(post.error).message)
  await doc.ref.update({
    publish: {
      ...current,
      state,
      ...(targets.length ? { targets } : {}),
      ...(state === "published" || state === "partial" ? { publishedAt: current.publishedAt || new Date().toISOString() } : {}),
      ...(error ? { error } : {}),
    },
    updatedAt: FieldValue.serverTimestamp(),
  })
}

/** Emails the agency's inbox about something new. Clients are not emailed; they see it in their social inbox. */
async function sendAlert(db: FirebaseFirestore.Firestore, agencyId: string, companyId: string, item: InboxItem) {
  const apiKey = await getAgencySecret(agencyId, "RESEND_API_KEY", process.env.RESEND_API_KEY || "")
  const from = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_FROM", process.env.EMAIL_FROM || ""))
  if (!apiKey || !from) return
  const [org, agencyInbox] = await Promise.all([
    db.collection("organizations").doc(companyId).get().then((snapshot) => snapshot.data() ?? {}),
    getAgencySecret(agencyId, "EMAIL_REPLY_TO", process.env.EMAIL_REPLY_TO || ""),
  ])
  if (org.socialAlerts === false) return
  const to = normalizeEmailAddress(agencyInbox).toLowerCase()
  if (!to) return

  const companyName = String(org.name || "your account")
  const where = platformLabel(item.platform)
  const what = KIND_NAMES[item.kind]
  const subject = `New ${where} ${what} for ${companyName}`
  const slug = String(org.slug || companyId)
  const url = `${SITE_ORIGIN}/${encodeURIComponent(slug)}/social?view=inbox`
  const stars = item.rating ? ` (${item.rating}★)` : ""
  const body = `${item.authorName}${stars} on ${where}:\n\n"${item.text || "(no text)"}"`
  const html = brandedEmail(`<p>${escapeHtml(body).replace(/\n\n/g, "</p><p>")}</p>`, subject, { name: "VisualCNS" }, from, { text: "Open inbox", url })
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: `${body}\n\nOpen inbox: ${url}`, html }),
    cache: "no-store",
  }).catch((error) => console.error("Social alert email failed", error))
}
