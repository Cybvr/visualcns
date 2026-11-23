import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"
import { tsToMillis } from "./tasks"

/** Notes are documents: the editor reads and writes the companyDocuments collection. */
const COLLECTION_NAME = "companyDocuments"
/** Where notes used to live. Anything left there is moved into documents once. */
const LEGACY_COLLECTION = "notes"

function normalizeDate(value: unknown, fallback = "") {
  const millis = tsToMillis(value)
  return millis > 0 ? new Date(millis).toISOString() : fallback
}

/** A document as the writing editor sees it: a title and a rich text body. */
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

const moved = new Set<string>()

/**
 * Copies every note in the old notes collection into documents with the same
 * id, then deletes the note. Runs once per agency per page load; safe to repeat.
 */
export async function moveLegacyNotes(agencyId: string): Promise<void> {
  if (!agencyId || moved.has(agencyId)) return
  moved.add(agencyId)
  const snapshot = await getDocs(query(collection(db, LEGACY_COLLECTION), where("agencyId", "==", agencyId)))
  for (const item of snapshot.docs) {
    const data = item.data() as Partial<Omit<Note, "id">>
    const target = doc(db, COLLECTION_NAME, item.id)
    const existing = await getDoc(target).catch(() => null)
    if (!existing?.exists()) {
      const created = tsToMillis(data.createdAt)
      const updated = Math.max(tsToMillis(data.updatedAt), created)
      await setDoc(target, {
        agencyId,
        companyId: typeof data.companyId === "string" ? data.companyId : "",
        client: "",
        createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
        title: typeof data.title === "string" ? data.title : "",
        body: noteBodyHtml(typeof data.body === "string" ? data.body : ""),
        kind: "other",
        status: "draft",
        shareEnabled: data.shareEnabled === true,
        createdAt: created > 0 ? Timestamp.fromMillis(created) : Timestamp.now(),
        updatedAt: updated > 0 ? Timestamp.fromMillis(updated) : Timestamp.now(),
      })
    }
    await deleteDoc(item.ref)
  }
}

function watchScopedNotes(agencyId: string, companyId: string | undefined, onChange: (notes: Note[]) => void, onError: (error: Error) => void) {
  void moveLegacyNotes(agencyId).catch((error) => console.error("Moving notes into documents failed", error))
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

/** Live list of every document in the agency, newest first. */
export function watchNotes(agencyId: string, onChange: (notes: Note[]) => void, onError: (error: Error) => void) {
  return watchScopedNotes(agencyId, undefined, onChange, onError)
}

/** A blank document, opened straight in the editor. */
export async function createNote(uid: string, companyId?: string): Promise<string> {
  const ref = doc(collection(db, COLLECTION_NAME))
  const now = Timestamp.now()
  await setDoc(ref, {
    agencyId: await getCurrentAgencyId(),
    companyId: companyId || "",
    client: "",
    createdBy: uid,
    title: "",
    body: "",
    kind: "other",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateNote(id: string, changes: Pick<Note, "title" | "body">): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { ...changes, updatedAt: Timestamp.now() })
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
  await updateDoc(doc(db, COLLECTION_NAME, id), { shareEnabled, updatedAt: Timestamp.now() })
}
