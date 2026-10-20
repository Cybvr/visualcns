import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { cartServices, cartTotal } from "@/lib/cart"
import { paystack, PaystackError } from "@/lib/server/paystack"
import { applyOrderCharge, ORDER_KIND } from "@/lib/server/orders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * The dashboard checkout. Actions:
 * - pay: saves the cart as an order and returns a Paystack checkout link for its total
 * - verify: after Paystack sends the payer back, confirms the payment
 * Prices come from lib/cart, never from the request.
 */

class Refused extends Error {}

async function signedIn(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Refused("Please sign in again.")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) throw new Refused("Please sign in again.")
  const user = (await db.collection("users").doc(decoded.uid).get()).data() ?? {}
  return { db, uid: decoded.uid, user, email: String(decoded.email || user.email || "") }
}

function siteOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { action?: string; items?: unknown; reference?: string; note?: string; returnTo?: string }

  try {
    const { db, uid, user, email } = await signedIn(request)

    if (body.action === "pay") {
      if (!email) return NextResponse.json({ error: "Your account needs an email address to pay." }, { status: 400 })
      const services = cartServices(body.items)
      if (services.length === 0) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 })
      const total = cartTotal(services)
      // Back to the checkout they paid from: the dashboard's or a company page's.
      const returnTo = typeof body.returnTo === "string" && /^\/[A-Za-z0-9%._~-]+\/checkout$/.test(body.returnTo) ? body.returnTo : "/dashboard/checkout"
      const ref = db.collection("orders").doc()
      const reference = `vcns_${ref.id}`
      await ref.set({
        uid,
        email,
        agencyId: String(user.agencyId || ""),
        companyId: String(user.companyId || ""),
        items: services.map((service) => ({ id: service.id, name: service.name, amount: service.price.amount })),
        total,
        currency: "NGN",
        note: typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "",
        status: "pending",
        reference,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      const checkout = await paystack<{ authorization_url: string }>("/transaction/initialize", {
        method: "POST",
        body: {
          email,
          amount: total * 100,
          currency: "NGN",
          reference,
          callback_url: `${siteOrigin(request)}${returnTo}`,
          metadata: {
            kind: ORDER_KIND,
            orderId: ref.id,
            uid,
            custom_fields: [{ display_name: "Services", variable_name: "services", value: services.map((service) => service.name).join(", ") }],
          },
        },
      })
      return NextResponse.json({ url: checkout.authorization_url })
    }

    if (body.action === "verify") {
      const reference = typeof body.reference === "string" ? body.reference.trim() : ""
      if (!/^[A-Za-z0-9._=-]{4,100}$/.test(reference)) return NextResponse.json({ error: "Missing payment reference." }, { status: 400 })
      const charge = await paystack<Parameters<typeof applyOrderCharge>[1]>(`/transaction/verify/${encodeURIComponent(reference)}`)
      const orderId = await applyOrderCharge(db, charge)
      const order = orderId ? (await db.collection("orders").doc(orderId).get()).data() : null
      if (!order || order.uid !== uid) return NextResponse.json({ error: charge.status === "success" ? "We couldn't match that payment to your order." : "The payment didn't go through." }, { status: 400 })
      return NextResponse.json({ ok: true, items: order.items, total: order.total })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    if (error instanceof Refused) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof PaystackError) return NextResponse.json({ error: error.message }, { status: 502 })
    console.error("Checkout failed", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
