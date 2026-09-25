import { doc, getDoc } from "firebase/firestore"

import { auth, db } from "./firebase"

/** Stable bucket for records created before tenant isolation was introduced. */
export const LEGACY_TENANT_ID = "legacy-visualcns"

export type TenantScoped = { tenantId: string }

let cachedTenant: { uid: string; tenantId: string } | null = null

/** Prime tenant resolution from the authenticated profile already in memory. */
export function primeCurrentTenantId(uid: string, tenantId?: string): void {
  if (uid && tenantId?.trim()) cachedTenant = { uid, tenantId: tenantId.trim() }
}

/** Clear the tenant cache when the Firebase session ends. */
export function clearCurrentTenantId(): void {
  cachedTenant = null
}

/** Resolve the signed-in user's tenant without trusting a caller-supplied id. */
export async function getCurrentTenantId(): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error("You must be signed in to access tenant data.")
  if (cachedTenant?.uid === uid) return cachedTenant.tenantId
  const snapshot = await getDoc(doc(db, "users", uid))
  const tenantId = snapshot.data()?.tenantId
  const resolved = typeof tenantId === "string" && tenantId.trim() ? tenantId : LEGACY_TENANT_ID
  cachedTenant = { uid, tenantId: resolved }
  return resolved
}

/** Add the current tenant to a record before writing it to Firestore. */
export async function withCurrentTenant<T extends Record<string, unknown>>(data: T): Promise<T & TenantScoped> {
  return { ...data, tenantId: await getCurrentTenantId() }
}
