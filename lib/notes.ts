import { collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"

const COLLECTION_NAME = "notes"

/** A private note. Only the person who wrote it can read or change it. */
export type Note = {
  id: string
  agencyId: string
  createdBy: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

/** Live list of someone's notes, most recently edited first. */
export function watchNotes(agencyId: string, uid: string, onChange: (notes: Note[]) => void, onError: (error: Error) => void) {
  const notesQuery = query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId), where("createdBy", "==", uid))
  return onSnapshot(
    notesQuery,
    (snapshot) => onChange(
      snapshot.docs
        .map((item) => ({ ...(item.data() as Omit<Note, "id">), id: item.id }))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
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
