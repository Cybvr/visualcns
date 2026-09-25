import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

function validSignature(body: string, signature: string) {
  const timestamp = signature.split(",").find((part) => part.startsWith("t="))?.slice(2)
  const provided = signature.split(",").find((part) => part.startsWith("v1="))?.slice(3)
  if (!timestamp || !provided || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !process.env.STRIPE_WEBHOOK_SECRET) return false
  const expected = createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest("hex")
  return provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

export async function POST(request: Request) {
  const body = await request.text()
  if (!validSignature(body, request.headers.get("stripe-signature") || "")) return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  try {
    const event = JSON.parse(body) as { type?: string; data?: { object?: Record<string, any> } }
    const object = event.data?.object || {}
    const { db } = adminServices()
    let agencyId = String(object.metadata?.agencyId || object.subscription_details?.metadata?.agencyId || "")
    if (!agencyId && object.customer) {
      const match = await db.collection("agencies").where("stripeCustomerId", "==", object.customer).limit(1).get()
      agencyId = match.empty ? "" : match.docs[0].id
    }
    if (agencyId) {
      const status = event.type === "customer.subscription.deleted" ? "suspended" : event.type === "invoice.payment_failed" ? "past_due" : event.type?.startsWith("customer.subscription") || event.type === "checkout.session.completed" ? "active" : undefined
      await db.collection("agencies").doc(agencyId).set({ ...(status ? { status } : {}), ...(object.customer ? { stripeCustomerId: object.customer } : {}), ...(object.subscription ? { stripeSubscriptionId: object.subscription } : {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    }
    return NextResponse.json({ received: true })
  } catch { return NextResponse.json({ error: "Webhook could not be processed" }, { status: 400 }) }
}
