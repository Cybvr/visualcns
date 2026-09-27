import { timingSafeEqual } from "node:crypto"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { getAgencySecret } from "@/lib/server/agency-secrets"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * The front-desk tablet. It has no login, so every call carries the company's
 * slug and kiosk key, and the key is checked here before anything is read or
 * written. Visitors are only ever created through this route.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } })
}

function sameKey(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""
}

/** "Ada Obi" becomes "Ada O." so the sign-out list doesn't show full names to the room. */
function shortName(name: string) {
  const [first, ...rest] = name.split(" ").filter(Boolean)
  const last = rest.at(-1)
  return last ? `${first} ${last[0].toUpperCase()}.` : first || "Visitor"
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string)
}

async function resolveKiosk(slug: string, key: string) {
  if (!slug || !key) return null
  const { db } = adminServices()
  const orgs = await db.collection("organizations").where("slug", "==", slug).limit(10).get()
  // A company without a slug is linked by its id instead.
  const byId = orgs.empty ? await db.collection("organizations").doc(slug).get() : null
  const candidates = byId?.exists ? [byId] : orgs.docs
  for (const org of candidates) {
    const kiosk = (await db.collection("visitorKiosks").doc(org.id).get()).data()
    if (kiosk?.enabled && typeof kiosk.key === "string" && sameKey(kiosk.key, key)) {
      const data = org.data() ?? {}
      return { db, orgId: org.id, org: data, agencyId: String(kiosk.agencyId || data.agencyId || "") }
    }
  }
  return null
}

async function hostsFor(db: ReturnType<typeof adminServices>["db"], agencyId: string, companyId: string) {
  const people = await db.collection("users").where("agencyId", "==", agencyId).where("companyId", "==", companyId).limit(200).get()
  return people.docs
    .map((person) => ({ id: person.id, name: String(person.data().displayName || person.data().name || "").trim(), email: String(person.data().email || "") }))
    .filter((person) => person.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function onSite(db: ReturnType<typeof adminServices>["db"], agencyId: string, companyId: string) {
  const rows = await db.collection("visitors")
    .where("agencyId", "==", agencyId)
    .where("companyId", "==", companyId)
    .where("status", "==", "on_site")
    .limit(100)
    .get()
  return rows.docs
    .map((row) => ({ id: row.id, name: shortName(String(row.data().name || "")), at: row.data().signedInAt?.toMillis?.() ?? 0 }))
    .sort((a, b) => b.at - a.at)
}

async function emailHost(agencyId: string, to: string, companyName: string, visitor: { name: string; visitorCompany: string; reason: string; phone: string; email: string }) {
  const apiKey = await getAgencySecret(agencyId, "RESEND_API_KEY", process.env.RESEND_API_KEY || "")
  const from = (await getAgencySecret(agencyId, "EMAIL_FROM", process.env.EMAIL_FROM || "")).trim().replace(/^(["'])(.*)\1$/, "$2")
  if (!apiKey || !from || !EMAIL_PATTERN.test(to)) return false
  const details = [visitor.visitorCompany && `From: ${visitor.visitorCompany}`, visitor.reason && `Reason: ${visitor.reason}`, visitor.phone && `Phone: ${visitor.phone}`, visitor.email && `Email: ${visitor.email}`].filter(Boolean)
  const subject = `${visitor.name} is here to see you`
  const body = `${visitor.name} just signed in at the ${companyName} front desk.${details.length ? `\n\n${details.join("\n")}` : ""}`
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: body,
      html: `<p>${escapeHtml(body).replace(/\n/g, "<br />")}</p>`,
    }),
    cache: "no-store",
  }).catch(() => null)
  return Boolean(response?.ok)
}

/** What the tablet needs to show: the company, who can be visited, and who is signed in now. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const kiosk = await resolveKiosk(params.get("slug") || "", params.get("key") || "")
  if (!kiosk) return json({ error: "This sign-in link isn't active. Ask the office for a new one." }, 404)
  const [hosts, visitors] = await Promise.all([hostsFor(kiosk.db, kiosk.agencyId, kiosk.orgId), onSite(kiosk.db, kiosk.agencyId, kiosk.orgId)])
  return json({
    company: { name: kiosk.org.name || "", logoUrl: kiosk.org.logoUrl || "" },
    hosts: hosts.map(({ id, name }) => ({ id, name })),
    onSite: visitors.map(({ id, name }) => ({ id, name })),
  })
}

type Body = {
  slug?: string
  key?: string
  action?: string
  name?: string
  visitorCompany?: string
  email?: string
  phone?: string
  hostId?: string
  hostName?: string
  reason?: string
  visitorId?: string
}

export async function POST(request: Request) {
  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    return json({ error: "Invalid request." }, 400)
  }
  const kiosk = await resolveKiosk(text(body.slug, 200), text(body.key, 200))
  if (!kiosk) return json({ error: "This sign-in link isn't active. Ask the office for a new one." }, 404)
  const { db, orgId, org, agencyId } = kiosk

  if (body.action === "sign_in") {
    const name = text(body.name, 80)
    if (name.length < 2) return json({ error: "Please enter your name." }, 400)
    const email = text(body.email, 120)
    if (email && !EMAIL_PATTERN.test(email)) return json({ error: "That email doesn't look right." }, 400)
    const phone = text(body.phone, 40)
    const reason = text(body.reason, 160)
    const visitorCompany = text(body.visitorCompany, 120)

    const hosts = await hostsFor(db, agencyId, orgId)
    const host = hosts.find((person) => person.id === body.hostId)
    const hostName = host?.name || text(body.hostName, 80)

    const ref = db.collection("visitors").doc()
    await ref.set({
      agencyId,
      companyId: orgId,
      companyName: String(org.name || ""),
      name,
      visitorCompany,
      email,
      phone,
      reason,
      hostName,
      hostUid: host?.id || "",
      status: "on_site",
      signedInAt: FieldValue.serverTimestamp(),
      signedOutAt: null,
      hostNotified: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    let hostNotified = false
    if (host?.email) {
      hostNotified = await emailHost(agencyId, host.email, String(org.name || "your"), { name, visitorCompany, reason, phone, email })
      if (hostNotified) await ref.set({ hostNotified: true }, { merge: true })
    }

    return json({
      id: ref.id,
      badge: { name, hostName, company: String(org.name || ""), logoUrl: String(org.logoUrl || ""), signedInAt: Date.now() },
      hostNotified,
    })
  }

  if (body.action === "sign_out") {
    const id = text(body.visitorId, 80)
    if (!id) return json({ error: "Pick your name first." }, 400)
    const ref = db.collection("visitors").doc(id)
    const visitor = (await ref.get()).data()
    if (!visitor || visitor.companyId !== orgId) return json({ error: "We couldn't find that visit." }, 404)
    if (visitor.status !== "on_site") return json({ ok: true })
    await ref.set({ status: "signed_out", signedOutAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return json({ ok: true, name: shortName(String(visitor.name || "")) })
  }

  return json({ error: "Unknown action." }, 400)
}
