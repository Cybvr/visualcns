import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore"

import { db } from "./firebase"
import { tsToMillis } from "./tasks"
import { getCurrentAgencyId } from "./agency-scope"

/**
 * A note left on a task. Anyone with access to the task can add one, so a
 * comment carries who wrote it rather than relying on the workspace it sits in.
 */
export interface Comment {
  id: string
  agencyId?: string
  /** Firestore id of the task this comment belongs to. */
  taskId: string
  /** The workspace the task belongs to, so the rules can scope reads. */
  companyId: string
  /** Firebase Auth uid of whoever wrote it. */
  authorUid: string
  /** Display name at the time of writing, so the thread reads right later. */
  authorName: string
  body: string
  createdAt?: Timestamp
}

const COLLECTION_NAME = "comments"

/** Every comment on a task, oldest first so the thread reads top to bottom. */
export async function getCommentsByTaskId(taskId: string): Promise<Comment[]> {
  if (!taskId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", await getCurrentAgencyId()), where("taskId", "==", taskId)))
  const comments = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Comment[]
  return comments.sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt))
}

export async function createComment(data: Omit<Comment, "id" | "createdAt">): Promise<string> {
  const agencyId = await getCurrentAgencyId()
  const ref = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    agencyId,
    createdAt: Timestamp.now(),
  })
  return ref.id
}

export async function deleteComment(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
