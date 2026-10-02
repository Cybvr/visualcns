import { collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"
import { tsToMillis } from "./tasks"

const COLLECTION_NAME = "notes"

function normalizeDate(value: unknown, fallback = "") {
  const millis = tsToMillis(value)
  return millis > 0 ? new Date(millis).toISOString() : fallback
}

/** An agency note shared by the signed-in users in that agency. */
export type Note = {
  id: string
  agencyId: string
  createdBy: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

/** Live list of the agency's notes, most recently edited first. */
export function watchNotes(agencyId: string, onChange: (notes: Note[]) => void, onError: (error: Error) => void) {
  const notesQuery = query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId))
  return onSnapshot(
    notesQuery,
    (snapshot) => onChange(
      snapshot.docs
        .map((item) => {
          const data = item.data() as Partial<Omit<Note, "id">>
          const createdAt = normalizeDate(data.createdAt)
          const modifiedMillis = Math.max(tsToMillis(data.updatedAt), tsToMillis(data.createdAt))
          const updatedAt = modifiedMillis > 0 ? new Date(modifiedMillis).toISOString() : ""
          return {
            id: item.id,
            agencyId: typeof data.agencyId === "string" ? data.agencyId : "",
            createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
            title: typeof data.title === "string" ? data.title : "",
            body: typeof data.body === "string" ? data.body : "",
            createdAt,
            updatedAt,
          }
        })
        .sort((a, b) => tsToMillis(b.updatedAt) - tsToMillis(a.updatedAt)),
    ),
    onError,
  )
}

export async function createNote(uid: string): Promise<string> {
  const ref = doc(collection(db, COLLECTION_NAME))
  const now = new Date().toISOString()
  await setDoc(ref, { agencyId: await getCurrentAgencyId(), createdBy: uid, title: "", body: "", createdAt: now, updatedAt: now })
  return ref.id
}

export async function updateNote(id: string, changes: Pick<Note, "title" | "body">): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { ...changes, updatedAt: new Date().toISOString() })
}

export async function deleteNote(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}
