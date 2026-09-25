import { randomBytes } from "node:crypto"
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore"

/**
 * Shareable portal links. Each company has one secret key; anyone holding
 * `/portal/<slug>?key=<key>` can view that company's portal without signing
 * in. Keys live in `portalLinks/{companyId}`, which only the server can read.
 */
export const PORTAL_LINKS = "portalLinks"
const LEGACY_TENANT_ID = process.env.LEGACY_TENANT_ID || "legacy-visualcns"

export type PortalLink = { key: string; tenantId: string; companyId: string }

export function newPortalKey() {
  return randomBytes(18).toString("base64url")
}

/** Only URL-safe keys of the length we issue are looked up at all. */
export function isWellFormedKey(key: string) {
  return /^[A-Za-z0-9_-]{20,64}$/.test(key)
}

export async function findPortalLink(db: Firestore, key: string): Promise<PortalLink | null> {
  if (!isWellFormedKey(key)) return null
  const snapshot = await db.collection(PORTAL_LINKS).where("key", "==", key).limit(1).get()
  if (snapshot.empty) return null
  const data = snapshot.docs[0].data()
  if (typeof data.tenantId !== "string" || typeof data.companyId !== "string") return null
  return { key, tenantId: data.tenantId, companyId: data.companyId }
}

export async function getOrCreatePortalLink(db: Firestore, tenantId: string, companyId: string, reset = false): Promise<string> {
  const ref = db.collection(PORTAL_LINKS).doc(companyId)
  const existing = await ref.get()
  const current = existing.data()
  if (!reset && current?.tenantId === tenantId && typeof current.key === "string") return current.key
  const key = newPortalKey()
  await ref.set({ key, tenantId, companyId, createdAt: FieldValue.serverTimestamp() })
  return key
}

/** Organizations created before tenants carry no tenantId and belong to the legacy bucket. */
export function organizationTenant(data: FirebaseFirestore.DocumentData | undefined): string {
  return typeof data?.tenantId === "string" && data.tenantId ? data.tenantId : LEGACY_TENANT_ID
}

/**
 * Firestore Timestamps don't survive JSON. Encode them as { __ts: millis } so
 * the browser can turn them back into Timestamps the UI already expects.
 */
export function toWire(value: unknown): unknown {
  if (value instanceof Timestamp) return { __ts: value.toMillis() }
  if (Array.isArray(value)) return value.map(toWire)
  if (value && typeof value === "object") {
    // Other Firestore types (references, geo points) aren't used by the portal;
    // drop them rather than risk leaking internals or circular structures.
    if (Object.getPrototypeOf(value) !== Object.prototype) return null
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) out[key] = toWire(item)
    return out
  }
  return value
}

/**
 * Give a portal link its share key so the recipient can open it without an
 * account. Accepts "/portal/<ref>/..." paths or absolute URLs on `origin`;
 * anything else, or a company outside `tenantId`, comes back unchanged.
 */
export async function withPortalKey(db: Firestore, tenantId: string, link: string, origin: string): Promise<string> {
  try {
    const url = new URL(link, origin)
    if (url.origin !== new URL(origin).origin || url.searchParams.has("key")) return link
    const match = url.pathname.match(/^\/portal\/([^/]+)/)
    if (!match) return link
    const ref = decodeURIComponent(match[1])
    let organization = await db.collection("organizations").doc(ref).get()
    if (!organization.exists) {
      const bySlug = await db.collection("organizations").where("slug", "==", ref).where("tenantId", "==", tenantId).limit(1).get()
      if (bySlug.empty) return link
      organization = bySlug.docs[0]
    }
    if (organizationTenant(organization.data()) !== tenantId) return link
    url.searchParams.set("key", await getOrCreatePortalLink(db, tenantId, organization.id))
    return link.startsWith("/") ? `${url.pathname}${url.search}${url.hash}` : url.toString()
  } catch {
    return link
  }
}
