import { NextResponse, type NextRequest } from "next/server"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { getSiteAgencyId } from "@/lib/require-agency-id"
import { getAgencySecret } from "@/lib/server/agency-secrets"
import { brandedEmail, escapeHtml, normalizeEmailAddress, SITE_ORIGIN } from "@/lib/server/email-branding"
import { sendMetaLead } from "@/lib/server/meta-conversions"
import { RESERVED_SLUGS, slugify } from "@/lib/slugs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Self sign-up to the app. A new account becomes a VisualCNS client;
 * an existing VisualCNS admin can also create a company while keeping their
 * current role. Returns the company slug so the browser can open /{slug}.
 *
 * Someone whose account already belongs to a company is sent to it instead.
 * A company name that's already taken is refused: typing a name must never
 * let a stranger into another company's data.
 */

const SOURCE = "App sign-up"
const INBOX_EMAIL = "info@visualcns.com"
const NOTICE_EMAILS = [INBOX_EMAIL, "hello@mail.visualcns.com"]

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
  const subject = `New sign-up: ${company.name}`
  const text = `${person.name || person.email} (${person.email}) just signed up ${company.name} to VisualCNS.\n\nIt's tagged "${SOURCE}" on the company page. If it looks like junk, delete the company.`
  const url = `${SITE_ORIGIN}/${encodeURIComponent(company.slug)}`
  return { subject, text, url }
}

/** Emails the agency's admins about the new sign-up. Never blocks the sign-up itself. */
async function notifyAdmins(db: FirebaseFirestore.Firestore, agencyId: string, company: { name: string; slug: string }, person: { name: string; email: string }) {
  const apiKey = await getAgencySecret(agencyId, "RESEND_API_KEY", process.env.RESEND_API_KEY || "")
  const from = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_FROM", process.env.EMAIL_FROM || `VisualCNS <${INBOX_EMAIL}>`))
  if (!apiKey || !from) return
  const [admins, superadmins] = await Promise.all([
    db.collection("users").where("agencyId", "==", agencyId).where("role", "==", "admin").limit(20).get(),
    db.collection("users").where("agencyId", "==", agencyId).where("role", "==", "superadmin").limit(20).get(),
  ])
  const to = [...new Set([
    ...NOTICE_EMAILS,
    ...admins.docs.map((item) => String(item.data().email || "").trim().toLowerCase()),
    ...superadmins.docs.map((item) => String(item.data().email || "").trim().toLowerCase()),
  ].filter(Boolean))]

  const { subject, text, url } = signupNotice(company, person)
  const html = brandedEmail(`<p>${escapeHtml(text).replace(/\n\n/g, "</p><p>")}</p>`, subject, { name: "VisualCNS" }, from, { text: "Open the company", url })
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `signup-notice-${company.slug}`,
    },
    body: JSON.stringify({ from, to, subject, text: `${text}\n\nOpen the company: ${url}`, html }),
    cache: "no-store",
  })
  if (!response.ok) throw new Error("Signup notification was not accepted")
}

/** Sends the new user a confirmation without blocking account creation. */
async function sendWelcomeEmail(agencyId: string, company: { name: string; slug: string }, person: { name: string; email: string }) {
  const apiKey = await getAgencySecret(agencyId, "RESEND_API_KEY", process.env.RESEND_API_KEY || "")
  const from = normalizeEmailAddress(await getAgencySecret(agencyId, "EMAIL_FROM", process.env.EMAIL_FROM || `VisualCNS <${INBOX_EMAIL}>`))
  if (!apiKey || !from || !person.email) return false

  const subject = `Welcome to VisualCNS, ${company.name}`
  const url = `${SITE_ORIGIN}/${encodeURIComponent(company.slug)}`
  const text = `Hi ${person.name || "there"},\n\nYour ${company.name} account is ready. Open your company page to get started.\n\nYour company page: ${url}`
  const html = brandedEmail(`<p>${escapeHtml(text).replace(/\n\n/g, "</p><p>")}</p>`, subject, { name: "VisualCNS", email: from }, from, { text: "Open your company page", url })
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `signup-welcome-${company.slug}`,
    },
    body: JSON.stringify({ from, to: [person.email], subject, text: `${text}\n\nOpen your company page: ${url}`, html }),
    cache: "no-store",
  })
  return response.ok
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return json({ error: "Please sign in again." }, 401)

  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) return json({ error: "Please sign in again." }, 401)

  const body = (await request.json().catch(() => ({}))) as {
    companyName?: unknown
    website?: unknown
    location?: unknown
    address?: unknown
    phone?: unknown
  }
  const companyName = typeof body.companyName === "string" ? body.companyName.replace(/\s+/g, " ").trim().slice(0, 120) : ""
  const companyDetails = {
    website: typeof body.website === "string" ? body.website.trim().slice(0, 500) : "",
    location: typeof body.location === "string" ? body.location.trim().slice(0, 160) : "",
    address: typeof body.address === "string" ? body.address.trim().slice(0, 1000) : "",
    phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 80) : "",
  }
  const agencyId = getSiteAgencyId()
  const userRef = db.collection("users").doc(decoded.uid)
  const existing = (await userRef.get()).data() ?? {}
  const existingRole = String(existing.role || "")
  const isSiteAgencyAdmin = existing.agencyId === agencyId && ["admin", "superadmin"].includes(existingRole)

  // Already a member of a company: just send them there.
  if (existing.agencyId && existing.companyId && existing.role === "client") {
    const org = (await db.collection("organizations").doc(String(existing.companyId)).get()).data()
    return json({ slug: org?.slug || existing.companyId, existing: true })
  }
  if ((existing.agencyId || existing.role) && !isSiteAgencyAdmin) {
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
    ...companyDetails,
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
  if (!isSiteAgencyAdmin) {
    batch.set(userRef, {
      email,
      displayName: personName,
      role: "client",
      agencyId,
      companyId: orgRef.id,
      company: companyName,
      onboardingStatus: "active",
      welcomeEmailPending: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.createdAt ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true })
  }
  const notice = signupNotice({ name: companyName, slug }, { name: personName, email })
  batch.set(db.collection("agencies").doc(agencyId).collection("emailInboxEvents").doc(`signup_${orgRef.id}`), {
    agencyId,
    companyId: orgRef.id,
    kind: "app-signup",
    from: email,
    to: NOTICE_EMAILS,
    subject: notice.subject,
    text: `${notice.text}\n\nOpen the company: ${notice.url}`,
    createdAt: now,
  })
  await batch.commit()

  const company = { name: companyName, slug }
  const person = { name: personName, email }
  const [adminEmailResult, welcomeEmailResult] = await Promise.allSettled([
    notifyAdmins(db, agencyId, company, person),
    sendWelcomeEmail(agencyId, company, person),
  ])
  if (welcomeEmailResult.status === "fulfilled" && welcomeEmailResult.value) {
    await userRef.set({ welcomeEmailPending: false, welcomeEmailSentAt: new Date().toISOString() }, { merge: true }).catch(() => undefined)
  }
  if (adminEmailResult.status === "rejected") console.error("Signup notification failed:", adminEmailResult.reason)

  // A new company is a lead. The browser pixel sends the same event id, so Meta counts it once.
  const leadEventId = `lead_${orgRef.id}`
  await sendMetaLead(request, agencyId, {
    eventId: leadEventId,
    uid: decoded.uid,
    email,
    name: personName,
    sourceUrl: request.headers.get("referer") || `${SITE_ORIGIN}/onboarding`,
  }).catch((error) => console.error("Meta Lead failed:", error))
  return json({ slug, leadEventId })
}
