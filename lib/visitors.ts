import { collection, doc, limit, onSnapshot, orderBy, query, setDoc, Timestamp, updateDoc, where } from "firebase/firestore"

import { db } from "./firebase"

/**
 * A person who signed in at a client's front desk. Created only by the
 * /api/visitors route (the tablet has no login), read and signed out by the
 * agency and by the client's own staff.
 */
export interface Visitor {
  id: string
  agencyId: string
  companyId: string
  name: string
  email?: string
  phone?: string
  /** Who they came to see, as picked on the tablet. */
  hostName?: string
  hostUid?: string
  reason?: string
  status: "on_site" | "signed_out"
  signedInAt: Timestamp
  signedOutAt?: Timestamp | null
  /** Whether the host was emailed that their visitor arrived. */
  hostNotified?: boolean
}

/** The front-desk tablet link for one company. The key keeps strangers from signing people in. */
export interface VisitorKiosk {
  agencyId: string
  companyId: string
  enabled: boolean
  key: string
  updatedAt?: Timestamp
}

const VISITORS = "visitors"
const KIOSKS = "visitorKiosks"

/** Live list of a company's most recent visitors, newest first. */
export function watchVisitors(agencyId: string, companyId: string, onChange: (visitors: Visitor[]) => void, onError: (error: Error) => void) {
  const visitorsQuery = query(
    collection(db, VISITORS),
    where("agencyId", "==", agencyId),
    where("companyId", "==", companyId),
    orderBy("signedInAt", "desc"),
    limit(200),
  )
  return onSnapshot(
    visitorsQuery,
    (snapshot) => onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Visitor)),
    onError,
  )
}

export async function signOutVisitor(id: string) {
  await updateDoc(doc(db, VISITORS, id), { status: "signed_out", signedOutAt: Timestamp.now(), updatedAt: Timestamp.now() })
}

export function watchKiosk(companyId: string, onChange: (kiosk: VisitorKiosk | null) => void, onError: (error: Error) => void) {
  return onSnapshot(
    doc(db, KIOSKS, companyId),
    (snapshot) => onChange(snapshot.exists() ? (snapshot.data() as VisitorKiosk) : null),
    onError,
  )
}

function newKioskKey() {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/** Turns the tablet link on or off. Turning it on the first time makes its key. */
export async function setKioskEnabled(agencyId: string, companyId: string, enabled: boolean, current: VisitorKiosk | null) {
  await setDoc(doc(db, KIOSKS, companyId), {
    agencyId,
    companyId,
    enabled,
    key: current?.key || newKioskKey(),
    updatedAt: Timestamp.now(),
  })
}

/** A new key breaks the old link, e.g. when a tablet goes missing. */
export async function resetKioskKey(agencyId: string, companyId: string) {
  await setDoc(doc(db, KIOSKS, companyId), { agencyId, companyId, enabled: true, key: newKioskKey(), updatedAt: Timestamp.now() })
}

export function kioskUrl(slug: string, key: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  return `${origin}/${encodeURIComponent(slug)}/sign-in?key=${encodeURIComponent(key)}`
}
