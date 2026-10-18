import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, Timestamp, updateDoc, where, writeBatch } from "firebase/firestore"

import { db } from "./firebase"
import type { PostPublish } from "./social"
import { getCurrentAgencyId } from "./agency-scope"
import { tsToMillis } from "./tasks"

const COLLECTION_NAME = "campaignCreatives"

export const READY_FOR_REVIEW = "Ready for your review"
export const CREATIVE_STATUSES = ["Draft", READY_FOR_REVIEW, "Changes requested", "Approved"] as const

// Earlier names for the same statuses, so older posts read the same way.
const OLD_STATUSES: Record<string, string> = { "In review": READY_FOR_REVIEW, "Changes needed": "Changes requested" }

export function creativeStatus(creative: Pick<CampaignCreative, "status">) {
  return OLD_STATUSES[creative.status] ?? creative.status ?? "Draft"
}

/** One written post, media file, link or media folder kept with a campaign. */
export interface CampaignCreative {
  id: string
  agencyId: string
  companyId: string
  projectId: string
  title: string
  /** Empty for written posts. */
  url: string
  type: "image" | "video" | "link" | "text" | "folder"
  /** Media folders are flat; an empty value keeps the item in All media. */
  folderId?: string
  /** Who posts it: the client themselves ("Founder") or the creators ("Roster"). */
  postedBy?: string
  /** An image or video shown with a written post. */
  mediaUrl?: string
  mediaType?: "image" | "video"
  /** The words of a written post or hook. */
  body?: string
  /** Content is work made for the campaign and reviewed; media is raw files kept with it. Older rows have no kind and count as content. */
  kind?: "content" | "media"
  status: string
  /** Set by the server once an approved post is scheduled or posted to social accounts. */
  publish?: PostPublish
  /** A post the client wrote on the Social page, waiting for the agency: where and when they asked for it to go. */
  request?: { accountIds: string[]; scheduledAt?: string; by?: string }
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

/** Live list of a campaign's creatives, newest first. */
export function watchCampaignCreatives(projectId: string, onChange: (creatives: CampaignCreative[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(collection(db, COLLECTION_NAME), where("projectId", "==", projectId)),
    (snapshot) => onChange(
      snapshot.docs
        .map((d) => ({ ...(d.data() as Omit<CampaignCreative, "id">), id: d.id }))
        .sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt)),
    ),
    onError,
  )
}

/** Live content and media across every campaign owned by one company. */
export function watchCompanyCampaignCreatives(companyId: string, onChange: (creatives: CampaignCreative[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(collection(db, COLLECTION_NAME), where("companyId", "==", companyId)),
    (snapshot) => onChange(
      snapshot.docs
        .map((d) => ({ ...(d.data() as Omit<CampaignCreative, "id">), id: d.id }))
        .sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt)),
    ),
    onError,
  )
}

/** The agency's newest written posts across every campaign, newest first. */
export async function getLatestCampaignPosts(count = 4): Promise<CampaignCreative[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", await getCurrentAgencyId()), where("type", "==", "text")))
  return snapshot.docs
    .map((d) => ({ ...(d.data() as Omit<CampaignCreative, "id">), id: d.id }))
    .sort((a, b) => (tsToMillis(b.updatedAt) || tsToMillis(b.createdAt)) - (tsToMillis(a.updatedAt) || tsToMillis(a.createdAt)))
    .slice(0, count)
}

export async function addCampaignCreative(
  scope: { agencyId?: string; companyId: string; projectId: string },
  creative: Pick<CampaignCreative, "title" | "url" | "type"> & { kind: "content" | "media"; folderId?: string; body?: string; status?: string; postedBy?: string; mediaUrl?: string; mediaType?: "image" | "video" },
) {
  const now = Timestamp.now()
  // Firestore refuses undefined values, e.g. no folder for a file in All media, so leave those fields out.
  const fields = Object.fromEntries(Object.entries(creative).filter(([, value]) => value !== undefined))
  await addDoc(collection(db, COLLECTION_NAME), {
    agencyId: scope.agencyId || await getCurrentAgencyId(),
    companyId: scope.companyId,
    projectId: scope.projectId,
    status: "Draft",
    ...fields,
    createdAt: now,
    updatedAt: now,
  })
}

export async function updateCampaignCreative(id: string, patch: Partial<Pick<CampaignCreative, "title" | "status" | "body" | "postedBy" | "mediaUrl" | "mediaType" | "folderId">>) {
  await updateDoc(doc(db, COLLECTION_NAME, id), { ...patch, updatedAt: Timestamp.now() })
}

export async function deleteCampaignCreative(id: string) {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}

/** Remove a folder without removing its media; its contents return to All media. */
export async function deleteCampaignMediaFolder(projectId: string, folderId: string) {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("projectId", "==", projectId)))
  const batch = writeBatch(db)
  const now = Timestamp.now()
  for (const item of snapshot.docs) {
    if (item.id !== folderId && item.data().folderId === folderId) batch.update(item.ref, { folderId: "", updatedAt: now })
  }
  batch.delete(doc(db, COLLECTION_NAME, folderId))
  await batch.commit()
}

/** Every file link already kept in any of a company's campaigns, so old Drive media isn't moved twice. */
export async function getCompanyCampaignFileUrls(companyId: string): Promise<Set<string>> {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("companyId", "==", companyId)))
  return new Set(snapshot.docs.map((d) => String(d.data().url ?? "")).filter(Boolean))
}
