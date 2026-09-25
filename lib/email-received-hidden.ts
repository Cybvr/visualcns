import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"

// Received emails are read straight from Resend, which has no delete endpoint,
// so "deleting" one records a tombstone here and the inbox filters it out.
const COLLECTION_NAME = "hiddenReceivedEmails"

export async function getHiddenReceivedIds(companyId: string): Promise<string[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", await getCurrentAgencyId()), where("companyId", "==", companyId)))
  return snapshot.docs.map((item) => (item.data() as { receivedId?: string }).receivedId || item.id)
}

export async function hideReceivedEmail(params: { receivedId: string; companyId: string; createdBy: string }): Promise<void> {
  if (!params.receivedId) return
  await setDoc(doc(db, COLLECTION_NAME, `${params.companyId}_${params.receivedId}`), {
    receivedId: params.receivedId,
    companyId: params.companyId,
    createdBy: params.createdBy,
    agencyId: await getCurrentAgencyId(),
    hiddenAt: new Date().toISOString(),
  })
}
