import { FieldValue, type Firestore } from "firebase-admin/firestore"

import { metadataOf } from "@/lib/server/paystack"

/**
 * One-off Paystack payments for services bought at the dashboard checkout.
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
  if (Math.round(Number(order.total) * 100) !== charge.amount || (charge.currency && charge.currency !== "NGN")) return ""
  if (order.status !== "paid") {
    await ref.set({ status: "paid", paidAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  }
  return orderId
}
