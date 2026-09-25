import { doc, getDoc } from "firebase/firestore"

import { auth, db } from "./firebase"

/** Stable bucket for records created before tenant isolation was introduced. */
export const LEGACY_TENANT_ID = "legacy-visualcns"

export type TenantScoped = { tenantId: string }

function normalizeTenantId(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : LEGACY_TENANT_ID
}

// The signed-in user's tenant rarely changes, so remember it for the page's
// lifetime instead of re-reading users/{uid} before every query. Keyed by uid
// so a different sign-in never sees another account's tenant.
let cached: { uid: string; tenantId: Promise<string> } | null = null
let primeSequence = 0

/** Start a new priming round; only the latest round may update the cache. */
export function beginTenantPrime(): number {
  return ++primeSequence
}

/** Record a freshly read tenant id for `uid` (e.g. right after sign-in). */
export function primeTenantId(uid: string, tenantId: unknown, sequence?: number) {
  if (sequence !== undefined && sequence !== primeSequence) return
  cached = { uid, tenantId: Promise.resolve(normalizeTenantId(tenantId)) }
}

/** Forget the remembered tenant (sign-out, or after the tenant changed server-side). */
export function clearTenantCache() {
  cached = null
}

/** Resolve the signed-in user's tenant without trusting a caller-supplied id. */
export async function getCurrentTenantId(): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error("You must be signed in to access tenant data.")
  if (cached?.uid === uid) return cached.tenantId
  const entry = {
    uid,
    tenantId: getDoc(doc(db, "users", uid)).then((snapshot) => normalizeTenantId(snapshot.data()?.tenantId)),
  }
  cached = entry
  // Never keep a failed lookup around; the next call retries.
  entry.tenantId.catch(() => { if (cached === entry) cached = null })
  return entry.tenantId
}

/** Add the current tenant to a record before writing it to Firestore. */
export async function withCurrentTenant<T extends Record<string, unknown>>(data: T): Promise<T & TenantScoped> {
  return { ...data, tenantId: await getCurrentTenantId() }
}
