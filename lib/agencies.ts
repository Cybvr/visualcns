import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"

export type AgencyStatus = "trial" | "active" | "past_due" | "suspended"

export interface Agency {
  id: string
  name: string
  status: AgencyStatus
  plan: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
  subdomain?: string
  senderEmail?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  deletedAt?: Timestamp
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export async function getAgency(id?: string): Promise<Agency | null> {
  const agencyId = id || await getCurrentAgencyId()
  const snapshot = await getDoc(doc(db, "agencies", agencyId))
  return snapshot.exists() ? ({ ...(snapshot.data() as object), id: snapshot.id } as Agency) : null
}

export async function ensureCurrentAgency(name: string): Promise<Agency> {
  const agencyId = await getCurrentAgencyId()
  const ref = doc(db, "agencies", agencyId)
  const existing = await getDoc(ref)
  const now = Timestamp.now()
  const data = {
    name: (typeof existing.data()?.name === "string" && existing.data()?.name.trim()) || name.trim() || "VisualHQ workspace",
    status: (existing.data()?.status as AgencyStatus | undefined) || "trial",
    plan: existing.data()?.plan || "trial",
    createdAt: existing.data()?.createdAt || now,
    updatedAt: now,
  }
  await setDoc(ref, data, { merge: true })
  return { ...(existing.data() as object), ...data, id: agencyId } as Agency
}

export async function updateCurrentAgency(data: Partial<Omit<Agency, "id" | "createdAt">>): Promise<void> {
  const agencyId = await getCurrentAgencyId()
  await setDoc(doc(db, "agencies", agencyId), { ...data, updatedAt: Timestamp.now() }, { merge: true })
}
