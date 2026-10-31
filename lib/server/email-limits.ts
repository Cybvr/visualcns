import { FieldValue, type Firestore } from "firebase-admin/firestore"

import { EMAIL_LIMITS, type GrowthTierId } from "@/lib/plans"
import { isPlanKey, planAccess, type PlanKey } from "@/lib/subscription"

/** Older Starter/Business/Pro subscriptions get the email allowance of the Growth plan closest in size. */
const OLD_PLAN_TIER: Record<PlanKey, GrowthTierId> = { starter: "growth-pro", business: "growth-pro", pro: "growth-max" }

function isTier(value: unknown): value is GrowthTierId {
  return typeof value === "string" && value in EMAIL_LIMITS
}

/** The Growth plan whose email allowance a company has right now; Free when nothing is paid. */
export function emailTierFor(billing: Record<string, any> | undefined): GrowthTierId {
  const access = planAccess(billing)
  if (access.state !== "active" && access.state !== "grace") return "growth-free"
  if (isTier(billing?.growthTier)) return billing.growthTier
  if (isPlanKey(billing?.plan)) return OLD_PLAN_TIER[billing.plan]
  return "growth-free"
}

function usageRef(db: Firestore, companyId: string) {
  return db.collection("emailUsage").doc(`${companyId}_${new Date().toISOString().slice(0, 7)}`)
}

/**
 * Takes `count` emails from the company's allowance for this month, or refuses
 * if that would go over. Call releaseEmails if the send then fails.
 */
export async function reserveEmails(db: Firestore, companyId: string, count: number) {
  const billing = (await db.collection("visitorBilling").doc(companyId).get()).data()
  const limit = EMAIL_LIMITS[emailTierFor(billing)]
  const ref = usageRef(db, companyId)
  return db.runTransaction(async (tx) => {
    const used = Number((await tx.get(ref)).data()?.count || 0)
    if (used + count > limit) return { ok: false as const, used, limit }
    tx.set(ref, { companyId, month: ref.id.slice(-7), count: used + count, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return { ok: true as const, used: used + count, limit }
  })
}

/** Gives back emails reserved for a send that didn't go out. */
export async function releaseEmails(db: Firestore, companyId: string, count: number) {
  await usageRef(db, companyId).set({ count: FieldValue.increment(-count), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}
