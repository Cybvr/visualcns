import { NextResponse, type NextRequest } from "next/server"
import { createHash, randomBytes } from "node:crypto"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { getAgencySecret } from "@/lib/server/agency-secrets"
import { brandedEmail, escapeHtml, normalizeEmailAddress, SITE_ORIGIN } from "@/lib/server/email-branding"
import { visitorStaff } from "@/lib/server/visitor-staff"
import { isVisitorPlan, planForStaff, staffLimit, VISITOR_PLANS } from "@/lib/visitor-billing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A company's Visitor Sign-in staff: the people visitors can pick and who get
 * arrival emails. Each staff member or pending invite is a seat, capped by the
 * site's plan. The company's own staff and the agency's admins can use it.
 * - GET ?companyId=   staff, pending invites, seats and the limit
 * - POST { email }    invite someone (emails them the link)
 * - DELETE { inviteId } cancels an invite; DELETE { userId } removes someone
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

class Refused extends Error {}

async function authorize(request: NextRequest, companyId: string) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token || !companyId) throw new Refused("Please sign in again.")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) throw new Refused("Please sign in again.")
  const user = (await db.collection("users").doc(decoded.uid).get()).data() ?? {}
  const org = (await db.collection("organizations").doc(companyId).get()).data()
  if (!org) throw new Refused("We couldn't find that company.")
  const agencyId = String(org.agencyId || "")
  const allowed = user.role === "superadmin"
    || (user.role === "admin" && user.agencyId === agencyId)
    || (user.agencyId === agencyId && user.companyId === companyId)
  if (!agencyId || !allowed) throw new Refused("You can't manage staff for this company.")
  return { db, uid: decoded.uid, agencyId, org, inviterName: String(user.displayName || decoded.name || decoded.email || "") }
}

async function seatInfo(db: FirebaseFirestore.Firestore, agencyId: string, companyId: string) {
  const [people, billing] = await Promise.all([
    visitorStaff(db, agencyId, companyId),
    db.collection("visitorBilling").doc(companyId).get().then((snapshot) => snapshot.data()),
  ])
  const limit = staffLimit(billing as Parameters<typeof staffLimit>[0])
  const plan = isVisitorPlan(billing?.plan) ? billing.plan : null
  return { ...people, limit, plan }
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status })
}

function failure(error: unknown) {
  if (error instanceof Refused) return json({ error: error.message }, 403)
  console.error("Visitor staff failed", error)
  return json({ error: "Something went wrong. Please try again." }, 500)
}

async function sendInvite(agencyId: string, to: string, companyName: string, inviterName: string, url: string) {
  const apiKey = await getAgencySecret(agencyId, "RESEND_API_KEY", process.env.RESEND_API_KEY || "")
  const from = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_FROM", process.env.EMAIL_FROM || ""))
  if (!apiKey || !from) return false
  const subject = `${inviterName || companyName} invited you to ${companyName} on VisualCNS`
  const text = `${inviterName || "Your colleague"} added you to ${companyName}'s visitor sign-in. Visitors can pick you when they arrive at the front desk, and you'll get an email when they do.\n\nAccept the invite to set up your account. The link works for 7 days.`
  const html = brandedEmail(`<p>${escapeHtml(text).replace(/\n\n/g, "</p><p>")}</p>`, subject, { name: "VisualCNS" }, from, { text: "Accept invite", url })
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: `${text}\n\nAccept invite: ${url}`, html }),
    cache: "no-store",
  }).catch(() => null)
  return Boolean(response?.ok)
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || ""
    const { db, agencyId } = await authorize(request, companyId)
    return json(await seatInfo(db, agencyId, companyId))
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; email?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const { db, uid, agencyId, org, inviterName } = await authorize(request, companyId)
    if (!EMAIL_PATTERN.test(email)) return json({ error: "Enter a valid email address." }, 400)

    const info = await seatInfo(db, agencyId, companyId)
    if (info.staff.some((person) => person.email.toLowerCase() === email)) return json({ error: "That person is already on your staff." }, 409)
    if (info.pending.some((invite) => invite.email.toLowerCase() === email)) return json({ error: "That person already has an invite." }, 409)
    if (info.seats >= info.limit) {
      const next = planForStaff(info.seats + 1)
      return json({
        error: next
          ? `Your ${info.plan ? VISITOR_PLANS[info.plan].name : "current"} plan covers ${info.limit} staff. Upgrade to ${VISITOR_PLANS[next].name} to add more.`
          : `You've reached ${info.limit} staff. Contact us for an Enterprise plan.`,
        upgrade: next,
      }, 402)
    }

    const rawToken = randomBytes(32).toString("hex")
    const companyName = String(org.name || "your company")
    await db.collection("invites").doc().set({
      agencyId,
      email,
      role: "client",
      companyId,
      company: companyName,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      status: "pending",
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    const inviteUrl = `${SITE_ORIGIN}/invite/${rawToken}`
    const emailed = await sendInvite(agencyId, email, companyName, inviterName, inviteUrl)
    return json({ ok: true, inviteUrl, emailed })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; inviteId?: unknown; userId?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const { db, uid, agencyId } = await authorize(request, companyId)

    if (typeof body.inviteId === "string" && body.inviteId) {
      const ref = db.collection("invites").doc(body.inviteId)
      const invite = (await ref.get()).data()
      if (!invite || invite.companyId !== companyId || invite.agencyId !== agencyId) return json({ error: "We couldn't find that invite." }, 404)
      await ref.update({ status: "cancelled", updatedAt: FieldValue.serverTimestamp() })
      return json({ ok: true })
    }

    if (typeof body.userId === "string" && body.userId) {
      if (body.userId === uid) return json({ error: "You can't remove yourself." }, 400)
      const ref = db.collection("users").doc(body.userId)
      const person = (await ref.get()).data()
      if (!person || person.companyId !== companyId || person.agencyId !== agencyId || person.role !== "client") return json({ error: "We couldn't find that person." }, 404)
      // They keep their login but lose access to this company.
      await ref.update({ role: FieldValue.delete(), agencyId: FieldValue.delete(), companyId: FieldValue.delete(), company: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() })
      return json({ ok: true })
    }

    return json({ error: "Nothing to remove." }, 400)
  } catch (error) {
    return failure(error)
  }
}
