import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentTenantId } from "./tenancy"

export type TenantStatus = "trial" | "active" | "past_due" | "suspended"

export interface Tenant {
  id: string
  name: string
  status: TenantStatus
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

export async function getTenant(id?: string): Promise<Tenant | null> {
  const tenantId = id || await getCurrentTenantId()
  const snapshot = await getDoc(doc(db, "tenants", tenantId))
  return snapshot.exists() ? ({ ...(snapshot.data() as object), id: snapshot.id } as Tenant) : null
}

export async function ensureCurrentTenant(name: string): Promise<Tenant> {
  const tenantId = await getCurrentTenantId()
  const ref = doc(db, "tenants", tenantId)
  const existing = await getDoc(ref)
  const now = Timestamp.now()
  const data = {
    name: (typeof existing.data()?.name === "string" && existing.data()?.name.trim()) || name.trim() || "VisualHQ workspace",
    status: (existing.data()?.status as TenantStatus | undefined) || "trial",
    plan: existing.data()?.plan || "trial",
    createdAt: existing.data()?.createdAt || now,
    updatedAt: now,
  }
  await setDoc(ref, data, { merge: true })
  return { ...(existing.data() as object), ...data, id: tenantId } as Tenant
}

export async function updateCurrentTenant(data: Partial<Omit<Tenant, "id" | "createdAt">>): Promise<void> {
  const tenantId = await getCurrentTenantId()
  await setDoc(doc(db, "tenants", tenantId), { ...data, updatedAt: Timestamp.now() }, { merge: true })
}
