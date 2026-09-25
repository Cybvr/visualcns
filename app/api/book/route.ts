import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WORK_TYPES = ["Design", "Strategy", "Marketing", "Animation"]
const TENANT_ID = "legacy-visualcns"
const OWNER_EMAIL = process.env.BOOKING_OWNER_EMAIL || "jide.pinheiro@gmail.com"
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.visualcns.com"
const WELCOME_TEMPLATE_ID = "welcome-client-portal"

const FALLBACK_WELCOME = {
  subject: "Welcome to VisualCNS",
  body:
    "<p>Hi [Customer Name],</p>" +
    "<p>Thanks for reaching out — we've got your request and someone from our team will be in touch shortly to talk through your project.</p>" +
    "<p>In the meantime, you're welcome to explore your company page.</p>" +
    `<p><a href="${SITE_ORIGIN}/" style="display:inline-block;background:#0E32FC;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">Open company page</a></p>` +
    "<p>Best regards,<br />The VisualCNS team</p>",
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string)
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""
}

export async function POST(request: Request) {
  let payload: {
    name?: unknown
    email?: unknown
    company?: unknown
    workTypes?: unknown
    currency?: unknown
    budget?: unknown
    message?: unknown
  }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return NextResponse.json({ error: "The request could not be read." }, { status: 400 })
  }

  const name = clean(payload.name, 120)
  const email = clean(payload.email, 200)
  const company = clean(payload.company, 160)
  const currency = payload.currency === "NGN" ? "NGN" : "USD"
  const budget = clean(payload.budget, 60)
  const message = clean(payload.message, 2000)
  const workTypes = Array.isArray(payload.workTypes)
    ? Array.from(new Set(payload.workTypes.map((value) => clean(value, 40)))).filter((value) =>
        WORK_TYPES.includes(value),
      )
    : []

  if (!name) {
    return NextResponse.json({ error: "Add your name." }, { status: 400 })
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Add a valid email address." }, { status: 400 })
  }

  const booking = {
    name,
    email,
    company,
    workTypes,
    currency,
    budget,
    message,
    status: "new",
    source: "book-now-modal",
    createdAt: FieldValue.serverTimestamp(),
  }

  // Save the lead to Firestore first so nothing is lost even if email is down.
  const { db } = adminServices()
  try {
    await db.collection("bookings").add(booking)
  } catch {
    return NextResponse.json({ error: "Could not save your request. Try again." }, { status: 503 })
  }

  // Add the lead to the users collection so it shows up as a contact the
  // agency can email. Merge onto an existing record so a real client's role is
  // never downgraded; only create a fresh "client" contact when none exists.
  try {
    const existing = await db
      .collection("users")
      .where("tenantId", "==", TENANT_ID)
      .where("email", "==", email)
      .limit(1)
      .get()
    if (existing.empty) {
      const ref = db.collection("users").doc()
      await ref.set({
        email,
        displayName: name,
        company,
        role: "client",
        tenantId: TENANT_ID,
        companyId: ref.id,
        source: "booking",
        lastBookingAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      })
    } else {
      await existing.docs[0].ref.set(
        { source: "booking", lastBookingAt: FieldValue.serverTimestamp() },
        { merge: true },
      )
    }
  } catch {
    // The booking is saved; failing to sync the contact must not fail the request.
  }

  // Notify the agency by email when Resend is configured.
  const apiKey = process.env.RESEND_API_KEY
  const from = clean(process.env.EMAIL_FROM, 200)
  const to = clean(process.env.BOOKING_NOTIFY_EMAIL, 200) || clean(process.env.EMAIL_REPLY_TO, 200) || from
  const replyTo = clean(process.env.EMAIL_REPLY_TO, 200) || from

  // Send the lead a welcome email using the seeded transactional template,
  // falling back to a built-in message if the template is not in the DB yet.
  if (apiKey && from) {
    try {
      let welcome = FALLBACK_WELCOME
      const owner = await db
        .collection("users")
        .where("tenantId", "==", TENANT_ID)
        .where("email", "==", OWNER_EMAIL)
        .limit(1)
        .get()
      const companyId = owner.empty ? "" : String(owner.docs[0].data().companyId || owner.docs[0].id)
      if (companyId) {
        const templateSnap = await db.collection("emailTemplates").doc(`${companyId}__${WELCOME_TEMPLATE_ID}`).get()
        const data = templateSnap.data()
        if (templateSnap.exists && data?.tenantId === TENANT_ID && data.subject && data.body) {
          welcome = { subject: String(data.subject), body: String(data.body) }
        }
      }
      const subject = welcome.subject.replaceAll("[Customer Name]", name)
      const body = welcome.body.replaceAll("[Customer Name]", name)
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          from,
          to: email,
          subject,
          html: body,
          reply_to: replyTo,
        }),
        cache: "no-store",
      })
    } catch {
      // The booking is saved; a failed welcome email must not fail the request.
    }
  }

  if (apiKey && from && to) {
    const rows = [
      ["Name", name],
      ["Email", email],
      ["Company", company || "—"],
      ["Needs", workTypes.length ? workTypes.join(", ") : "—"],
      ["Budget", budget ? `${budget} (${currency})` : "—"],
      ["Message", message || "—"],
    ]
    const html = `<h2>New booking request</h2><table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${rows
      .map(
        ([label, value]) =>
          `<tr><td style="font-weight:700;vertical-align:top;">${escapeHtml(label)}</td><td>${escapeHtml(
            value,
          )}</td></tr>`,
      )
      .join("")}</table>`
    const text = `New booking request\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}`
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          from,
          to,
          subject: `New booking request from ${name}`,
          html,
          text,
          reply_to: email,
        }),
        cache: "no-store",
      })
    } catch {
      // The lead is already saved; a failed notification does not fail the request.
    }
  }

  return NextResponse.json({ ok: true })
}
