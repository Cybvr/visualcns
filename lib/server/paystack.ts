import { createHmac, timingSafeEqual } from "node:crypto"
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore"

import { VISITOR_PRICE_NAIRA, VISITOR_TRIAL_DAYS } from "@/lib/visitor-billing"

/**
 * Paystack for visitor sign-in: one monthly plan, one subscription per site.
 * Needs PAYSTACK_SECRET_KEY. The plan is made on first use and its code kept
 * in billingConfig/paystack (server only), unless PAYSTACK_VISITORS_PLAN_CODE is set.
 */

const API = "https://api.paystack.co"
const DAY_MS = 24 * 60 * 60 * 1000
const PLAN_NAME = "VisualCNS Visitor Sign-in"

export class PaystackError extends Error {}

function secret() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!key) throw new PaystackError("Payments aren't set up yet. Please try again later.")
  return key
}

export async function paystack<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: init.method || "GET",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  }).catch(() => null)
  if (!response) throw new PaystackError("Couldn't reach Paystack. Please try again.")
  const payload = (await response.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T }
  if (!response.ok || !payload.status) throw new PaystackError(payload.message || "Paystack couldn't do that. Please try again.")
  return payload.data as T
}

/** Paystack signs each webhook with an HMAC-SHA512 of the raw body using the secret key. */
export function validPaystackSignature(rawBody: string, signature: string) {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!key || !signature) return false
  const expected = createHmac("sha512", key).update(rawBody).digest("hex")
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

type Plan = { id: number; plan_code: string; name: string; amount: number; interval: string; currency: string }

/** The monthly visitor sign-in plan, made once and remembered. */
export async function visitorPlan(db: Firestore): Promise<{ code: string; id?: number }> {
  const fromEnv = process.env.PAYSTACK_VISITORS_PLAN_CODE?.trim()
  if (fromEnv) return { code: fromEnv }
  const settings = db.collection("billingConfig").doc("paystack")
  const saved = (await settings.get()).data()
  const amount = VISITOR_PRICE_NAIRA * 100
  if (saved?.visitorsPlanCode && saved.visitorsPlanAmount === amount) return { code: String(saved.visitorsPlanCode), id: Number(saved.visitorsPlanId) || undefined }
  const plan = await paystack<Plan>("/plan", { method: "POST", body: { name: PLAN_NAME, interval: "monthly", amount, currency: "NGN" } })
  await settings.set({ visitorsPlanCode: plan.plan_code, visitorsPlanId: plan.id, visitorsPlanAmount: amount, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return { code: plan.plan_code, id: plan.id }
}

/** Starts the free trial the first time a site's billing is looked at. */
export async function ensureVisitorBilling(db: Firestore, agencyId: string, companyId: string) {
  const ref = db.collection("visitorBilling").doc(companyId)
  const current = (await ref.get()).data()
  if (current) return current
  const record = {
    agencyId,
    companyId,
    status: "trialing",
    trialEndsAt: Timestamp.fromMillis(Date.now() + VISITOR_TRIAL_DAYS * DAY_MS),
    paidUntil: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }
  await ref.create(record).catch(() => undefined)
  return (await ref.get()).data() ?? record
}

export function metadataOf(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function stamp(value: unknown) {
  const at = typeof value === "string" || typeof value === "number" ? new Date(value).getTime() : NaN
  return Number.isFinite(at) ? Timestamp.fromMillis(at) : null
}

type Charge = {
  reference: string
  status: string
  amount: number
  paid_at?: string
  metadata?: unknown
  customer?: { id?: number; customer_code?: string; email?: string }
  plan?: { id?: number; plan_code?: string } | string | null
}

/**
 * Records a successful payment for a site: paid a month ahead, plus the
 * Paystack customer so later subscription events can be matched to it.
 * Returns the company id it applied to, if any.
 */
export async function applyCharge(db: Firestore, charge: Charge) {
  const meta = metadataOf(charge.metadata)
  if (meta.kind !== "visitor_signin" || charge.status !== "success") return ""
  const companyId = String(meta.companyId || "")
  const agencyId = String(meta.agencyId || "")
  if (!companyId || !agencyId) return ""
  const ref = db.collection("visitorBilling").doc(companyId)
  const current = (await ref.get()).data() ?? {}
  if (current.lastReference === charge.reference) return companyId
  const paidAt = stamp(charge.paid_at)?.toMillis() ?? Date.now()
  const monthAhead = paidAt + 31 * DAY_MS
  const paidUntil = Math.max(current.paidUntil?.toMillis?.() ?? 0, current.nextPaymentAt?.toMillis?.() ?? 0, monthAhead)
  await ref.set({
    agencyId,
    companyId,
    status: "active",
    paidUntil: Timestamp.fromMillis(paidUntil),
    customerCode: charge.customer?.customer_code || current.customerCode || "",
    customerId: charge.customer?.id ?? current.customerId ?? null,
    email: charge.customer?.email || current.email || "",
    lastReference: charge.reference,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
  if (!current.subscriptionCode) await linkSubscription(db, companyId)
  return companyId
}

type Subscription = { subscription_code: string; email_token?: string; status: string; next_payment_date?: string; createdAt?: string; plan?: { plan_code?: string } }

/** Finds this site's Paystack subscription by customer, when a webhook hasn't linked it yet. */
export async function linkSubscription(db: Firestore, companyId: string) {
  const ref = db.collection("visitorBilling").doc(companyId)
  const billing = (await ref.get()).data()
  if (!billing?.customerId || billing.subscriptionCode) return
  const plan = await visitorPlan(db)
  const list = await paystack<Subscription[]>(`/subscription?customer=${encodeURIComponent(String(billing.customerId))}&perPage=50`).catch(() => [])
  const taken = new Set((await db.collection("visitorBilling").where("customerCode", "==", billing.customerCode || "").get()).docs.map((row) => String(row.data().subscriptionCode || "")).filter(Boolean))
  const match = list
    .filter((item) => (!item.plan?.plan_code || item.plan.plan_code === plan.code) && item.status === "active" && !taken.has(item.subscription_code))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
  if (!match) return
  await saveSubscription(db, companyId, match)
}

export async function saveSubscription(db: Firestore, companyId: string, subscription: Subscription) {
  const next = stamp(subscription.next_payment_date)
  const ref = db.collection("visitorBilling").doc(companyId)
  const current = (await ref.get()).data() ?? {}
  const paidUntil = Math.max(current.paidUntil?.toMillis?.() ?? 0, next?.toMillis() ?? 0)
  await ref.set({
    subscriptionCode: subscription.subscription_code,
    emailToken: subscription.email_token || current.emailToken || "",
    nextPaymentAt: next,
    ...(paidUntil ? { paidUntil: Timestamp.fromMillis(paidUntil) } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}
