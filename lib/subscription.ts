import type { Timestamp } from "firebase/firestore"

/**
 * The one VisualCNS subscription: three tiers, paid monthly or yearly, per
 * company. It covers everything sold in the app: Pass (visitor sign-in),
 * Pulse, Ngai and the growth workflows. A free trial comes first, then a
 * Paystack subscription. The record lives in visitorBilling/{companyId}; only
 * the server writes it, so nobody can mark their own company as paid from the browser.
 */

export type PlanKey = "starter" | "business" | "pro"
export type PlanInterval = "monthly" | "yearly"

export type Plan = {
  name: string
  monthlyNaira: number
  yearlyNaira: number
  /** Pass staff: the people visitors can pick, who get arrival emails. */
  staff: number
  /** Pulse scans a month. Infinity means no limit. */
  pulseScans: number
  summary: string
  features: string[]
}

export const PLANS: Record<PlanKey, Plan> = {
  starter: {
    name: "Starter",
    monthlyNaira: 25000,
    yearlyNaira: 250000,
    staff: 5,
    pulseScans: 1,
    summary: "For a small office getting set up.",
    features: ["Pass visitor sign-in for up to 5 staff", "1 Pulse scan a month", "Ngai assistant", "Client portal for your team"],
  },
  business: {
    name: "Business",
    monthlyNaira: 50000,
    yearlyNaira: 500000,
    staff: 25,
    pulseScans: 4,
    summary: "For a growing team with a busy front desk.",
    features: ["Pass visitor sign-in for up to 25 staff", "4 Pulse scans a month", "Ngai assistant", "Client portal for your team", "Slack, Teams and webhook alerts"],
  },
  pro: {
    name: "Pro",
    monthlyNaira: 200000,
    yearlyNaira: 2000000,
    staff: Infinity,
    pulseScans: Infinity,
    summary: "For larger companies that want everything.",
    features: ["Pass visitor sign-in for unlimited staff", "Unlimited Pulse scans", "Ngai assistant", "Client portal for your team", "Slack, Teams and webhook alerts", "Growth workflows: Marketing, Orbit, Studio, Launch, Signal and Atlas", "Priority support"],
  },
}
export const PLAN_KEYS: PlanKey[] = ["starter", "business", "pro"]
export const PLAN_INTERVALS: PlanInterval[] = ["monthly", "yearly"]

export function isPlanKey(value: unknown): value is PlanKey {
  return value === "starter" || value === "business" || value === "pro"
}

export function isPlanInterval(value: unknown): value is PlanInterval {
  return value === "monthly" || value === "yearly"
}

export function planPrice(key: PlanKey, interval: PlanInterval) {
  return interval === "yearly" ? PLANS[key].yearlyNaira : PLANS[key].monthlyNaira
}

export const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`

export function staffLabel(staff: number) {
  return Number.isFinite(staff) ? `Up to ${staff} staff` : "Unlimited staff"
}

/** The smallest plan that covers this many staff. */
export function planForStaff(count: number): PlanKey {
  return PLAN_KEYS.find((key) => count <= PLANS[key].staff) ?? "pro"
}

export const TRIAL_DAYS = 30
/** During the free trial a company gets the Business allowances. */
export const TRIAL_PLAN: PlanKey = "business"
/** Days things keep working after a missed or cancelled payment. */
export const GRACE_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

export interface Subscription {
  agencyId: string
  companyId: string
  trialEndsAt?: Timestamp | null
  status?: "trialing" | "active" | "past_due" | "cancelled"
  /** Paid up to here. Things keep working for the grace days after it. */
  paidUntil?: Timestamp | null
  nextPaymentAt?: Timestamp | null
  subscriptionCode?: string
  customerCode?: string
  plan?: PlanKey
  interval?: PlanInterval
}

type Stamp = { toMillis: () => number } | null | undefined

export type Access =
  | { state: "trial"; allowed: true; endsAt: number }
  | { state: "active"; allowed: true; endsAt: number }
  | { state: "grace"; allowed: true; endsAt: number }
  | { state: "paused"; allowed: false; endsAt: number }

/** Whether the company's plan is working right now, and until when. */
export function planAccess(billing: { trialEndsAt?: Stamp; paidUntil?: Stamp } | null | undefined, now = Date.now()): Access {
  const paidUntil = billing?.paidUntil?.toMillis() ?? 0
  const trialEndsAt = billing?.trialEndsAt?.toMillis() ?? 0
  if (paidUntil > now) return { state: "active", allowed: true, endsAt: paidUntil }
  if (paidUntil && now < paidUntil + GRACE_DAYS * DAY_MS) return { state: "grace", allowed: true, endsAt: paidUntil + GRACE_DAYS * DAY_MS }
  if (trialEndsAt > now) return { state: "trial", allowed: true, endsAt: trialEndsAt }
  return { state: "paused", allowed: false, endsAt: Math.max(paidUntil, trialEndsAt) }
}

/** The plan whose allowances apply now: the paid plan, or the trial plan. */
export function currentPlan(billing: { plan?: string; paidUntil?: Stamp; trialEndsAt?: Stamp } | null | undefined, now = Date.now()): PlanKey {
  const access = planAccess(billing, now)
  if ((access.state === "active" || access.state === "grace") && isPlanKey(billing?.plan)) return billing.plan
  return TRIAL_PLAN
}

/** How many Pass staff a company may have right now. */
export function staffLimit(billing: { plan?: string; paidUntil?: Stamp; trialEndsAt?: Stamp } | null | undefined, now = Date.now()): number {
  return PLANS[currentPlan(billing, now)].staff
}

export function daysLeft(until: number, now = Date.now()) {
  return Math.max(0, Math.ceil((until - now) / DAY_MS))
}
