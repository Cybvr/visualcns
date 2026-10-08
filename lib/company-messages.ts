import { addDoc, collection, onSnapshot, query, Timestamp, where } from "firebase/firestore"

import { db } from "./firebase"
import { tsToMillis } from "./tasks"

/**
 * One message in the conversation between a company's people and the agency.
 * Each company has a single shared thread, so everyone on the company side and
 * everyone at the agency sees the same messages.
 */
export interface CompanyMessage {
  id: string
  agencyId: string
  companyId: string
  authorUid: string
  authorName: string
  authorPhotoUrl?: string
  /** Which side of the conversation wrote it. */
  side: "agency" | "company"
  body: string
  createdAt?: Timestamp
}

const COLLECTION_NAME = "companyMessages"
export const MAX_MESSAGE_LENGTH = 2000

/** Live thread for a company, oldest first. Calls `onChange` on every update. */
export function subscribeToCompanyMessages(
  agencyId: string,
  companyId: string,
  onChange: (messages: CompanyMessage[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId), where("companyId", "==", companyId))
  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as CompanyMessage[]
      onChange(messages.sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt)))
    },
    onError,
  )
}

export async function sendCompanyMessage(data: Omit<CompanyMessage, "id" | "createdAt">): Promise<void> {
  const body = data.body.trim().slice(0, MAX_MESSAGE_LENGTH)
  if (!body) return
  const payload: Record<string, unknown> = { ...data, body, createdAt: Timestamp.now() }
  if (!data.authorPhotoUrl) delete payload.authorPhotoUrl
  await addDoc(collection(db, COLLECTION_NAME), payload)
}
