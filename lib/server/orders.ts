import { FieldValue, type Firestore } from "firebase-admin/firestore"

import { metadataOf } from "@/lib/server/paystack"

/**
 * One-off Paystack payments for services bought at the services checkout.
 * Each checkout is an `orders` doc (server only), marked paid once Paystack
 * confirms a charge for the full amount.
 */

/** Marks checkout payments in Paystack metadata, apart from subscriptions. */
export const ORDER_KIND = "order"

type Charge = { reference: string; status: string; amount: number; currency?: string; paid_at?: string; metadata?: unknown }

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
    await notifyPaidOrder(orderId, order).catch((error) => console.error("Paid order email failed", error))
  }
  return orderId
}

/**
 * Tells the agency a service order was paid. The webhook and the payer's
 * return can both get here; Resend drops the repeat by its idempotency key.
 */
async function notifyPaidOrder(orderId: string, order: Record<string, any>) {
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
    `\nPaystack reference: ${order.reference}`,
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
