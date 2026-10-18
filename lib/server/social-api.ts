import { createHmac, timingSafeEqual } from "node:crypto"
import type { NextRequest } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { getAgencySecret } from "@/lib/server/agency-secrets"
import { SITE_ORIGIN } from "@/lib/server/email-branding"

/**
 * SocialAPI (social-api.ai): connects a client's social accounts, posts to
 * them, and reads their DMs, comments and reviews. Every call goes through
 * here so the agency's key never reaches the browser.
 */

const BASE_URL = "https://api.social-api.ai/v1"

/** The one address SocialAPI sends people back to. Whitelist it in the SocialAPI dashboard. */
export const SOCIAL_CALLBACK_URL = `${SITE_ORIGIN}/api/social/callback`

/** A signed-in person who may not use this company's social tools. */
export class SocialRefused extends Error {
  status: number
  constructor(message: string, status = 403) {
    super(message)
    this.status = status
  }
}

export class SocialApiError extends Error {
  status: number
  code: string
  constructor(message: string, status: number, code = "") {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function socialApiKey(agencyId: string) {
  return getAgencySecret(agencyId, "SOCIAL_API_KEY", process.env.SOCIAL_API_KEY || "")
}

/** Calls SocialAPI with the agency's key. Throws SocialApiError with SocialAPI's own message. */
export async function socialApi<T = Record<string, unknown>>(agencyId: string, path: string, init: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  const key = await socialApiKey(agencyId)
  if (!key) throw new SocialApiError("Social accounts aren't set up for this agency yet.", 503, "not_configured")
  const url = new URL(`${BASE_URL}${path}`)
  for (const [name, value] of Object.entries(init.query ?? {})) if (value) url.searchParams.set(name, value)
  const response = await fetch(url, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  }).catch(() => null)
  if (!response) throw new SocialApiError("Couldn't reach SocialAPI. Please try again.", 502)
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    const error = (data.error && typeof data.error === "object" ? data.error : data) as Record<string, unknown>
    const message = typeof error.message === "string" ? error.message : typeof data.error === "string" ? data.error : "SocialAPI refused the request."
    throw new SocialApiError(message, response.status, typeof error.code === "string" ? error.code : "")
  }
  return data as T
}

/** SocialAPI lists come back as a bare array or under data/items. */
export function listOf(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[]
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of ["data", "items", "results", "accounts", "posts", "conversations", "messages", "comments", "reviews"]) {
      if (Array.isArray(record[key])) return record[key] as Record<string, unknown>[]
    }
  }
  return []
}

export function text(value: unknown) {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : ""
}

export type SocialRole = "agency" | "client"

/**
 * Checks the caller may use a company's social tools: the agency's admins
 * (and superadmins) as "agency", the company's own people as "client".
 */
export async function authorizeSocial(request: NextRequest, companyId: string, { agencyOnly = false } = {}) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token || !companyId) throw new SocialRefused("Please sign in again.", 401)
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) throw new SocialRefused("Please sign in again.", 401)
  const [userSnapshot, orgSnapshot] = await Promise.all([
    db.collection("users").doc(decoded.uid).get(),
    db.collection("organizations").doc(companyId).get(),
  ])
  const user = userSnapshot.data() ?? {}
  const org = orgSnapshot.data()
  if (!org) throw new SocialRefused("We couldn't find that company.", 404)
  const agencyId = String(org.agencyId || "")
  const agency = user.role === "superadmin" || (user.role === "admin" && user.agencyId === agencyId)
  const client = !agency && user.agencyId === agencyId && user.companyId === companyId
  if (!agencyId || (!agency && !client)) throw new SocialRefused("You can't use social tools for this company.")
  if (agencyOnly && !agency) throw new SocialRefused("Only your agency can change this.")
  const role: SocialRole = agency ? "agency" : "client"
  return { db, uid: decoded.uid, agencyId, org, role, userName: String(user.displayName || decoded.name || decoded.email || "") }
}

/** Clients post on their own only when the agency has switched it on for them. */
export function canPublish(role: SocialRole, org: Record<string, unknown>) {
  return role === "agency" || org.socialClientPosting === true
}

/** The social accounts linked to a company, as saved when each was connected. */
export async function companyAccountIds(db: FirebaseFirestore.Firestore, companyId: string) {
  const snapshot = await db.collection("socialAccounts").where("companyId", "==", companyId).get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as { platform?: string; agencyId?: string }) }))
}

// The connect link carries who started it, signed so the callback can trust it.
const STATE_KEY = process.env.AGENCY_SECRETS_KEY || process.env.FIREBASE_PRIVATE_KEY || "visualhq-social-state"
const STATE_TTL_MS = 30 * 60 * 1000

export type ConnectState = { companyId: string; agencyId: string; uid: string; returnTo: string; at: number }

export function signState(state: Omit<ConnectState, "at">) {
  const payload = Buffer.from(JSON.stringify({ ...state, at: Date.now() })).toString("base64url")
  const signature = createHmac("sha256", STATE_KEY).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function readState(value: string): ConnectState | null {
  const [payload, signature] = value.split(".")
  if (!payload || !signature) return null
  const expected = createHmac("sha256", STATE_KEY).update(payload).digest("base64url")
  if (!safeEqual(signature, expected)) return null
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ConnectState
    return Date.now() - state.at < STATE_TTL_MS ? state : null
  } catch {
    return null
  }
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Checks a webhook really came from SocialAPI. Prefers the v2 signature
 * (timestamp + body, rejected when over five minutes off) and falls back to v1.
 */
export function verifyWebhook(rawBody: string, headers: Headers, secret: string) {
  if (!secret) return false
  const v2 = headers.get("x-socialapi-signature-v2") || ""
  const timestamp = headers.get("x-socialapi-timestamp") || ""
  if (v2 && timestamp) {
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false
    const digest = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`)
    return matchesSignature(v2, digest)
  }
  const v1 = headers.get("x-socialapi-signature") || ""
  return Boolean(v1) && matchesSignature(v1, createHmac("sha256", secret).update(rawBody))
}

// The docs show "sha256=<digest>"; accept hex or base64 since the encoding isn't spelled out.
function matchesSignature(header: string, hmac: ReturnType<typeof createHmac>) {
  const given = header.replace(/^sha256=/, "")
  const digest = hmac.digest()
  return safeEqual(given, digest.toString("hex")) || safeEqual(given, digest.toString("base64"))
}

export function socialFailure(error: unknown) {
  if (error instanceof SocialRefused) return { body: { error: error.message }, status: error.status }
  if (error instanceof SocialApiError) return { body: { error: error.message, code: error.code }, status: error.status >= 500 ? 502 : error.status }
  console.error("Social request failed", error)
  return { body: { error: "Something went wrong. Please try again." }, status: 500 }
}
