import { collection, deleteDoc, deleteField, doc, getDocs, query, setDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"
import type { ReceivedMessage } from "@/components/dashboard/email/types"

// Received emails are read straight from Resend, which has no delete endpoint,
// so "deleting" one records a tombstone here and the inbox filters it out.
const COLLECTION_NAME = "hiddenReceivedEmails"

export type HiddenReceivedEmail = {
  receivedId: string
  companyId: string
  createdBy: string
  agencyId?: string
  hiddenAt: string
  trashedAt?: string
  message?: ReceivedMessage
}

export async function getHiddenReceivedEmails(companyId: string): Promise<HiddenReceivedEmail[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", await getCurrentAgencyId()), where("companyId", "==", companyId)))
  return snapshot.docs.map((item) => ({ ...item.data(), receivedId: item.data().receivedId || item.id } as HiddenReceivedEmail))
}

export async function getHiddenReceivedIds(companyId: string): Promise<string[]> {
  return (await getHiddenReceivedEmails(companyId)).map((item) => item.receivedId)
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

export async function trashReceivedEmail(params: { message: ReceivedMessage; companyId: string; createdBy: string; trashedAt: string }): Promise<void> {
  const { message, companyId, createdBy, trashedAt } = params
  await setDoc(doc(db, COLLECTION_NAME, `${companyId}_${message.id}`), {
    receivedId: message.id,
    companyId,
    createdBy,
    agencyId: await getCurrentAgencyId(),
    hiddenAt: trashedAt,
    trashedAt,
    message: {
      id: message.id,
      from: message.from,
      to: message.to,
      subject: message.subject,
      createdAt: message.createdAt,
    },
  }, { merge: true })
}

export async function restoreReceivedEmail(companyId: string, receivedId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, `${companyId}_${receivedId}`))
}

// Resend does not expose deletion of a received email. Keep its tombstone so
// the provider copy stays hidden after it leaves Bin.
export async function permanentlyHideReceivedEmail(companyId: string, receivedId: string): Promise<void> {
  await setDoc(doc(db, COLLECTION_NAME, `${companyId}_${receivedId}`), {
    trashedAt: deleteField(),
    message: deleteField(),
  }, { merge: true })
}
