import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, setDoc, Timestamp, updateDoc, where } from "firebase/firestore"

import { db } from "./firebase"
import type { VisitorBilling } from "./visitor-billing"

/**
 * A person who signed in at a client's front desk. Created only by the
 * /api/visitors route (the tablet has no login), read and signed out by the
 * agency and by the client's own staff.
 */
export interface Visitor {
  id: string
  agencyId: string
  companyId: string
  /** The client's name when they signed in, for lists that span every client. */
  companyName?: string
  name: string
  /** The company the visitor is from, if they gave one. */
  visitorCompany?: string
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
  /** Signed in at the front-desk tablet or on their own phone from the QR code. */
  via?: "tablet" | "phone"
  /** The NDA or terms they agreed to, with the exact text, if the company asks for one. */
  agreement?: { title: string; text: string; signedName: string; agreedAt: Timestamp } | null
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

/** Every visit a company has had, newest first. For the CSV export, which isn't capped like the live list. */
export async function getAllVisitors(agencyId: string, companyId: string): Promise<Visitor[]> {
  const snapshot = await getDocs(query(
    collection(db, VISITORS),
    where("agencyId", "==", agencyId),
    where("companyId", "==", companyId),
    orderBy("signedInAt", "desc"),
  ))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Visitor)
}

function csvDate(value: Timestamp | null | undefined) {
  if (!value) return ""
  const date = value.toDate()
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function csvCell(value: string) {
  // A cell starting with = + - @ runs as a formula in Excel, so neutralise it.
  // Plain phone numbers like +234 803 000 0000 are left alone.
  const phone = /^\+?[\d\s()-]+$/.test(value)
  const safe = !phone && /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Visits as a CSV that opens cleanly in Excel and Google Sheets. */
export function visitorsCsv(visitors: Visitor[]): string {
  const header = ["Name", "Company", "Phone", "Email", "Visiting", "Purpose", "Signed in", "Signed out", "Signed in on", "Agreed to", "Agreed at"]
  const rows = visitors.map((visitor) => [
    visitor.name,
    visitor.visitorCompany ?? "",
    visitor.phone ?? "",
    visitor.email ?? "",
    visitor.hostName ?? "",
    visitor.reason ?? "",
    csvDate(visitor.signedInAt),
    csvDate(visitor.signedOutAt),
    visitor.via === "phone" ? "Phone" : "Tablet",
    visitor.agreement?.title ?? "",
    csvDate(visitor.agreement?.agreedAt),
  ])
  // The byte-order mark makes Excel read names with accents correctly.
  return "\ufeff" + [header, ...rows].map((row) => row.map((cell) => csvCell(String(cell ?? ""))).join(",")).join("\r\n")
}

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

/** Live list of every visitor across the agency's clients, newest first. Admins only. */
export function watchAgencyVisitors(agencyId: string, onChange: (visitors: Visitor[]) => void, onError: (error: Error) => void) {
  const visitorsQuery = query(collection(db, VISITORS), where("agencyId", "==", agencyId), orderBy("signedInAt", "desc"), limit(500))
  return onSnapshot(
    visitorsQuery,
    (snapshot) => onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Visitor)),
    onError,
  )
}

type Stamp = { toDate: () => Date } | null | undefined

export function visitTime(value: Stamp) {
  return value ? value.toDate().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : ""
}

export function visitDay(value: Stamp) {
  if (!value) return ""
  const date = value.toDate()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
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

/** The site's trial and subscription, written only by the server. */
export function watchVisitorBilling(companyId: string, onChange: (billing: VisitorBilling | null) => void, onError: (error: Error) => void) {
  return onSnapshot(
    doc(db, "visitorBilling", companyId),
    (snapshot) => onChange(snapshot.exists() ? (snapshot.data() as VisitorBilling) : null),
    onError,
  )
}
