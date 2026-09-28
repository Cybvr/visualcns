import type { Timestamp } from "firebase/firestore"

/**
 * Visitor sign-in is sold per site (one company's front desk): a short free
 * trial, then a monthly Paystack subscription. The record lives in
 * visitorBilling/{companyId}; only the server writes it, so nobody can mark
 * their own site as paid from the browser.
 */

export const VISITOR_PRICE_NAIRA = 50000
export const VISITOR_TRIAL_DAYS = 3
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
