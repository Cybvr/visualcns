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
  /** In `currency`. 0 means they posted for free. */
  pay: number
  /** USD, NGN, GBP or EUR. Older rows have none and were entered in naira. */
  currency?: string
  paid: boolean
  /** The post is marked as an ad. */
  labelled: boolean
  /** What they make content about, e.g. Engineering. */
  category?: string
  /** How much their audience matches the client's, 0 to 100. */
  overlap?: number
  /** False for a suggested creator the client hasn't added yet. Older rows have no value and are on the roster. */
  onRoster?: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export type CampaignPersonInput = Pick<CampaignPerson, "handle" | "app" | "followers" | "tier" | "pay"> & Partial<Pick<CampaignPerson, "category" | "overlap" | "onRoster" | "currency">>

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
      currency: person.currency ?? "USD",
      paid: false,
      labelled: false,
      category: person.category ?? "",
      overlap: person.overlap ?? 0,
      onRoster: person.onRoster ?? true,
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

export const onRoster = (person: Pick<CampaignPerson, "onRoster">) => person.onRoster !== false

/** Short follower counts: 950, 15k, 1.2m. */
export function compactCount(value: number) {
  if (!value) return "—"
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}m`
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(value >= 100_000 ? 0 : 1))}k`
  return String(value)
}

export const PAY_CURRENCIES = ["USD", "NGN", "GBP", "EUR"] as const

export const payCurrency = (person: Pick<CampaignPerson, "currency">) => person.currency || "NGN"

/** Whole amounts with their symbol: $500, ₦50,000. */
export function formatPay(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString("en")}`
  }
}

export const PERSON_CATEGORIES = [
  "Fashion",
  "Beauty",
  "Lifestyle",
  "E-commerce",
  "Food",
  "Travel",
  "Fitness",
  "Health",
  "Tech",
  "Gaming",
  "Music",
  "Comedy",
  "Entertainment",
  "Sports",
  "Parenting",
  "Finance",
  "Business",
  "Education",
  "Automotive",
] as const

const PROFILE_URLS: Record<string, (name: string) => string> = {
  X: (name) => `https://x.com/${name}`,
  Instagram: (name) => `https://www.instagram.com/${name}`,
  TikTok: (name) => `https://www.tiktok.com/@${name}`,
  YouTube: (name) => `https://www.youtube.com/@${name}`,
  Facebook: (name) => `https://www.facebook.com/${name}`,
  Snapchat: (name) => `https://www.snapchat.com/add/${name}`,
  Threads: (name) => `https://www.threads.net/@${name}`,
  LinkedIn: (name) => `https://www.linkedin.com/in/${name}`,
}

/** The creator's profile page on their app, or "" for an app we don't know. */
export function profileUrl(person: Pick<CampaignPerson, "handle" | "app">) {
  const name = encodeURIComponent(person.handle.replace(/^@+/, ""))
  return name ? PROFILE_URLS[person.app]?.(name) ?? "" : ""
}
