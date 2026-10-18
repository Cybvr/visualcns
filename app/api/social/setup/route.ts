import { NextResponse, type NextRequest } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { requireAgencyId } from "@/lib/require-agency-id"
import { getAgencySecret, setAgencySecret } from "@/lib/server/agency-secrets"
import { SOCIAL_CALLBACK_URL, socialApi, socialApiKey, socialFailure, SocialRefused, text } from "@/lib/server/social-api"
import { SITE_ORIGIN } from "@/lib/server/email-branding"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * The agency's SocialAPI setup. Agency admins only.
 * - GET                 whether the key and webhook are in place, and the callback address to whitelist
 * - POST { apiKey? }    saves the key (if given) and registers the webhook for live alerts
 */

const WEBHOOK_URL = `${SITE_ORIGIN}/api/social/webhook`
const EVENTS = ["dm.received", "comment.received", "review.received", "review.updated", "mention.received", "post.published", "post.failed"]

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new SocialRefused("Please sign in again.", 401)
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) throw new SocialRefused("Please sign in again.", 401)
  const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
  if (user.role !== "admin" && user.role !== "superadmin") throw new SocialRefused("Admin access required.")
  return requireAgencyId(user)
}

function failure(error: unknown) {
  const { body, status } = socialFailure(error)
  return NextResponse.json(body, { status })
}

export async function GET(request: NextRequest) {
  try {
    const agencyId = await authorize(request)
    return NextResponse.json({
      configured: Boolean(await socialApiKey(agencyId)),
      webhook: Boolean(await getAgencySecret(agencyId, "SOCIAL_API_WEBHOOK_SECRET", process.env.SOCIAL_API_WEBHOOK_SECRET || "")),
      callbackUrl: SOCIAL_CALLBACK_URL,
      webhookUrl: WEBHOOK_URL,
    })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const agencyId = await authorize(request)
    const body = (await request.json().catch(() => ({}))) as { apiKey?: unknown }
    if (typeof body.apiKey === "string" && body.apiKey.trim()) await setAgencySecret(agencyId, "SOCIAL_API_KEY", body.apiKey.trim())

    if (!(await socialApiKey(agencyId))) return NextResponse.json({ error: "Add your SocialAPI key first." }, { status: 400 })

    // SocialAPI shows the signing secret only once, when the webhook is made.
    // A key that works without alerts is still useful, so a failure here is reported, not thrown.
    let secret = ""
    let webhookError = ""
    try {
      const webhook = await socialApi(agencyId, "/webhooks", { method: "POST", body: { url: WEBHOOK_URL, events: EVENTS } })
      secret = text(webhook.secret) || text(webhook.signing_secret) || text((webhook.data as Record<string, unknown> | undefined)?.secret)
      if (secret) await setAgencySecret(agencyId, "SOCIAL_API_WEBHOOK_SECRET", secret)
      else webhookError = "SocialAPI didn't return a signing secret. Copy it from their dashboard into SOCIAL_API_WEBHOOK_SECRET."
    } catch (error) {
      webhookError = error instanceof Error ? error.message : "Couldn't add the webhook."
    }
    return NextResponse.json({ ok: true, webhook: Boolean(secret), webhookError, callbackUrl: SOCIAL_CALLBACK_URL })
  } catch (error) {
    return failure(error)
  }
}
