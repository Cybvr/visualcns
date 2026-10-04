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
  /** Job title. The fields from here to doNotCall match Apollo's contact export. */
  title: string
  seniority: string
  departments: string
  email: string
  emailStatus: string
  /** Work phone. */
  phone: string
  mobilePhone: string
  linkedin: string
  /** Street address, e.g. from a Google Maps export. */
  address: string
  city: string
  state: string
  country: string
  company: string
  /** The kind of business, e.g. "Restaurant". Apollo calls it Industry. */
  category: string
  website: string
  companyLinkedin: string
  companyPhone: string
  employees: string
  keywords: string
  technologies: string
  annualRevenue: string
  totalFunding: string
  companyAddress: string
  companyCity: string
  companyState: string
  companyCountry: string
  /** Reviews as the source gives them, e.g. "4.6 (128)". Free text because sources write it differently. */
  reviews: string
  owner: string
  lists: string
  lastContacted: string
  doNotCall: boolean
  source: string
  value: number
  notes: string
  stage: LeadStage
  createdAt: string
  updatedAt: string
}

export type LeadFields = Omit<Lead, "id" | "agencyId" | "createdBy" | "createdAt" | "updatedAt">

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
            title: text(data.title),
            seniority: text(data.seniority),
            departments: text(data.departments),
            email: text(data.email),
            emailStatus: text(data.emailStatus),
            phone: text(data.phone),
            mobilePhone: text(data.mobilePhone),
            linkedin: text(data.linkedin),
            address: text(data.address),
            city: text(data.city),
            state: text(data.state),
            country: text(data.country),
            company: text(data.company),
            category: text(data.category),
            website: text(data.website),
            companyLinkedin: text(data.companyLinkedin),
            companyPhone: text(data.companyPhone),
            employees: text(data.employees),
            keywords: text(data.keywords),
            technologies: text(data.technologies),
            annualRevenue: text(data.annualRevenue),
            totalFunding: text(data.totalFunding),
            companyAddress: text(data.companyAddress),
            companyCity: text(data.companyCity),
            companyState: text(data.companyState),
            companyCountry: text(data.companyCountry),
            reviews: text(data.reviews),
            owner: text(data.owner),
            lists: text(data.lists),
            lastContacted: text(data.lastContacted),
            doNotCall: data.doNotCall === true,
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
export async function importLeads(uid: string, rows: LeadFields[], updates: Array<{ id: string; fields: LeadFields }> = []): Promise<void> {
  const total = rows.length + updates.length
  if (total === 0 || total > 400) throw new Error("Invalid import size")
  const agencyId = await getCurrentAgencyId()
  const now = new Date().toISOString()
  const batch = writeBatch(db)
  // Leads already saved get the file's values for any field the file fills in.
  // Stage and value stay as they are in the app, since those are your own pipeline.
  for (const { id, fields } of updates) {
    const changes: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (key === "stage" || key === "value") continue
      if ((typeof value === "string" && value) || value === true) changes[key] = value
    }
    batch.update(doc(db, COLLECTION_NAME, id), { ...changes, updatedAt: now })
  }
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
