import { deleteDoc, deleteField, doc, getDocs, collection, query, setDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import type { EmailTemplateSeed } from "./email-templates"
import { getCurrentAgencyId } from "./agency-scope"

const COLLECTION_NAME = "emailTemplates"

export type EmailTemplateRecord = EmailTemplateSeed & {
  /** Logical template id stored in the record; document id remains `id` in app state. */
  templateId?: string
  agencyId?: string
  companyId: string
  createdBy: string
  updatedAt: string
}

export async function getEmailTemplates(companyId: string, allAgencyTemplates = false): Promise<EmailTemplateRecord[]> {
  if (!companyId && !allAgencyTemplates) return []
  const agencyId = await getCurrentAgencyId()
  const templatesQuery = allAgencyTemplates
    ? query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId))
    : query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId), where("companyId", "==", companyId))
  const snapshot = await getDocs(templatesQuery)
  return snapshot.docs
    .map((item) => {
      const data = item.data() as EmailTemplateRecord
      return { ...data, id: item.id, templateId: (data.id as string | undefined) || item.id }
    })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export async function saveEmailTemplate(template: EmailTemplateRecord): Promise<void> {
  // Firestore rejects undefined values. A template without an image has
  // imageUrl undefined, so clear those fields instead (which also removes an
  // image that was taken out of an existing template).
  const { templateId, ...fields } = template
  const record = Object.fromEntries(Object.entries({ ...fields, id: templateId || template.id }).map(([key, value]) => [key, value === undefined ? deleteField() : value]))
  await setDoc(doc(db, COLLECTION_NAME, template.id), { ...record, agencyId: await getCurrentAgencyId() }, { merge: true })
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
