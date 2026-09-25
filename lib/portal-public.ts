import { Timestamp } from "firebase/firestore"
import { INVOICE_ISSUER } from "./billing"
import type { BusinessProfile } from "./business-profile"

/**
 * Browser side of shareable portal links (`/portal/<slug>?key=<key>`). The key
 * is remembered per company so moving between portal pages keeps working
 * after the `?key=` is gone from the address bar.
 */
const storageKey = (slug: string) => `portalKey:${slug}`

export function rememberPortalKey(slug: string, key: string) {
  try { localStorage.setItem(storageKey(slug), key) } catch { /* storage unavailable */ }
}

export function recallPortalKey(slug: string): string {
  try { return localStorage.getItem(storageKey(slug)) || "" } catch { return "" }
}

export function forgetPortalKey(slug: string) {
  try { localStorage.removeItem(storageKey(slug)) } catch { /* storage unavailable */ }
}

/** Undo the server's { __ts: millis } encoding so dates behave like Firestore reads. */
function fromWire(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(fromWire)
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
    if (keys.length === 1 && keys[0] === "__ts" && typeof record.__ts === "number") return Timestamp.fromMillis(record.__ts)
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(record)) out[key] = fromWire(item)
    return out
  }
  return value
}

export class PortalLinkInvalidError extends Error {}

export async function fetchPublicPortal<T>(key: string): Promise<T & { issuer: BusinessProfile }> {
  const response = await fetch(`/api/portal/public?key=${encodeURIComponent(key)}`, { cache: "no-store" })
  const body = await response.json().catch(() => ({})) as { error?: string; issuer?: Partial<BusinessProfile> | null }
  if (response.status === 404) throw new PortalLinkInvalidError(body.error || "This link isn’t valid anymore.")
  if (!response.ok) throw new Error(body.error || "We couldn’t load this workspace.")
  const data = fromWire(body) as T & { issuer?: Partial<BusinessProfile> | null }
  // Same fallbacks getBusinessProfile() uses when a field is missing.
  const issuer = data.issuer || {}
  return {
    ...data,
    issuer: {
      ...INVOICE_ISSUER,
      ...Object.fromEntries(Object.entries(issuer).filter(([, value]) => value !== undefined && value !== null && value !== "")),
      name: issuer.name?.trim() || INVOICE_ISSUER.name,
    } as BusinessProfile,
  }
}

/** The portal address to hand a client: opens without signing in. */
export function portalShareUrl(path: string, key: string) {
  return key ? `${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}` : path
}
