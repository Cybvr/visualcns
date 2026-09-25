import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"

const COLLECTION_NAME = "emailLists"

export type EmailContactList = {
  id: string
  agencyId?: string
  companyId: string
  createdBy: string
  name: string
  contactEmails: string[]
  updatedAt: string
}

export async function getEmailLists(companyId: string): Promise<EmailContactList[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", await getCurrentAgencyId()), where("companyId", "==", companyId)))
  return snapshot.docs
    .map((item) => ({ ...(item.data() as Omit<EmailContactList, "id">), id: item.id }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export async function saveEmailList(list: EmailContactList): Promise<void> {
  await setDoc(doc(db, COLLECTION_NAME, list.id), { ...list, agencyId: await getCurrentAgencyId() }, { merge: true })
}

export async function deleteEmailList(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
