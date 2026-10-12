import { addDoc, collection, deleteDoc, doc, onSnapshot, query, Timestamp, updateDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"
import { tsToMillis } from "./tasks"

const COLLECTION_NAME = "campaignPeople"

export const PERSON_APPS = ["X", "Instagram", "TikTok", "YouTube", "Facebook", "Snapchat", "Threads", "LinkedIn"] as const
export const PERSON_TIERS = ["Big account", "Mid account", "Small account"] as const
export const PERSON_STATUSES = ["Contacted", "Agreed", "Posted", "Declined"] as const
export const PERSON_WAVES = ["", "1", "2", "3", "4", "5"] as const

/** One creator or account booked on a campaign. */
export interface CampaignPerson {
  id: string
  agencyId: string
  companyId: string
  projectId: string
  handle: string
  app: string
  followers: number
  tier: string
  wave: string
  status: string
  postLink: string
  /** In naira. 0 means they posted for free. */
  pay: number
  paid: boolean
  /** The post is marked as an ad. */
  labelled: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export type CampaignPersonInput = Pick<CampaignPerson, "handle" | "app" | "followers" | "tier" | "pay">

/** Live list of everyone on one campaign, oldest first so the order stays put while editing. */
export function watchCampaignPeople(projectId: string, onChange: (people: CampaignPerson[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(collection(db, COLLECTION_NAME), where("projectId", "==", projectId)),
    (snapshot) => onChange(
      snapshot.docs
        .map((d) => ({ ...(d.data() as Omit<CampaignPerson, "id">), id: d.id }))
        .sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt)),
    ),
    onError,
  )
}

export function normalizeHandle(value: string) {
  const handle = value.trim().replace(/^@+/, "")
  return handle ? `@${handle}` : ""
}

export async function addCampaignPeople(scope: { agencyId?: string; companyId: string; projectId: string }, people: CampaignPersonInput[]) {
  const agencyId = scope.agencyId || await getCurrentAgencyId()
  // Sequential so createdAt keeps the pasted order.
  for (const person of people) {
    const now = Timestamp.now()
    await addDoc(collection(db, COLLECTION_NAME), {
      agencyId,
      companyId: scope.companyId,
      projectId: scope.projectId,
      handle: normalizeHandle(person.handle),
      app: person.app,
      followers: person.followers,
      tier: person.tier,
      wave: "",
      status: "Contacted",
      postLink: "",
      pay: person.pay,
      paid: false,
      labelled: false,
      createdAt: now,
      updatedAt: now,
    })
  }
}

export async function updateCampaignPerson(id: string, patch: Partial<Omit<CampaignPerson, "id" | "agencyId" | "createdAt">>) {
  await updateDoc(doc(db, COLLECTION_NAME, id), { ...patch, updatedAt: Timestamp.now() })
}

export async function deleteCampaignPerson(id: string) {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}

/** Reads numbers like "12,500", "12.5k" or "1.2m". */
export function parseCount(value: string): number {
  const match = value.trim().toLowerCase().replace(/[,₦\s]/g, "").match(/^(\d+(?:\.\d+)?)([km])?$/)
  if (!match) return 0
  const multiplier = match[2] === "k" ? 1_000 : match[2] === "m" ? 1_000_000 : 1
  return Math.round(Number(match[1]) * multiplier)
}
