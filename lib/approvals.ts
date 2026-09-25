import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"
import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"

export type ApprovalStatus = "approved" | "changes-requested"

export type Approval = {
  deliverableId: string
  agencyId?: string
  companyId: string
  status: ApprovalStatus
  note: string
  byEmail: string
  updatedAt: Timestamp
}

const COLLECTION_NAME = "approvals"

export async function getApproval(deliverableId: string): Promise<Approval | null> {
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, deliverableId))
  if (!snapshot.exists()) return null
  return snapshot.data() as Approval
}

export async function setApproval(
  data: Omit<Approval, "updatedAt">,
): Promise<void> {
  await setDoc(doc(db, COLLECTION_NAME, data.deliverableId), {
    ...data,
    agencyId: await getCurrentAgencyId(),
    updatedAt: Timestamp.now(),
  })
}
