import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentTenantId } from "./tenancy"

const COLLECTION_NAME = "emailLists"

export type EmailContactList = {
  id: string
  tenantId?: string
  companyId: string
  createdBy: string
  name: string
  contactEmails: string[]
  updatedAt: string
}

export async function getEmailLists(companyId: string): Promise<EmailContactList[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", await getCurrentTenantId()), where("companyId", "==", companyId)))
  return snapshot.docs
    .map((item) => ({ ...(item.data() as Omit<EmailContactList, "id">), id: item.id }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export async function saveEmailList(list: EmailContactList): Promise<void> {
  await setDoc(doc(db, COLLECTION_NAME, list.id), { ...list, tenantId: await getCurrentTenantId() }, { merge: true })
}

export async function deleteEmailList(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
