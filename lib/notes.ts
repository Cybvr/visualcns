import { collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore"

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
  companyId?: string
  createdBy: string
  title: string
  body: string
  /** Readable without an account at /share/notes/{id} once turned on. */
  shareEnabled?: boolean
  createdAt: string
  updatedAt: string
}

function toNote(id: string, data: Partial<Omit<Note, "id">>): Note {
  const createdAt = normalizeDate(data.createdAt)
  const modifiedMillis = Math.max(tsToMillis(data.updatedAt), tsToMillis(data.createdAt))
  const updatedAt = modifiedMillis > 0 ? new Date(modifiedMillis).toISOString() : ""
  return {
    id,
    agencyId: typeof data.agencyId === "string" ? data.agencyId : "",
    companyId: typeof data.companyId === "string" ? data.companyId : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    title: typeof data.title === "string" ? data.title : "",
    body: typeof data.body === "string" ? data.body : "",
    shareEnabled: data.shareEnabled === true,
    createdAt,
    updatedAt,
  }
}

function watchScopedNotes(agencyId: string, companyId: string | undefined, onChange: (notes: Note[]) => void, onError: (error: Error) => void) {
  const notesQuery = companyId
    ? query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId), where("companyId", "==", companyId))
    : query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId))
  return onSnapshot(
    notesQuery,
    (snapshot) => onChange(
      snapshot.docs
        .map((item) => toNote(item.id, item.data() as Partial<Omit<Note, "id">>))
        .sort((a, b) => tsToMillis(b.updatedAt) - tsToMillis(a.updatedAt)),
    ),
    onError,
  )
}

/** Live list of agency-wide notes, excluding notes filed against a company. */
export function watchNotes(agencyId: string, onChange: (notes: Note[]) => void, onError: (error: Error) => void) {
  return watchScopedNotes(agencyId, undefined, (notes) => onChange(notes.filter((note) => !note.companyId)), onError)
}

/** Live list of notes belonging to one company. */
export function watchCompanyNotes(agencyId: string, companyId: string, onChange: (notes: Note[]) => void, onError: (error: Error) => void) {
  return watchScopedNotes(agencyId, companyId, onChange, onError)
}

export async function createNote(uid: string, companyId?: string): Promise<string> {
  const ref = doc(collection(db, COLLECTION_NAME))
  const now = new Date().toISOString()
  await setDoc(ref, {
    agencyId: await getCurrentAgencyId(),
    ...(companyId ? { companyId } : {}),
    createdBy: uid,
    title: "",
    body: "",
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateNote(id: string, changes: Pick<Note, "title" | "body">): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { ...changes, updatedAt: new Date().toISOString() })
}

export async function deleteNote(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}

const CHECK_LINE = /^\s*-\s*\[([ xX])\]\s?(.*)$/

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Notes saved before the rich editor are plain text, with "- [ ] item" lines for checklists. */
export function noteBodyHtml(body: string) {
  if (!body.trim() || /^\s*</.test(body)) return body
  let html = ""
  let open = false
  for (const line of body.split("\n")) {
    const match = line.match(CHECK_LINE)
    if (match) {
      if (!open) html += '<ul data-type="taskList">'
      open = true
      const checked = match[1].toLowerCase() === "x"
      html += `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox"${checked ? " checked" : ""}><span></span></label><div><p>${escapeHtml(match[2])}</p></div></li>`
      continue
    }
    if (open) html += "</ul>"
    open = false
    if (line.trim()) html += `<p>${escapeHtml(line)}</p>`
  }
  return open ? html + "</ul>" : html
}

/** A note opened from its public link; null unless sharing is on. */
export async function getSharedNote(id: string): Promise<Note | null> {
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, id))
  if (!snapshot.exists()) return null
  const note = toNote(snapshot.id, snapshot.data() as Partial<Omit<Note, "id">>)
  return note.shareEnabled ? note : null
}

export async function setNoteShared(id: string, shareEnabled: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { shareEnabled })
}
