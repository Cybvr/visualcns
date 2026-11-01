import { FieldValue, type Firestore } from "firebase-admin/firestore"

/**
 * Discount codes for the services checkout. Server only: each code is a doc in
 * `discountCodes`, its id the code in capitals, added in the Firebase console.
 * Fields:
 * - percent: 1–100, off the cart total; or
 * - amountNGN / amountUSD: a fixed amount off, in that currency (whole units)
 * - active: false turns the code off (missing counts as on)
 * - expiresAt: optional Timestamp, after which it stops working
 * - maxUses: optional cap on paid orders; `uses` counts them
 */

export class DiscountError extends Error {}

export type AppliedDiscount = { code: string; amount: number }

export function normalizeCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase().slice(0, 40) : ""
}

/** What the code takes off this subtotal, or throws a DiscountError saying why it can't be used. */
export async function discountFor(db: Firestore, rawCode: unknown, subtotal: number, currency: "NGN" | "USD"): Promise<AppliedDiscount> {
  const code = normalizeCode(rawCode)
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) throw new DiscountError("That code isn't valid.")
  const data = (await db.collection("discountCodes").doc(code).get()).data()
  if (!data || data.active === false) throw new DiscountError("That code isn't valid.")
  if (data.expiresAt?.toMillis && data.expiresAt.toMillis() < Date.now()) throw new DiscountError("That code has expired.")
  if (typeof data.maxUses === "number" && Number(data.uses || 0) >= data.maxUses) throw new DiscountError("That code has been used up.")

  const percent = Number(data.percent || 0)
  const fixed = Number(data[`amount${currency}`] || 0)
  const raw = percent > 0 ? Math.round((subtotal * Math.min(percent, 100)) / 100) : Math.round(fixed)
  if (raw <= 0) throw new DiscountError(currency === "USD" ? "That code doesn't work for dollar payments." : "That code doesn't work for Naira payments.")
  // Paystack can't take a zero payment, so a code never covers the whole order.
  if (raw >= subtotal) throw new DiscountError("That code can't be used on this order.")
  return { code, amount: raw }
}

/** Counts a paid use of the code. */
export async function countDiscountUse(db: Firestore, code: string) {
  if (!code) return
  await db.collection("discountCodes").doc(code).set({ uses: FieldValue.increment(1) }, { merge: true })
}
