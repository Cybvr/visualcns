import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore"

import { baseServiceId, GROWTH_APP_PLAN } from "@/lib/cart"
import { startGrowthSubscription } from "@/lib/server/growth-subscriptions"
import { PLAN_KEYS, type PlanKey } from "@/lib/subscription"

import { metadataOf } from "@/lib/server/paystack"

/**
 * One-off Paystack payments for services bought at the services checkout.
 * Each checkout is an `orders` doc (server only), marked paid once Paystack
 * confirms a charge for the full amount.
 */

/** Marks checkout payments in Paystack metadata, apart from subscriptions. */
export const ORDER_KIND = "order"

type Charge = {
  reference: string
  status: string
  amount: number
  currency?: string
  paid_at?: string
  metadata?: unknown
  customer?: { customer_code?: string; id?: number; email?: string }
  authorization?: { authorization_code?: string; reusable?: boolean }
}

/** Marks the order paid if this charge is for it. Returns the order id it applied to, if any. */
export async function applyOrderCharge(db: Firestore, charge: Charge) {
  const meta = metadataOf(charge.metadata)
  if (meta.kind !== ORDER_KIND || charge.status !== "success") return ""
  const orderId = String(meta.orderId || "")
  if (!orderId) return ""
  const ref = db.collection("orders").doc(orderId)
  const order = (await ref.get()).data()
  if (!order || order.reference !== charge.reference) return ""
  if (Math.round(Number(order.total) * 100) !== charge.amount || (charge.currency && charge.currency !== (order.currency || "NGN"))) return ""
  if (order.status !== "paid") {
    await ref.set({ status: "paid", paidAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    const growth = await grantGrowthAccess(db, order).catch((error) => { console.error("Growth access grant failed", error); return null })
    // Growth plans paid in Naira then renew on their own through Paystack.
    if (growth && (order.currency || "NGN") === "NGN") {
      await startGrowthSubscription(db, growth.companyId, growth.serviceId, charge).catch((error) => console.error("Growth subscription failed", error))
    }
    await notifyPaidOrder(orderId, order).catch((error) => console.error("Paid order email failed", error))
  }
  return orderId
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000

/**
 * A paid Growth plan includes Pass, Pulse and Ngai: give the buyer's company a
 * month (or a year) of the matching app plan, added on to any time it already has.
 */
export async function grantGrowthAccess(db: Firestore, order: Record<string, any>) {
  const companyId = String(order.companyId || "")
  const items = Array.isArray(order.items) ? order.items as { id?: string }[] : []
  // The highest Growth plan in the order wins; GROWTH_APP_PLAN lists them cheapest first.
  const tierIds = Object.keys(GROWTH_APP_PLAN)
  const bought = items.map((item) => String(item.id || "")).filter((id) => GROWTH_APP_PLAN[baseServiceId(id)])
    .sort((a, b) => tierIds.indexOf(baseServiceId(b)) - tierIds.indexOf(baseServiceId(a)))[0]
  if (!companyId || !bought) return null
  const tier = baseServiceId(bought)
  const yearly = bought !== tier
  const plan: PlanKey = GROWTH_APP_PLAN[tier]
  const ref = db.collection("visitorBilling").doc(companyId)
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() ?? {}
    const from = Math.max(Date.now(), current.paidUntil?.toMillis?.() ?? 0)
    const stillPaid = (current.paidUntil?.toMillis?.() ?? 0) > Date.now()
    const keep = stillPaid && (PLAN_KEYS.indexOf(current.plan) > PLAN_KEYS.indexOf(plan) || tierIds.indexOf(current.growthTier) > tierIds.indexOf(tier))
    tx.set(ref, {
      agencyId: String(order.agencyId || current.agencyId || ""),
      companyId,
      status: "active",
      plan: keep ? current.plan : plan,
      growthTier: keep && current.growthTier ? current.growthTier : tier,
      interval: yearly ? "yearly" : "monthly",
      paidUntil: Timestamp.fromMillis(from + (yearly ? 12 : 1) * MONTH_MS),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  })
  return { companyId, serviceId: bought }
}

/**
 * Tells the agency a service order was paid. The webhook and the payer's
 * return can both get here; Resend drops the repeat by its idempotency key.
 */
export async function notifyPaidOrder(orderId: string, order: Record<string, any>) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM?.trim()
  const to = process.env.BOOKING_NOTIFY_EMAIL?.trim() || process.env.EMAIL_REPLY_TO?.trim() || from
  if (!apiKey || !from || !to) return
  const items = Array.isArray(order.items) ? order.items as { name?: string; amount?: number }[] : []
  const money = (amount: unknown) => order.currency === "USD" ? `$${Number(amount || 0).toLocaleString("en-US")}` : `₦${Number(amount || 0).toLocaleString("en-NG")}`
  const escape = (value: unknown) => String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string)
  const lines = items.map((item) => `${item.name}: ${money(item.amount)}`)
  const text = [
    `New paid order from ${order.email}.`,
    "",
    ...lines,
    `Total: ${money(order.total)}`,
    order.note ? `\nNote: ${order.note}` : "",
    order.provider === "polar" ? `\nPolar order: ${order.reference}` : `\nPaystack reference: ${order.reference}`,
  ].join("\n")
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `order-paid-${orderId}` },
    body: JSON.stringify({
      from,
      to,
      reply_to: order.email,
      subject: `Paid order: ${money(order.total)} from ${order.email}`,
      text,
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${escape(text)}</pre>`,
    }),
    cache: "no-store",
  })
}
