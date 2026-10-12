import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, Timestamp, updateDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"
import { tsToMillis } from "./tasks"

const COLLECTION_NAME = "campaignCreatives"

export const CREATIVE_STATUSES = ["Draft", "In review", "Changes needed", "Approved"] as const

/** One image, video or link kept with a campaign. */
export interface CampaignCreative {
  id: string
  agencyId: string
  companyId: string
  projectId: string
  title: string
  url: string
  type: "image" | "video" | "link"
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
  creative: Pick<CampaignCreative, "title" | "url" | "type"> & { kind: "content" | "media" },
) {
  const now = Timestamp.now()
  await addDoc(collection(db, COLLECTION_NAME), {
    agencyId: scope.agencyId || await getCurrentAgencyId(),
    companyId: scope.companyId,
    projectId: scope.projectId,
    ...creative,
    status: "Draft",
    createdAt: now,
    updatedAt: now,
  })
}

export async function updateCampaignCreative(id: string, patch: Partial<Pick<CampaignCreative, "title" | "status">>) {
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
