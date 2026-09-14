import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentTenantId } from "./tenancy"

const COLLECTION_NAME = "emailDrafts"

export type EmailDraftRecord = {
  id: string
  tenantId?: string
  companyId: string
  createdBy: string
  to?: string
  listId?: string
  subject?: string
  body?: string
  messageKind?: "transactional" | "marketing"
  /** The compose context (recipient, document, cta) so a draft reopens where it was started. */
  context?: Record<string, unknown> | null
  updatedAt: string
}

export async function getEmailDrafts(companyId: string): Promise<EmailDraftRecord[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", await getCurrentTenantId()), where("companyId", "==", companyId)))
  return snapshot.docs
    .map((item) => ({ ...(item.data() as Omit<EmailDraftRecord, "id">), id: item.id }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export async function saveEmailDraft(draft: EmailDraftRecord): Promise<void> {
  const record = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== undefined))
  record.tenantId = await getCurrentTenantId()
  await setDoc(doc(db, COLLECTION_NAME, draft.id), record, { merge: true })
}

export async function deleteEmailDraft(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
