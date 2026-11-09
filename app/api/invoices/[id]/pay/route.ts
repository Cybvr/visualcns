import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { applyInvoiceCharge, INVOICE_KIND } from "@/lib/server/invoice-payments"
import { paystack, PaystackError } from "@/lib/server/paystack"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Pays a shared invoice through Paystack, no sign-in needed. Actions:
 * - pay: returns a Paystack checkout link for what is still owed
 * - verify: after Paystack sends the payer back, confirms the payment
 * The amount always comes from the invoice, never from the request.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function siteOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { action?: string; email?: string; reference?: string }
  const { db } = adminServices()

  try {
    const ref = db.collection("invoices").doc(id)
    const invoice = (await ref.get()).data()
    if (!invoice || (invoice.status === "draft" && !invoice.shareEnabled)) return NextResponse.json({ error: "This invoice isn't available." }, { status: 404 })

    if (body.action === "pay") {
      if (invoice.status === "paid") return NextResponse.json({ error: "This invoice is already paid." }, { status: 400 })
      if (invoice.status === "void" || invoice.status === "draft") return NextResponse.json({ error: "This invoice can't be paid online." }, { status: 400 })
      const due = Math.max(0, Number(invoice.amount || 0) - Number(invoice.amountPaid || 0))
      if (!due) return NextResponse.json({ error: "Nothing is owed on this invoice." }, { status: 400 })
      const typed = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : ""
      const email = EMAIL_PATTERN.test(typed) ? typed : String(invoice.billTo?.email || "").trim()
      if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "Enter your email address to pay." }, { status: 400 })
      const currency = String(invoice.currency || "NGN").toUpperCase()
      // Paystack references allow only letters, numbers, "-", "." and "=".
      const reference = `vcns-inv-${id}-${Date.now()}`
      await ref.set({ paymentReference: reference, paymentAmount: due, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      const checkout = await paystack<{ authorization_url: string }>("/transaction/initialize", {
        method: "POST",
        body: {
          email,
          amount: due,
          currency,
          reference,
          callback_url: `${siteOrigin(request)}/share/invoices/${encodeURIComponent(id)}`,
          metadata: {
            kind: INVOICE_KIND,
            invoiceId: id,
            custom_fields: [{ display_name: "Invoice", variable_name: "invoice", value: String(invoice.invoiceNumber || id) }],
          },
        },
      })
      return NextResponse.json({ url: checkout.authorization_url })
    }

    if (body.action === "verify") {
      const reference = typeof body.reference === "string" ? body.reference.trim() : ""
      if (!/^[A-Za-z0-9._=-]{4,120}$/.test(reference)) return NextResponse.json({ error: "Missing payment reference." }, { status: 400 })
      const charge = await paystack<Parameters<typeof applyInvoiceCharge>[1]>(`/transaction/verify/${encodeURIComponent(reference)}`)
      const applied = await applyInvoiceCharge(db, charge)
      if (applied !== id) return NextResponse.json({ error: charge.status === "success" ? "We couldn't match that payment to this invoice." : "The payment didn't go through." }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    if (error instanceof PaystackError) {
      console.error("Paystack refused invoice payment", id, error.message)
      return NextResponse.json({ error: `Paystack: ${error.message}` }, { status: 502 })
    }
    console.error("Invoice payment failed", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
