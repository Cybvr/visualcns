import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, Timestamp, updateDoc, where } from "firebase/firestore"

import { db } from "./firebase"
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

/** One written post, image, video or link kept with a campaign. */
export interface CampaignCreative {
  id: string
  agencyId: string
  companyId: string
  projectId: string
  title: string
  /** Empty for written posts. */
  url: string
  type: "image" | "video" | "link" | "text"
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

export async function addCampaignCreative(
  scope: { agencyId?: string; companyId: string; projectId: string },
  creative: Pick<CampaignCreative, "title" | "url" | "type"> & { kind: "content" | "media"; body?: string; status?: string; postedBy?: string; mediaUrl?: string; mediaType?: "image" | "video" },
) {
  const now = Timestamp.now()
  await addDoc(collection(db, COLLECTION_NAME), {
    agencyId: scope.agencyId || await getCurrentAgencyId(),
    companyId: scope.companyId,
    projectId: scope.projectId,
    status: "Draft",
    ...creative,
    createdAt: now,
    updatedAt: now,
  })
}

export async function updateCampaignCreative(id: string, patch: Partial<Pick<CampaignCreative, "title" | "status" | "body" | "postedBy" | "mediaUrl" | "mediaType">>) {
  await updateDoc(doc(db, COLLECTION_NAME, id), { ...patch, updatedAt: Timestamp.now() })
}

export async function deleteCampaignCreative(id: string) {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}

/** Every file link already kept in any of a company's campaigns, so old Drive media isn't moved twice. */
export async function getCompanyCampaignFileUrls(companyId: string): Promise<Set<string>> {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("companyId", "==", companyId)))
  return new Set(snapshot.docs.map((d) => String(d.data().url ?? "")).filter(Boolean))
}
