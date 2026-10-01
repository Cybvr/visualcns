import { NextResponse, type NextRequest } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { applyCharge, ensureVisitorBilling, linkSubscription, paystack, PaystackError, visitorPlan } from "@/lib/server/paystack"
import { isVisitorPlan, planForStaff, VISITOR_PLANS } from "@/lib/visitor-billing"
import { visitorStaff } from "@/lib/server/visitor-staff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Visitor sign-in billing for one site. Actions:
 * - start: begin the free trial (called when the tablet is first switched on)
 * - subscribe: returns a Paystack checkout link for a plan (Starter or Business)
 * - verify: after Paystack sends the payer back, confirms the payment
 * - manage: returns Paystack's page to change card or cancel
 * The agency's admins and the company's own staff can use it.
 */

class Refused extends Error {}

async function authorize(request: NextRequest, companyId: string) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Refused("Please sign in again.")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) throw new Refused("Please sign in again.")
  const user = (await db.collection("users").doc(decoded.uid).get()).data() ?? {}
  const org = (await db.collection("organizations").doc(companyId).get()).data()
  if (!org) throw new Refused("We couldn't find that company.")
  const agencyId = String(org.agencyId || "")
  const superAdmin = user.role === "superadmin"
  const agencyAdmin = user.role === "admin" && user.agencyId === agencyId
  const ownStaff = user.agencyId === agencyId && user.companyId === companyId
  if (!agencyId || !(superAdmin || agencyAdmin || ownStaff)) throw new Refused("You can't manage billing for this company.")
  return { db, agencyId, org, email: String(decoded.email || user.email || "") }
}

function siteOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { action?: string; companyId?: string; reference?: string; plan?: string }
  const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
  if (!companyId) return NextResponse.json({ error: "Missing company." }, { status: 400 })

  try {
    const { db, agencyId, org, email } = await authorize(request, companyId)

    if (body.action === "start") {
      await ensureVisitorBilling(db, agencyId, companyId)
      return NextResponse.json({ ok: true })
    }

    if (body.action === "subscribe") {
      if (!email) return NextResponse.json({ error: "Your account needs an email address to pay." }, { status: 400 })
      await ensureVisitorBilling(db, agencyId, companyId)
      const { seats } = await visitorStaff(db, agencyId, companyId)
      const needed = planForStaff(seats)
      if (!needed) return NextResponse.json({ error: `You have more than ${VISITOR_PLANS.business.staff} staff. Contact us for an Enterprise plan.` }, { status: 400 })
      const planKey = isVisitorPlan(body.plan) ? body.plan : needed
      if (seats > VISITOR_PLANS[planKey].staff) return NextResponse.json({ error: `${VISITOR_PLANS[planKey].name} covers ${VISITOR_PLANS[planKey].staff} staff and you have ${seats}. Choose ${VISITOR_PLANS[needed].name}.` }, { status: 400 })
      const plan = await visitorPlan(db, planKey)
      const slug = String(org.slug || companyId)
      const checkout = await paystack<{ authorization_url: string; reference: string }>("/transaction/initialize", {
        method: "POST",
        body: {
          email,
          amount: VISITOR_PLANS[planKey].priceNaira * 100,
          currency: "NGN",
          plan: plan.code,
          callback_url: `${siteOrigin(request)}/${encodeURIComponent(slug)}/visitors?paid=1`,
          metadata: {
            kind: "visitor_signin",
            companyId,
            agencyId,
            plan: planKey,
            custom_fields: [{ display_name: "Site", variable_name: "site", value: String(org.name || slug) }],
          },
        },
      })
      return NextResponse.json({ url: checkout.authorization_url })
    }

    if (body.action === "verify") {
      const reference = typeof body.reference === "string" ? body.reference.trim() : ""
      if (!/^[A-Za-z0-9._=-]{4,100}$/.test(reference)) return NextResponse.json({ error: "Missing payment reference." }, { status: 400 })
      const charge = await paystack<Parameters<typeof applyCharge>[1]>(`/transaction/verify/${encodeURIComponent(reference)}`)
      const applied = await applyCharge(db, charge)
      if (applied !== companyId) return NextResponse.json({ error: charge.status === "success" ? "That payment was for a different site." : "The payment didn't go through." }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    if (body.action === "manage") {
      const billing = (await db.collection("visitorBilling").doc(companyId).get()).data()
      if (billing && !billing.subscriptionCode) await linkSubscription(db, companyId)
      const code = String((await db.collection("visitorBilling").doc(companyId).get()).data()?.subscriptionCode || "")
      if (!code) return NextResponse.json({ error: "There's no subscription for this site yet." }, { status: 404 })
      const manage = await paystack<{ link: string }>(`/subscription/${encodeURIComponent(code)}/manage/link`)
      return NextResponse.json({ url: manage.link })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    if (error instanceof Refused) return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof PaystackError) return NextResponse.json({ error: error.message }, { status: 502 })
    console.error("Visitor billing failed", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
