import { createHmac, timingSafeEqual } from "node:crypto"
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore"

import { isPlanInterval, isPlanKey, PLAN_INTERVALS, PLAN_KEYS, PLANS, planPrice, TRIAL_DAYS, type PlanInterval, type PlanKey } from "@/lib/subscription"

/**
 * Paystack for the VisualCNS subscription: one Paystack plan per tier and
 * interval (monthly or yearly), one subscription per company. Needs
 * PAYSTACK_SECRET_KEY. Plans are made on first use and their codes kept in
 * billingConfig/paystack (server only).
 */

const API = "https://api.paystack.co"
const DAY_MS = 24 * 60 * 60 * 1000
const PLAN_NAME = "VisualCNS"
/** Marks our checkouts in Paystack metadata. */
export const CHARGE_KIND = "subscription"

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

/** A tier's Paystack plan for one interval, made once and remembered. */
export async function paystackPlan(db: Firestore, key: PlanKey, interval: PlanInterval): Promise<{ code: string; id?: number }> {
  const settings = db.collection("billingConfig").doc("paystack")
  const saved = (await settings.get()).data() ?? {}
  const amount = planPrice(key, interval) * 100
  const field = `plan_${key}_${interval}`
  if (saved[`${field}_code`] && saved[`${field}_amount`] === amount) return { code: String(saved[`${field}_code`]), id: Number(saved[`${field}_id`]) || undefined }
  const plan = await paystack<Plan>("/plan", { method: "POST", body: { name: `${PLAN_NAME} ${PLANS[key].name} (${interval})`, interval: interval === "yearly" ? "annually" : "monthly", amount, currency: "NGN" } })
  await settings.set({ [`${field}_code`]: plan.plan_code, [`${field}_id`]: plan.id, [`${field}_amount`]: amount, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return { code: plan.plan_code, id: plan.id }
}

/** Which tier and interval a Paystack plan code belongs to, or null if it isn't ours. */
export async function planForCode(db: Firestore, code: string): Promise<{ key: PlanKey; interval: PlanInterval } | null> {
  if (!code) return null
  for (const key of PLAN_KEYS) {
    for (const interval of PLAN_INTERVALS) {
      if ((await paystackPlan(db, key, interval)).code === code) return { key, interval }
    }
  }
  return null
}

/** Starts the free trial the first time a company's subscription is looked at. */
export async function ensureSubscription(db: Firestore, agencyId: string, companyId: string) {
  const ref = db.collection("visitorBilling").doc(companyId)
  const current = (await ref.get()).data()
  if (current) return current
  const record = {
    agencyId,
    companyId,
    status: "trialing",
    trialEndsAt: Timestamp.fromMillis(Date.now() + TRIAL_DAYS * DAY_MS),
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
 * Records a successful payment for a company: paid a month or year ahead, plus the
 * Paystack customer so later subscription events can be matched to it.
 * Returns the company id it applied to, if any.
 */
export async function applyCharge(db: Firestore, charge: Charge) {
  const meta = metadataOf(charge.metadata)
  if (meta.kind !== CHARGE_KIND || charge.status !== "success") return ""
  const companyId = String(meta.companyId || "")
  const agencyId = String(meta.agencyId || "")
  if (!companyId || !agencyId) return ""
  const ref = db.collection("visitorBilling").doc(companyId)
  const current = (await ref.get()).data() ?? {}
  if (current.lastReference === charge.reference) return companyId
  if (!isPlanKey(meta.plan) || !isPlanInterval(meta.interval)) return ""
  const plan: PlanKey = meta.plan
  const interval: PlanInterval = meta.interval
  // Changing plan or interval: the new payment starts a new subscription, so stop the old one.
  const oldSubscription = current.subscriptionCode && (plan !== current.plan || interval !== current.interval)
    ? { code: String(current.subscriptionCode), token: String(current.emailToken || "") }
    : null
  const paidAt = stamp(charge.paid_at)?.toMillis() ?? Date.now()
  const periodAhead = paidAt + (interval === "yearly" ? 366 : 31) * DAY_MS
  const paidUntil = Math.max(current.paidUntil?.toMillis?.() ?? 0, current.nextPaymentAt?.toMillis?.() ?? 0, periodAhead)
  await ref.set({
    agencyId,
    companyId,
    status: "active",
    paidUntil: Timestamp.fromMillis(paidUntil),
    customerCode: charge.customer?.customer_code || current.customerCode || "",
    customerId: charge.customer?.id ?? current.customerId ?? null,
    email: charge.customer?.email || current.email || "",
    lastReference: charge.reference,
    plan,
    interval,
    ...(oldSubscription ? { subscriptionCode: "", emailToken: "" } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
  if (oldSubscription?.token) {
    // Cleared above first, so the "disabled" webhook for it no longer matches this company.
    await paystack("/subscription/disable", { method: "POST", body: oldSubscription }).catch(() => undefined)
  }
  if (!current.subscriptionCode || oldSubscription) await linkSubscription(db, companyId)
  return companyId
}

type Subscription = { subscription_code: string; email_token?: string; status: string; next_payment_date?: string; createdAt?: string; plan?: { plan_code?: string } }

/** Finds this company's Paystack subscription by customer, when a webhook hasn't linked it yet. */
export async function linkSubscription(db: Firestore, companyId: string) {
  const ref = db.collection("visitorBilling").doc(companyId)
  const billing = (await ref.get()).data()
  if (!billing?.customerId || billing.subscriptionCode) return
  if (!isPlanKey(billing.plan) || !isPlanInterval(billing.interval)) return
  const plan = await paystackPlan(db, billing.plan, billing.interval)
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
