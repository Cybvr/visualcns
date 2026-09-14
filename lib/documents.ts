import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  updateDoc,
} from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { db, storage } from "./firebase"
import { getCurrentTenantId } from "./tenancy"
import type { Contract } from "./billing"
import { prepareImageForUpload } from "./image-upload"

export interface SharedDocument {
  id: string
  tenantId?: string
  title: string
  url: string
  description?: string
  companyId: string
  /** Optional project scope; unset documents appear at company level only. */
  projectId?: string
  sharedWith?: string
  sharedWithUserIds?: string[]
  createdAt?: Timestamp
  type?: "link" | "image" | "video" | "file" | "doc"
  thumbnailUrl?: string
}

export async function uploadFileToStorage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const preparedFile = await prepareImageForUpload(file)
  const path = `documents/${Date.now()}_${preparedFile.name}`
  const storageRef = ref(storage, path)
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, preparedFile)
    task.on(
      "state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject),
    )
  })
}

const COLLECTION_NAME = "documents"

/** Every shared document — used by the admin Drive page. */
export async function getDocuments(): Promise<SharedDocument[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", await getCurrentTenantId())))
  const docs = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as SharedDocument[]
  return docs.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
}

/** The documents a client can see: theirs plus anything shared with everyone. */
export async function getDocumentsForClient(companyId: string, userId: string): Promise<SharedDocument[]> {
  const queries = [
    getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", await getCurrentTenantId()), where("companyId", "==", companyId))),
    getDocs(query(collection(db, COLLECTION_NAME), where("sharedWithUserIds", "array-contains", userId))),
  ]
  const snapshots = await Promise.all(queries)
  const byId = new Map<string, SharedDocument>()
  snapshots.forEach((snapshot) => snapshot.docs.forEach((item) => byId.set(item.id, { ...(item.data() as object), id: item.id } as SharedDocument)))
  return [...byId.values()].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
}

export async function createDocument(data: Omit<SharedDocument, "id" | "createdAt">): Promise<string> {
  // Firestore rejects undefined field values, so drop any unset fields
  // (e.g. thumbnailUrl on a non-image upload) before writing.
  const cleaned = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
  const ref = await addDoc(collection(db, COLLECTION_NAME), {
    ...cleaned,
    tenantId: await getCurrentTenantId(),
    createdAt: Timestamp.now(),
  })
  return ref.id
}

export async function deleteDocument(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}

export async function updateDocumentSharing(id: string, sharedWithUserIds: string[]): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    sharedWithUserIds,
    sharedWith: sharedWithUserIds.length ? "Selected users" : "Private",
  })
}

/**
 * Contracts appear in Drive alongside shared files, so a client finds them
 * where they go looking for documents rather than only under Finance.
 */
export function contractsAsDocuments(contracts: Contract[]): SharedDocument[] {
  return contracts.map((contract) => ({
    id: `contract-${contract.id}`,
    title: contract.title,
    // Written agreements live on their own page; linked ones point at the file.
    url: contract.url || `/dashboard/contracts/${contract.id}`,
    description: contract.project || "",
    companyId: contract.companyId,
    type: "doc" as const,
    createdAt: contract.createdAt,
  }))
}

export async function setDocumentProject(id: string, projectId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { projectId })
}
