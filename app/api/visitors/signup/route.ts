import { NextResponse, type NextRequest } from "next/server"
import { randomBytes } from "node:crypto"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { getSiteAgencyId } from "@/lib/require-agency-id"
import { getAgencySecret } from "@/lib/server/agency-secrets"
import { brandedEmail, escapeHtml, normalizeEmailAddress, SITE_ORIGIN } from "@/lib/server/email-branding"
import { ensureVisitorBilling } from "@/lib/server/paystack"
import { RESERVED_SLUGS, slugify } from "@/lib/slugs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Self sign-up for Visitor Sign-in, from the demo page. The signed-in person
 * becomes a client of VisualCNS with their own company, the front desk is
 * switched on and the free trial starts. Returns the company slug so the
 * browser can open /{slug}?tab=visitors.
 *
 * Someone whose account already belongs to a company is sent to it instead.
 * A company name that's already taken is refused: typing a name must never
 * let a stranger into another company's data.
 */

const SOURCE = "Visitor sign-up"

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status })
}

function nameKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

async function uniqueSlug(db: FirebaseFirestore.Firestore, name: string, orgId: string) {
  const base = slugify(name) || "company"
  let candidate = RESERVED_SLUGS.has(base) ? `${base}-1` : base
  for (let attempt = 2; attempt < 50; attempt += 1) {
    const taken = await db.collection("organizations").where("slug", "==", candidate).limit(1).get()
    if (taken.empty) return candidate
    candidate = `${base}-${attempt}`
  }
  return `${base}-${orgId.slice(0, 6).toLowerCase()}`
}

function signupNotice(company: { name: string; slug: string }, person: { name: string; email: string }) {
  const subject = `New Visitor Sign-in sign-up: ${company.name}`
  const text = `${person.name || person.email} (${person.email}) just signed up ${company.name} for Visitor Sign-in. Their front desk is on and the free trial has started.\n\nIt's tagged "${SOURCE}" on the company page. If it looks like junk, delete the company.`
  const url = `${SITE_ORIGIN}/${encodeURIComponent(company.slug)}?tab=visitors`
  return { subject, text, url }
}

/** Emails the agency's admins about the new sign-up. Never blocks the sign-up itself. */
async function notifyAdmins(db: FirebaseFirestore.Firestore, agencyId: string, company: { name: string; slug: string }, person: { name: string; email: string }) {
  const apiKey = await getAgencySecret(agencyId, "RESEND_API_KEY", process.env.RESEND_API_KEY || "")
  const from = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_FROM", process.env.EMAIL_FROM || ""))
  if (!apiKey || !from) return
  const admins = await db.collection("users").where("agencyId", "==", agencyId).where("role", "==", "admin").limit(20).get()
  const to = [...new Set(admins.docs.map((item) => String(item.data().email || "").trim().toLowerCase()).filter(Boolean))]
  if (!to.length) return

  const { subject, text, url } = signupNotice(company, person)
  const html = brandedEmail(`<p>${escapeHtml(text).replace(/\n\n/g, "</p><p>")}</p>`, subject, { name: "VisualCNS" }, from, { text: "Open the company", url })
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text: `${text}\n\nOpen the company: ${url}`, html }),
    cache: "no-store",
  })
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return json({ error: "Please sign in again." }, 401)

  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) return json({ error: "Please sign in again." }, 401)

  const body = (await request.json().catch(() => ({}))) as { companyName?: unknown }
  const companyName = typeof body.companyName === "string" ? body.companyName.replace(/\s+/g, " ").trim().slice(0, 120) : ""
  const agencyId = getSiteAgencyId()
  const userRef = db.collection("users").doc(decoded.uid)
  const existing = (await userRef.get()).data() ?? {}

  // Already a member of a company: just send them there.
  if (existing.agencyId && existing.companyId && existing.role === "client") {
    const org = (await db.collection("organizations").doc(String(existing.companyId)).get()).data()
    return json({ slug: org?.slug || existing.companyId, existing: true })
  }
  if (existing.agencyId || existing.role) {
    return json({ error: "This account already belongs to another organization. Sign in with a different email." }, 409)
  }
  if (!companyName) return json({ error: "Enter your company name." }, 400)

  const sameAgency = await db.collection("organizations").where("agencyId", "==", agencyId).get()
  if (sameAgency.docs.some((item) => nameKey(String(item.data().name || "")) === nameKey(companyName))) {
    return json({ error: `${companyName} already has an account. Ask your admin to invite you.` }, 409)
  }

  const orgRef = db.collection("organizations").doc()
  const slug = await uniqueSlug(db, companyName, orgRef.id)
  const now = Timestamp.now()
  const email = String(decoded.email || existing.email || "")
  const personName = String(decoded.name || existing.displayName || "")

  const batch = db.batch()
  batch.set(orgRef, {
    name: companyName,
    agencyId,
    slug,
    // Same default as companies made in the dashboard; clients can only open a public page.
    publicVisible: true,
    email,
    source: SOURCE,
    tags: [SOURCE],
    primaryContactId: decoded.uid,
    createdAt: now,
    updatedAt: now,
  })
  batch.set(userRef, {
    email,
    displayName: personName,
    role: "client",
    agencyId,
    companyId: orgRef.id,
    company: companyName,
    onboardingStatus: "active",
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.createdAt ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true })
  const notice = signupNotice({ name: companyName, slug }, { name: personName, email })
  batch.set(db.collection("agencies").doc(agencyId).collection("emailInboxEvents").doc(`visitor_${orgRef.id}`), {
    agencyId,
    companyId: orgRef.id,
    kind: "visitor-signup",
    from: email,
    to: ["VisualCNS team"],
    subject: notice.subject,
    text: `${notice.text}\n\nOpen the company: ${notice.url}`,
    createdAt: now,
  })
  // Front desk on from the start, so the sign-in link is ready when they land.
  batch.set(db.collection("visitorKiosks").doc(orgRef.id), {
    agencyId,
    companyId: orgRef.id,
    enabled: true,
    key: randomBytes(18).toString("hex"),
    updatedAt: now,
  })
  await batch.commit()
  await ensureVisitorBilling(db, agencyId, orgRef.id)

  await notifyAdmins(db, agencyId, { name: companyName, slug }, { name: personName, email }).catch(() => undefined)
  return json({ slug })
}
