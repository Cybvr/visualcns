import type { Timestamp } from "firebase/firestore"

/**
 * Visitor sign-in is sold per site (one company's front desk): a free
 * trial, then a monthly Paystack subscription. The record lives in
 * visitorBilling/{companyId}; only the server writes it, so nobody can mark
 * their own site as paid from the browser.
 */

/** Plans by staff count, per site. Staff are the people visitors can pick and who get arrival emails. */
export type VisitorPlanKey = "starter" | "business"
export const VISITOR_PLANS: Record<VisitorPlanKey, { name: string; staff: number; priceNaira: number }> = {
  starter: { name: "Starter", staff: 5, priceNaira: 25000 },
  business: { name: "Business", staff: 25, priceNaira: 50000 },
}
export const VISITOR_PLAN_KEYS: VisitorPlanKey[] = ["starter", "business"]
/** The lowest price, for "from ₦25,000 a month" copy. */
export const VISITOR_PRICE_NAIRA = VISITOR_PLANS.starter.priceNaira
/** During the free trial a site can add as many staff as the biggest plan allows. */
export const VISITOR_TRIAL_STAFF = VISITOR_PLANS.business.staff

export function isVisitorPlan(value: unknown): value is VisitorPlanKey {
  return value === "starter" || value === "business"
}

/** The smallest plan that covers this many staff, or null when it needs a custom (Enterprise) plan. */
export function planForStaff(count: number): VisitorPlanKey | null {
  return VISITOR_PLAN_KEYS.find((key) => count <= VISITOR_PLANS[key].staff) ?? null
}

/**
 * How many staff a site may have right now: the paid plan's allowance, or the
 * trial allowance. Sites paid before plans existed were on the ₦50,000 plan.
 */
export function staffLimit(billing: { plan?: string; paidUntil?: Stamp; trialEndsAt?: Stamp } | null | undefined, now = Date.now()): number {
  const access = visitorAccess(billing, now)
  if (access.state === "active" || access.state === "grace") return VISITOR_PLANS[isVisitorPlan(billing?.plan) ? billing.plan : "business"].staff
  return VISITOR_TRIAL_STAFF
}
export const VISITOR_TRIAL_DAYS = 30
/** Days the tablet keeps working after a missed or cancelled payment. */
export const VISITOR_GRACE_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

export interface VisitorBilling {
  agencyId: string
  companyId: string
  trialEndsAt?: Timestamp | null
  status?: "trialing" | "active" | "past_due" | "cancelled"
  /** Paid up to here. The tablet keeps working for the grace days after it. */
  paidUntil?: Timestamp | null
  nextPaymentAt?: Timestamp | null
  subscriptionCode?: string
  customerCode?: string
  /** The paid plan. Missing on sites paid before plans existed (they were on Business). */
  plan?: VisitorPlanKey
}

type Stamp = { toMillis: () => number } | null | undefined

export type VisitorAccess =
  | { state: "trial"; allowed: true; endsAt: number }
  | { state: "active"; allowed: true; endsAt: number }
  | { state: "grace"; allowed: true; endsAt: number }
  | { state: "paused"; allowed: false; endsAt: number }

/** Whether the tablet should work right now, and until when. */
export function visitorAccess(billing: { trialEndsAt?: Stamp; paidUntil?: Stamp } | null | undefined, now = Date.now()): VisitorAccess {
  const paidUntil = billing?.paidUntil?.toMillis() ?? 0
  const trialEndsAt = billing?.trialEndsAt?.toMillis() ?? 0
  if (paidUntil > now) return { state: "active", allowed: true, endsAt: paidUntil }
  if (paidUntil && now < paidUntil + VISITOR_GRACE_DAYS * DAY_MS) return { state: "grace", allowed: true, endsAt: paidUntil + VISITOR_GRACE_DAYS * DAY_MS }
  if (trialEndsAt > now) return { state: "trial", allowed: true, endsAt: trialEndsAt }
  return { state: "paused", allowed: false, endsAt: Math.max(paidUntil, trialEndsAt) }
}

export function daysLeft(until: number, now = Date.now()) {
  return Math.max(0, Math.ceil((until - now) / DAY_MS))
}
