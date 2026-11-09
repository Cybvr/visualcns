import { FieldValue, type Firestore } from "firebase-admin/firestore"

import { metadataOf } from "@/lib/server/paystack"

/**
 * Paystack payments for shared invoices. Starting a payment stores its
 * reference and amount on the invoice; a matching successful charge marks
 * the invoice paid.
 */

/** Marks invoice payments in Paystack metadata, apart from orders and subscriptions. */
export const INVOICE_KIND = "invoice"

type Charge = { reference: string; status: string; amount: number; currency?: string; metadata?: unknown }

/** Marks the invoice paid if this charge is for it. Returns the invoice id it applied to, if any. */
export async function applyInvoiceCharge(db: Firestore, charge: Charge) {
  const meta = metadataOf(charge.metadata)
  if (meta.kind !== INVOICE_KIND || charge.status !== "success") return ""
  const invoiceId = String(meta.invoiceId || "")
  if (!invoiceId) return ""
  const ref = db.collection("invoices").doc(invoiceId)
  const invoice = (await ref.get()).data()
  if (!invoice || invoice.paymentReference !== charge.reference) return ""
  if (Number(invoice.paymentAmount) !== charge.amount || (charge.currency && charge.currency !== invoice.currency)) return ""
  if (invoice.status !== "paid") {
    await ref.set({
      status: "paid",
      amountPaid: Number(invoice.amountPaid || 0) + charge.amount,
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  }
  return invoiceId
}
