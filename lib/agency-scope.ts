import { doc, getDoc } from "firebase/firestore"

import { auth, db } from "./firebase"

export type AgencyScoped = { agencyId: string }

let cachedAgency: { uid: string; agencyId: string } | null = null

/** Prime agency resolution from the authenticated profile already in memory. */
export function primeCurrentAgencyId(uid: string, agencyId?: string): void {
  if (uid && agencyId?.trim()) cachedAgency = { uid, agencyId: agencyId.trim() }
}

/** Clear the agency cache when the Firebase session ends. */
export function clearCurrentAgencyId(): void {
  cachedAgency = null
}

/** Resolve the signed-in user's agency without trusting a caller-supplied id. */
export async function getCurrentAgencyId(): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error("You must be signed in to access agency data.")
  if (cachedAgency?.uid === uid) return cachedAgency.agencyId
  const snapshot = await getDoc(doc(db, "users", uid))
  const agencyId = snapshot.data()?.agencyId
  if (typeof agencyId !== "string" || !agencyId.trim()) throw new Error("Your account has no agency assigned.")
  cachedAgency = { uid, agencyId: agencyId.trim() }
  return agencyId.trim()
}

/** Add the current agency to a record before writing it to Firestore. */
export async function withCurrentAgency<T extends Record<string, unknown>>(data: T): Promise<T & AgencyScoped> {
  return { ...data, agencyId: await getCurrentAgencyId() }
}
