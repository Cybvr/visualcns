/**
 * Lets the front-desk tablet keep working when the internet drops. Sign-ins
 * and sign-outs are saved on the tablet and sent, in order, once it's back
 * online. The screen details (company, hosts, who's in) are kept from the
 * last good load so a reload offline still shows the form.
 */

export type KioskInfo = {
  company: { name: string; logoUrl: string }
  hosts: { id: string; name: string }[]
  /** Who is in now. `at` is when they signed in, in milliseconds. */
  onSite: { id: string; name: string; at?: number }[]
}

export type QueuedAction =
  | { action: "sign_in"; clientId: string; at: number; name: string; visitorCompany: string; phone: string; reason: string; hostId: string; hostName: string }
  | { action: "sign_out"; visitorId: string; at: number }

/** Thrown when the request never reached the server, so it's worth trying again later. */
export class OfflineError extends Error {}

const INFO_KEY = "visitor-kiosk-info"
const QUEUE_KEY = "visitor-kiosk-queue"

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the tablet still works while it stays online.
  }
}

export const savedInfo = (slug: string) => read<KioskInfo | null>(`${INFO_KEY}:${slug}`, null)
export const saveInfo = (slug: string, info: KioskInfo) => write(`${INFO_KEY}:${slug}`, info)
export const queued = (slug: string) => read<QueuedAction[]>(`${QUEUE_KEY}:${slug}`, [])
export const saveQueue = (slug: string, queue: QueuedAction[]) => write(`${QUEUE_KEY}:${slug}`, queue)

export function enqueue(slug: string, item: QueuedAction) {
  saveQueue(slug, [...queued(slug), item])
}

/** Same rule as the server, so names added offline look the same in the sign-out list. */
export function shortName(name: string) {
  const [first, ...rest] = name.split(" ").filter(Boolean)
  const last = rest.at(-1)
  return last ? `${first} ${last[0].toUpperCase()}.` : first || "Visitor"
}

/** Who's in, counting sign-ins and sign-outs that haven't been sent yet. */
export function withQueued(onSite: KioskInfo["onSite"], queue: QueuedAction[]) {
  const list = [...onSite]
  for (const item of queue) {
    if (item.action === "sign_in" && !list.some((visitor) => visitor.id === item.clientId)) list.unshift({ id: item.clientId, name: shortName(item.name), at: item.at })
    if (item.action === "sign_out") {
      const index = list.findIndex((visitor) => visitor.id === item.visitorId)
      if (index >= 0) list.splice(index, 1)
    }
  }
  return list
}

export function newClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}
