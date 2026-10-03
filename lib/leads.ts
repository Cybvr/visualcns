import { collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"
import { tsToMillis } from "./tasks"

const COLLECTION_NAME = "leads"

/** The sales pipeline, left to right. A lead only becomes a client once it is won. */
export const LEAD_STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const

export type LeadStage = (typeof LEAD_STAGES)[number]["value"]

const STAGE_VALUES = new Set<string>(LEAD_STAGES.map((stage) => stage.value))

/** A potential client the agency is working on. Not a user or a client until it is won. */
export type Lead = {
  id: string
  agencyId: string
  createdBy: string
  name: string
  company: string
  email: string
  phone: string
  /** Street address, e.g. from a Google Maps export. */
  address: string
  /** The kind of business, e.g. "Restaurant". */
  category: string
  /** Reviews as the source gives them, e.g. "4.6 (128)". Free text because sources write it differently. */
  reviews: string
  source: string
  value: number
  notes: string
  stage: LeadStage
  createdAt: string
  updatedAt: string
}

export type LeadFields = Pick<Lead, "name" | "company" | "email" | "phone" | "address" | "category" | "reviews" | "source" | "value" | "notes" | "stage">

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

/** Live list of the agency's leads, most recently changed first. */
export function watchLeads(agencyId: string, onChange: (leads: Lead[]) => void, onError: (error: Error) => void) {
  const leadsQuery = query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId))
  return onSnapshot(
    leadsQuery,
    (snapshot) => onChange(
      snapshot.docs
        .map((item) => {
          const data = item.data() as Record<string, unknown>
          const createdMillis = tsToMillis(data.createdAt)
          const updatedMillis = Math.max(tsToMillis(data.updatedAt), createdMillis)
          const stage = text(data.stage)
          return {
            id: item.id,
            agencyId: text(data.agencyId),
            createdBy: text(data.createdBy),
            name: text(data.name),
            company: text(data.company),
            email: text(data.email),
            phone: text(data.phone),
            address: text(data.address),
            category: text(data.category),
            reviews: text(data.reviews),
            source: text(data.source),
            value: typeof data.value === "number" && Number.isFinite(data.value) ? data.value : 0,
            notes: text(data.notes),
            stage: (STAGE_VALUES.has(stage) ? stage : "new") as LeadStage,
            createdAt: createdMillis > 0 ? new Date(createdMillis).toISOString() : "",
            updatedAt: updatedMillis > 0 ? new Date(updatedMillis).toISOString() : "",
          }
        })
        .sort((a, b) => tsToMillis(b.updatedAt) - tsToMillis(a.updatedAt)),
    ),
    onError,
  )
}

export async function createLead(uid: string, fields: LeadFields): Promise<string> {
  const ref = doc(collection(db, COLLECTION_NAME))
  const now = new Date().toISOString()
  await setDoc(ref, { ...fields, agencyId: await getCurrentAgencyId(), createdBy: uid, createdAt: now, updatedAt: now })
  return ref.id
}

/** Adds one reviewed CSV file as a single all-or-nothing import. */
export async function importLeads(uid: string, rows: LeadFields[]): Promise<void> {
  if (rows.length === 0 || rows.length > 400) throw new Error("Invalid import size")
  const agencyId = await getCurrentAgencyId()
  const now = new Date().toISOString()
  const batch = writeBatch(db)
  for (const fields of rows) {
    batch.set(doc(collection(db, COLLECTION_NAME)), {
      ...fields,
      agencyId,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    })
  }
  await batch.commit()
}

export async function updateLead(id: string, changes: Partial<LeadFields>): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { ...changes, updatedAt: new Date().toISOString() })
}

export async function deleteLead(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
