import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { cartServices, cartTotal, servicePrice } from "@/lib/cart"
import { paystack, PaystackError } from "@/lib/server/paystack"
import { applyOrderCharge, ORDER_KIND } from "@/lib/server/orders"
import { DiscountError, discountFor } from "@/lib/server/discounts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * The services checkout, on the site and on company pages. Signed in or not:
 * a guest gives an email instead. Actions:
 * - discount: checks a discount code against the cart and says how much it takes off
 * - pay: saves the cart as an order and returns a Paystack checkout link for its total, less any code
 * - verify: after Paystack sends the payer back, confirms the payment
 * Prices come from lib/cart, never from the request.
 */

class Refused extends Error {}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CHANNELS = new Set(["card", "bank_transfer", "ussd"])

/** The billing details the payer typed, trimmed and capped; empty strings for anything missing. */
function billingDetails(value: unknown) {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const text = (key: string, max = 200) => (typeof raw[key] === "string" ? (raw[key] as string).trim().slice(0, max) : "")
  return { name: text("name"), email: text("email"), phone: text("phone", 40), company: text("company"), country: text("country", 80), address: text("address", 400) }
}

/** The signed-in buyer, or a guest (no uid) when no token is sent. */
async function buyer(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const { auth, db } = adminServices()
  if (!token) return { db, uid: "", user: {} as Record<string, unknown>, email: "" }
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) throw new Refused("Please sign in again.")
  const user = (await db.collection("users").doc(decoded.uid).get()).data() ?? {}
  return { db, uid: decoded.uid, user, email: String(decoded.email || user.email || "") }
}

function siteOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { action?: string; items?: unknown; reference?: string; note?: string; returnTo?: string; email?: string; currency?: string; details?: Record<string, unknown>; channel?: string; code?: string }

  try {
    const { db, uid, user, email: accountEmail } = await buyer(request)

    if (body.action === "discount") {
      const services = cartServices(body.items)
      if (services.length === 0) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 })
      const currency = body.currency === "USD" ? "USD" : "NGN"
      const discount = await discountFor(db, body.code, cartTotal(services, currency), currency)
      return NextResponse.json(discount)
    }

    if (body.action === "pay") {
      const guestEmail = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : ""
      const billing = billingDetails(body.details)
      const email = EMAIL_PATTERN.test(billing.email) ? billing.email : accountEmail || (EMAIL_PATTERN.test(guestEmail) ? guestEmail : "")
      if (!email) return NextResponse.json({ error: "Enter your email address to pay." }, { status: 400 })
      if (!billing.name) return NextResponse.json({ error: "Add your name." }, { status: 400 })
      // Paystack offers every payment method on its own page unless one was picked.
      const channel = typeof body.channel === "string" && CHANNELS.has(body.channel) ? body.channel : ""
      const services = cartServices(body.items)
      if (services.length === 0) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 })
      // Naira, or dollars at the rate card's own conversion; Paystack charges in either.
      const currency = body.currency === "USD" ? "USD" : "NGN"
      const subtotal = cartTotal(services, currency)
      const discount = body.code ? await discountFor(db, body.code, subtotal, currency) : null
      const total = subtotal - (discount?.amount ?? 0)
      // Back to the checkout they paid from: the site's or a company page's.
      const returnTo = typeof body.returnTo === "string" && /^(?:\/[A-Za-z0-9%._~-]+)?\/checkout$/.test(body.returnTo) ? body.returnTo : "/checkout"
      const ref = db.collection("orders").doc()
      const reference = `vcns_${ref.id}`
      await ref.set({
        uid,
        email,
        agencyId: String(user.agencyId || ""),
        companyId: String(user.companyId || ""),
        items: services.map((service) => ({ id: service.id, name: service.name, amount: servicePrice(service, currency) })),
        subtotal,
        discount,
        total,
        currency,
        billing,
        channel,
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
          amount: Math.round(total * 100),
          currency,
          ...(channel ? { channels: [channel] } : {}),
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
      // Guest orders have no uid; their reference only reaches the payer, through Paystack's redirect.
      if (!order || (order.uid && order.uid !== uid)) return NextResponse.json({ error: charge.status === "success" ? "We couldn't match that payment to your order." : "The payment didn't go through." }, { status: 400 })
      return NextResponse.json({ ok: true, items: order.items, discount: order.discount ?? null, total: order.total, currency: order.currency || "NGN" })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    if (error instanceof DiscountError) return NextResponse.json({ error: error.message }, { status: 400 })
    if (error instanceof Refused) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof PaystackError) return NextResponse.json({ error: error.message }, { status: 502 })
    console.error("Checkout failed", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
