import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { cartService } from "@/lib/cart"
import { adminServices } from "@/lib/firebase-admin"
import { grantGrowthAccess, notifyPaidOrder } from "@/lib/server/orders"
import { validPolarSignature } from "@/lib/server/polar"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Polar events for dollar payments. In Polar (Settings, Webhooks) add
 * https://<your site>/api/billing/polar/webhook, format Raw, with at least
 * order.paid, subscription.canceled, subscription.uncanceled and
 * subscription.revoked, and put its secret in POLAR_WEBHOOK_SECRET.
 */

type Event = { type?: string; data?: Record<string, any> }

export async function POST(request: Request) {
  const raw = await request.text()
  if (!validPolarSignature(raw, request.headers)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  let event: Event
  try {
    event = JSON.parse(raw) as Event
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const data = event.data ?? {}
  const meta = (data.metadata && typeof data.metadata === "object" ? data.metadata : {}) as Record<string, unknown>
  const { db } = adminServices()

  // Polar retries until it hears back; handle each delivery once.
  const delivery = request.headers.get("webhook-id") || ""
  const deliveryRef = delivery ? db.collection("polarWebhookDeliveries").doc(delivery) : null
  if (deliveryRef && (await deliveryRef.get()).exists) return NextResponse.json({ received: true })

  try {
    switch (event.type) {
      case "order.paid": {
        const serviceId = String(meta.service_id || "")
        const service = cartService(serviceId)
        const companyId = String(meta.companyId || "")
        const order = {
          provider: "polar",
          reference: String(data.id || ""),
          uid: String(meta.uid || ""),
          email: String(data.customer?.email || ""),
          agencyId: String(meta.agencyId || ""),
          companyId,
          items: [{ id: serviceId, name: service?.name || data.product?.name || "Polar order", amount: Number(data.total_amount || 0) / 100 }],
          total: Number(data.total_amount || 0) / 100,
          currency: String(data.currency || "usd").toUpperCase(),
          billingReason: String(data.billing_reason || ""),
          status: "paid",
          paidAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        }
        const orderId = `polar_${data.id}`
        const created = await db.collection("orders").doc(orderId).create(order).then(() => true, () => false)
        if (!created) break
        // A first payment or a renewal: either way the plan runs another month or year.
        const growth = await grantGrowthAccess(db, order)
        if (growth) {
          await db.collection("visitorBilling").doc(growth.companyId).set({
            polarCustomerId: String(data.customer_id || data.customer?.id || ""),
            polarSubscriptionId: String(data.subscription_id || ""),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true })
        }
        if (order.billingReason !== "subscription_cycle") await notifyPaidOrder(orderId, order).catch((error) => console.error("Paid order email failed", error))
        break
      }
      case "subscription.canceled":
      case "subscription.uncanceled":
      case "subscription.revoked": {
        const companyId = String(meta.companyId || "")
        if (!companyId) break
        const ref = db.collection("visitorBilling").doc(companyId)
        const billing = (await ref.get()).data()
        if (!billing || billing.polarSubscriptionId !== String(data.id || "")) break
        // Time already paid for still counts; the plan stops after it (plus the grace days).
        await ref.set({ status: event.type === "subscription.uncanceled" ? "active" : "cancelled", updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        break
      }
    }
    if (deliveryRef) await deliveryRef.set({ type: event.type || "", at: FieldValue.serverTimestamp() })
  } catch (error) {
    // Tell Polar to retry later.
    console.error("Polar webhook failed", event.type, error)
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
