import { NextRequest, NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) throw new Error("Missing authorization")
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(token)
    const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
    if (user.role !== "admin" && user.role !== "superadmin") throw new Error("Admin access required")
    const tenantId = typeof user.tenantId === "string" && user.tenantId ? user.tenantId : "legacy-visualcns"
    const customer = (await db.collection("tenants").doc(tenantId).get()).data()?.stripeCustomerId
    if (!customer || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "No billing account is connected yet." }, { status: 400 })
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3069"
    const form = new URLSearchParams({ customer: String(customer), return_url: `${origin}/dashboard/account/billing` })
    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", { method: "POST", headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form })
    const data = await response.json() as { url?: string; error?: { message?: string } }
    if (!response.ok || !data.url) return NextResponse.json({ error: data.error?.message || "Billing portal could not be created." }, { status: 502 })
    return NextResponse.json({ url: data.url })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Billing portal failed" }, { status: 403 }) }
}
