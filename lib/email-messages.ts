import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentTenantId } from "./tenancy"

const COLLECTION_NAME = "emailMessages"

export type EmailMessageKind = "transactional" | "marketing"
export type EmailMessageStatus = "sent" | "failed" | "scheduled"
export type EmailRecipient = {
  email: string
  name?: string
  companyId?: string
}

export type EmailMessageRecord = {
  id: string
  tenantId?: string
  companyId: string
  createdBy: string
  providerId: string
  to: string
  subject: string
  createdAt: string
  from?: string
  replyTo?: string
  bodyHtml?: string
  bodyText?: string
  recipients?: EmailRecipient[]
  projectId?: string
  projectName?: string
  documentType?: string
  documentId?: string
  documentTitle?: string
  companyName?: string
  messageKind?: EmailMessageKind
  status?: EmailMessageStatus
  /** ISO time a scheduled email is queued to send. Set when status is "scheduled". */
  scheduledAt?: string
}

export async function getEmailMessages(companyId: string): Promise<EmailMessageRecord[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", await getCurrentTenantId()), where("companyId", "==", companyId)))
  return snapshot.docs
    .map((message) => ({ ...(message.data() as Omit<EmailMessageRecord, "id">), id: message.id }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export async function getAllEmailMessages(): Promise<EmailMessageRecord[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", await getCurrentTenantId())))
  return snapshot.docs
    .map((message) => ({ ...(message.data() as Omit<EmailMessageRecord, "id">), id: message.id }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export async function saveEmailMessage(message: EmailMessageRecord): Promise<void> {
  const record = Object.fromEntries(Object.entries(message).filter(([, value]) => value !== undefined))
  record.tenantId = await getCurrentTenantId()
  await setDoc(doc(db, COLLECTION_NAME, message.id), record, { merge: true })
}

/** Persist just the delivery status—used to settle a scheduled send once it goes out. */
export async function updateEmailMessageStatus(id: string, status: EmailMessageStatus): Promise<void> {
  if (!id) return
  await setDoc(doc(db, COLLECTION_NAME, id), { status, tenantId: await getCurrentTenantId() }, { merge: true })
}
