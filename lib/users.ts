import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import { getCurrentAgencyId } from "./agency-scope"

export type UserRole = "admin" | "client" | "superadmin"

export function userRoleLabel(role?: UserRole): string {
  if (role === "superadmin") return "Superadmin"
  if (role === "admin") return "Admin"
  return "Client"
}

export interface AppUser {
  /** Firestore document id === Firebase Auth uid */
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  role?: UserRole
  /** Top-level agency boundary. Never infer this from companyId. */
  agencyId?: string
  company?: string
  /** The user's own dashboard URL segment, e.g. /dashboard/ada-obi */
  slug?: string
  /** Links a client user to their project/deliverable data. */
  companyId?: string
  phone?: string
  website?: string
  linkedIn?: string
  instagram?: string
  x?: string
  /** Set once we've seeded a client's starter tasks, so we never re-seed. */
  tasksSeeded?: boolean
  /** Set on public signup until the one-time welcome email is delivered. */
  welcomeEmailPending?: boolean
  welcomeEmailSentAt?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
  // Preserve any other fields that exist on the doc so edits don't drop them
  [key: string]: unknown
}

const COLLECTION_NAME = "users"

/**
 * Words that are already dashboard sections. A user slug matching one of these
 * would sit behind the real page forever, so they're never handed out.
 */
const RESERVED_SLUGS = new Set([
  "agent",
  "overview",
  "drive",
  "email",
  "seo",
  "projects",
  "tasks",
  "portfolio",
  "users",
  "clients",
  "companies",
  "templates",
  "invoices",
  "contracts",
  "estimates",
  "marketing",
  "manage",
  "settings",
  "account",
  "new",
])

export function slugifyUser(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

export async function getUserBySlug(slug: string): Promise<AppUser | null> {
  if (!slug) return null
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", await getCurrentAgencyId()), where("slug", "==", slug)))
  if (snapshot.empty) return null
  const first = snapshot.docs[0]
  return { ...(first.data() as object), uid: first.id } as AppUser
}

/**
 * Resolve a user from a URL segment. Slugs are what the links carry; a raw uid
 * still resolves so older links, and accounts that have never signed in and so
 * have no slug yet, keep working.
 */
export async function getUserByRef(ref: string): Promise<AppUser | null> {
  if (!ref) return null
  return (await getUserBySlug(ref)) ?? (await getUser(ref))
}

/** The URL segment for a user. */
export function userRef(user: AppUser): string {
  return user.slug || user.uid
}

/**
 * Build a slug from a name or email that no other user holds. `forUid` is the
 * account claiming it, so re-saving your own slug isn't treated as a clash.
 */
export async function uniqueUserSlug(preferred: string, forUid: string): Promise<string> {
  const base = slugifyUser(preferred) || "user"
  let candidate = RESERVED_SLUGS.has(base) ? `${base}-1` : base

  for (let attempt = 2; attempt < 50; attempt += 1) {
    const taken = await getUserBySlug(candidate)
    if (!taken || taken.uid === forUid) return candidate
    candidate = `${base}-${attempt}`
  }
  // Every readable variant is spoken for, so fall back to something unique.
  return `${base}-${forUid.slice(0, 6).toLowerCase()}`
}

export async function getUsers(): Promise<AppUser[]> {
  const agencyId = await getCurrentAgencyId()
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId)))
  return snapshot.docs.map((d) => ({ ...(d.data() as object), uid: d.id })) as AppUser[]
}

/**
 * The account owning a workspace. Several users can share a companyId, so this
 * returns the first match, which is enough to open their record.
 */
export async function getUserByCompanyId(companyId: string): Promise<AppUser | null> {
  if (!companyId) return null
  const agencyId = await getCurrentAgencyId()
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId), where("companyId", "==", companyId)))
  if (snapshot.empty) return null
  const first = snapshot.docs[0]
  return { ...(first.data() as object), uid: first.id } as AppUser
}

/** Every person who belongs to a workspace, for the company's People tab. */
export async function getUsersByCompanyId(companyId: string): Promise<AppUser[]> {
  if (!companyId) return []
  const agencyId = await getCurrentAgencyId()
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId), where("companyId", "==", companyId)))
  return snapshot.docs.map((d) => ({ ...(d.data() as object), uid: d.id })) as AppUser[]
}

export async function getUser(uid: string): Promise<AppUser | null> {
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, uid))
  if (!snapshot.exists()) return null
  return { ...(snapshot.data() as object), uid: snapshot.id } as AppUser
}

/** Create a user doc keyed by uid (uid must match the person's Firebase Auth uid). */
export async function createUser(uid: string, data: Omit<AppUser, "uid" | "createdAt" | "updatedAt">): Promise<void> {
  const agencyId = await getCurrentAgencyId()
  await setDoc(doc(db, COLLECTION_NAME, uid), {
    ...data,
    agencyId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
}

export async function updateUser(uid: string, data: Partial<Omit<AppUser, "uid" | "createdAt">>): Promise<void> {
  const safeData = { ...data }
  delete safeData.agencyId
  await updateDoc(doc(db, COLLECTION_NAME, uid), {
    ...safeData,
    updatedAt: Timestamp.now(),
  })
}

export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, uid))
}

/**
 * Called on every sign-in. Creates the users/{uid} doc on first login and
 * refreshes profile fields (email/name/photo) on return visits. Uses merge so
 * it NEVER overwrites `role` or any other field set elsewhere. Returns the
 * doc after the write so callers can read the current role.
 */
export async function upsertUserOnLogin(profile: {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  agencyName?: string
  createWorkspace?: boolean
}): Promise<AppUser | null> {
  const ref = doc(db, COLLECTION_NAME, profile.uid)
  const existing = await getDoc(ref)
  const existingData = existing.data() || {}
  const createWorkspace = profile.createWorkspace === true
  const canClaimWorkspace = createWorkspace && !existingData.role && !existingData.agencyId

  const base: Record<string, unknown> = {
    email: profile.email ?? "",
    displayName: profile.displayName || existingData.displayName || "",
    photoURL: profile.photoURL || existingData.photoURL || "",
    updatedAt: Timestamp.now(),
  }
  if (!existing.exists()) {
    base.createdAt = Timestamp.now()
    base.onboardingStatus = "pending-invite"
  }
  if (canClaimWorkspace) {
    base.role = "admin"
    base.welcomeEmailPending = true
    base.onboardingStatus = "active"
    base.agencyId = profile.uid
    base.companyId = profile.uid
    if (profile.agencyName?.trim()) base.company = profile.agencyName.trim()
  }
  if (existing.exists() && existingData.role && !existingData.companyId) {
    base.companyId = profile.uid
  }

  // Same idea for the URL segment: new accounts get one, and older docs that
  // predate slugs are backfilled on their next login.
  if ((canClaimWorkspace || existingData.role) && (!existing.exists() || !existingData.slug)) {
    const preferred = profile.displayName || (profile.email ?? "").split("@")[0] || "user"
    // Self provisioning cannot query other users under the access rules.
    base.slug = `${preferred.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "user"}-${profile.uid}`
  }

  await setDoc(ref, base, { merge: true })

  const after = await getDoc(ref)
  return after.exists() ? ({ ...(after.data() as object), uid: after.id } as AppUser) : null
}
