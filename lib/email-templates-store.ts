import { deleteDoc, deleteField, doc, getDocs, collection, query, setDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import type { EmailTemplateSeed } from "./email-templates"
import { getCurrentAgencyId } from "./agency-scope"

const COLLECTION_NAME = "emailTemplates"

export type EmailTemplateRecord = EmailTemplateSeed & {
  agencyId?: string
  companyId: string
  createdBy: string
  updatedAt: string
}

export async function getEmailTemplates(companyId: string): Promise<EmailTemplateRecord[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", await getCurrentAgencyId()), where("companyId", "==", companyId)))
  return snapshot.docs
    .map((item) => ({ ...(item.data() as Omit<EmailTemplateRecord, "id">), id: (item.data().id as string | undefined) || item.id }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export async function saveEmailTemplate(template: EmailTemplateRecord): Promise<void> {
  // Firestore rejects undefined values. A template without an image has
  // imageUrl undefined, so clear those fields instead (which also removes an
  // image that was taken out of an existing template).
  const record = Object.fromEntries(Object.entries(template).map(([key, value]) => [key, value === undefined ? deleteField() : value]))
  await setDoc(doc(db, COLLECTION_NAME, `${template.companyId}__${template.id}`), { ...record, agencyId: await getCurrentAgencyId() }, { merge: true })
}

export async function deleteEmailTemplate(id: string, companyId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, `${companyId}__${id}`))
}
