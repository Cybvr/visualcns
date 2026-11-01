import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore"

import { cartService } from "@/lib/cart"
import { paystack } from "@/lib/server/paystack"

/**
 * Growth plans renew through Paystack plans made in the Paystack dashboard.
 * The cart takes the first payment; after it, the buyer's card is put on the
 * matching plan from the date the paid time runs out.
 */
const PLAN_CODES: Record<string, string> = {
  "growth-pro": "PLN_wwhw4pe333thxbk",
  "growth-pro-yearly": "PLN_b7s8ibmefza5urz",
  "growth-max": "PLN_ubsgxnee70m1wfu",
  "growth-max-yearly": "PLN_8sg1275e19wlkxr",
  "growth-ultra": "PLN_n2jhql0p3e4zpjz",
  "growth-ultra-yearly": "PLN_vwzywzl5govgv4i",
}

type Plan = { plan_code: string; name?: string; amount: number; interval: string; currency?: string; is_deleted?: boolean; is_archived?: boolean }

/**
 * The Paystack plan for a Growth cart item: the code above when it matches the
 * price, otherwise an existing plan with the same price and interval, otherwise
 * a new one. Remembered in billingConfig/paystack.
 */
export async function growthPlanCode(db: Firestore, serviceId: string): Promise<string> {
  const service = cartService(serviceId)
  if (!service || service.group !== "Growth") return ""
  const amount = service.price.amount * 100
  const interval = service.price.suffix === "/yr" ? "annually" : "monthly"
  const settings = db.collection("billingConfig").doc("paystack")
  const field = `growth_${serviceId.replace(/-/g, "_")}`
  const saved = (await settings.get()).data() ?? {}
  if (saved[`${field}_code`] && saved[`${field}_amount`] === amount) return String(saved[`${field}_code`])

  const fits = (plan: Plan | null) => Boolean(plan && plan.amount === amount && plan.interval === interval && !plan.is_deleted && !plan.is_archived)
  let code = ""
  const known = PLAN_CODES[serviceId]
  if (known) {
    const plan = await paystack<Plan>(`/plan/${encodeURIComponent(known)}`).catch(() => null)
    if (fits(plan)) code = known
  }
  if (!code) {
    const plans = await paystack<Plan[]>("/plan?perPage=100").catch(() => [] as Plan[])
    code = plans.find((plan) => fits(plan) && (plan.currency ?? "NGN") === "NGN" && /visualcns/i.test(plan.name || ""))?.plan_code ?? ""
  }
  if (!code) {
    const plan = await paystack<Plan>("/plan", { method: "POST", body: { name: `VisualCNS ${service.name}`, interval, amount, currency: "NGN" } })
    code = plan.plan_code
  }
  await settings.set({ [`${field}_code`]: code, [`${field}_amount`]: amount, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return code
}

type Charge = {
  customer?: { customer_code?: string; id?: number; email?: string }
  authorization?: { authorization_code?: string; reusable?: boolean }
}

/**
 * Puts the buyer on the Growth plan's Paystack subscription, starting when the
 * time they just paid for ends. Replaces any subscription the company had.
 */
export async function startGrowthSubscription(db: Firestore, companyId: string, serviceId: string, charge: Charge) {
  const customer = charge.customer?.customer_code
  const authorization = charge.authorization?.reusable ? charge.authorization.authorization_code : ""
  if (!companyId || !customer || !authorization) return
  const ref = db.collection("visitorBilling").doc(companyId)
  const billing = (await ref.get()).data() ?? {}
  const startsAt = billing.paidUntil?.toMillis?.() ?? Date.now()
  const plan = await growthPlanCode(db, serviceId)
  if (!plan) return

  const subscription = await paystack<{ subscription_code: string; email_token?: string }>("/subscription", {
    method: "POST",
    body: { customer, plan, authorization, start_date: new Date(startsAt).toISOString() },
  })
  const old = billing.subscriptionCode && billing.emailToken ? { code: String(billing.subscriptionCode), token: String(billing.emailToken) } : null
  await ref.set({
    subscriptionCode: subscription.subscription_code,
    emailToken: subscription.email_token || "",
    nextPaymentAt: Timestamp.fromMillis(startsAt),
    customerCode: customer,
    customerId: charge.customer?.id ?? billing.customerId ?? null,
    email: charge.customer?.email || billing.email || "",
    status: "active",
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
  if (old && old.code !== subscription.subscription_code) {
    await paystack("/subscription/disable", { method: "POST", body: old }).catch(() => undefined)
  }
}
