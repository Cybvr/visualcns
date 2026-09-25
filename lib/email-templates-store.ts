import { deleteDoc, doc, getDocs, collection, query, setDoc, where } from "firebase/firestore"

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
  await setDoc(doc(db, COLLECTION_NAME, `${template.companyId}__${template.id}`), { ...template, agencyId: await getCurrentAgencyId() }, { merge: true })
}

export async function deleteEmailTemplate(id: string, companyId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, `${companyId}__${id}`))
}
