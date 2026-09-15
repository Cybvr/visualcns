import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WORK_TYPES = ["Design", "Strategy", "Marketing", "Animation"]

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
  try {
    const { db } = adminServices()
    await db.collection("bookings").add(booking)
  } catch {
    return NextResponse.json({ error: "Could not save your request. Try again." }, { status: 503 })
  }

  // Notify the agency by email when Resend is configured.
  const apiKey = process.env.RESEND_API_KEY
  const from = clean(process.env.EMAIL_FROM, 200)
  const to = clean(process.env.BOOKING_NOTIFY_EMAIL, 200) || clean(process.env.EMAIL_REPLY_TO, 200) || from
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
