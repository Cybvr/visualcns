import { doc, getDoc } from "firebase/firestore"

import { auth, db } from "./firebase"

/** Stable bucket for records created before tenant isolation was introduced. */
export const LEGACY_TENANT_ID = "legacy-visualcns"

export type TenantScoped = { tenantId: string }

/** Resolve the signed-in user's tenant without trusting a caller-supplied id. */
export async function getCurrentTenantId(): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error("You must be signed in to access tenant data.")
  const snapshot = await getDoc(doc(db, "users", uid))
  const tenantId = snapshot.data()?.tenantId
  return typeof tenantId === "string" && tenantId.trim() ? tenantId : LEGACY_TENANT_ID
}

/** Add the current tenant to a record before writing it to Firestore. */
export async function withCurrentTenant<T extends Record<string, unknown>>(data: T): Promise<T & TenantScoped> {
  return { ...data, tenantId: await getCurrentTenantId() }
}
