import { NextResponse } from "next/server"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { applyCharge, planForCode, saveSubscription, validPaystackSignature } from "@/lib/server/paystack"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Paystack events for VisualCNS subscriptions. Set this URL as the
 * webhook in Paystack (Settings, API Keys & Webhooks):
 * https://<your site>/api/billing/paystack/webhook
 */

type Event = { event?: string; data?: Record<string, any> }

async function billingBySubscription(db: FirebaseFirestore.Firestore, code: string) {
  if (!code) return null
  const rows = await db.collection("visitorBilling").where("subscriptionCode", "==", code).limit(1).get()
  return rows.empty ? null : rows.docs[0]
}

export async function POST(request: Request) {
  const raw = await request.text()
  if (!validPaystackSignature(raw, request.headers.get("x-paystack-signature") || "")) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }
  let event: Event
  try {
    event = JSON.parse(raw) as Event
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const data = event.data ?? {}
  const { db } = adminServices()

  try {
    switch (event.event) {
      case "charge.success": {
        // The first payment carries our metadata; renewals are handled by invoice.update.
        await applyCharge(db, data as Parameters<typeof applyCharge>[1])
        break
      }
      case "subscription.create": {
        if (data.plan?.plan_code && !(await planForCode(db, String(data.plan.plan_code)))) break
        if (await billingBySubscription(db, String(data.subscription_code || ""))) break
        // Match the new subscription to the company this customer just paid for.
        const rows = await db.collection("visitorBilling").where("customerCode", "==", String(data.customer?.customer_code || "")).get()
        const site = rows.docs
          .filter((row) => !row.data().subscriptionCode)
          .sort((a, b) => (b.data().updatedAt?.toMillis?.() ?? 0) - (a.data().updatedAt?.toMillis?.() ?? 0))[0]
        if (site) await saveSubscription(db, site.id, data as Parameters<typeof saveSubscription>[2])
        break
      }
      case "invoice.create":
      case "invoice.update": {
        const site = await billingBySubscription(db, String(data.subscription?.subscription_code || ""))
        if (site && data.paid && data.status === "success") {
          await saveSubscription(db, site.id, { ...data.subscription, subscription_code: String(data.subscription.subscription_code) })
          await site.ref.set({ status: "active", updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        }
        break
      }
      case "invoice.payment_failed": {
        const site = await billingBySubscription(db, String(data.subscription?.subscription_code || ""))
        if (site) await site.ref.set({ status: "past_due", updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        break
      }
      case "subscription.not_renew":
      case "subscription.disable": {
        const site = await billingBySubscription(db, String(data.subscription_code || ""))
        // Paid time already bought still counts; the plan stops after it (plus the grace days).
        if (site) {
          const next = data.next_payment_date ? new Date(data.next_payment_date).getTime() : NaN
          await site.ref.set({
            status: "cancelled",
            ...(Number.isFinite(next) && event.event === "subscription.not_renew" ? { nextPaymentAt: Timestamp.fromMillis(next) } : {}),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true })
        }
        break
      }
    }
  } catch (error) {
    // Tell Paystack to retry later.
    console.error("Paystack webhook failed", event.event, error)
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
