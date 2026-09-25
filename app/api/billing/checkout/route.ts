import { requireAgencyId } from "@/lib/require-agency-id"
import { NextRequest, NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Missing authorization")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token)
  const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
  if (user.role !== "admin" && user.role !== "superadmin") throw new Error("Admin access required")
  return { db, email: decoded.email || "", agencyId: requireAgencyId(user) }
}

export async function POST(request: NextRequest) {
  try {
    const { db, email, agencyId } = await authorize(request)
    const secret = process.env.STRIPE_SECRET_KEY
    const price = process.env.STRIPE_PRICE_ID
    if (!secret || !price) return NextResponse.json({ error: "Agency billing is not configured yet." }, { status: 503 })
    const agency = (await db.collection("agencies").doc(agencyId).get()).data() || {}
    const users = await db.collection("users").where("agencyId", "==", agencyId).where("role", "==", "admin").get()
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3069"
    const form = new URLSearchParams({ mode: "subscription", success_url: `${origin}/dashboard/account/billing?success=1`, cancel_url: `${origin}/dashboard/account/billing?cancelled=1`, "line_items[0][price]": price, "line_items[0][quantity]": String(Math.max(1, users.size)), customer_email: email, "subscription_data[metadata][agencyId]": agencyId, "metadata[agencyId]": agencyId })
    if (typeof agency.stripeCustomerId === "string" && agency.stripeCustomerId) form.set("customer", agency.stripeCustomerId)
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form })
    const data = await response.json() as { url?: string; error?: { message?: string } }
    if (!response.ok || !data.url) return NextResponse.json({ error: data.error?.message || "Checkout could not be created." }, { status: 502 })
    return NextResponse.json({ url: data.url })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout failed" }, { status: 403 }) }
}
