import { createHmac, timingSafeEqual } from "node:crypto"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { decryptSecret, encryptSecret } from "@/lib/server/agency-secrets"
import { SITE_ORIGIN } from "@/lib/server/email-branding"

/*
 * Google connections for Marketing: Analytics (GA4), Search Console and Ads.
 * Each company signs in with Google once; we keep the refresh token (encrypted)
 * and the one property, site or account they picked. GA4 and Search Console
 * read live numbers from here. Ads lists the accounts the sign-in can see; live
 * spend needs a Google Ads developer token, added later.
 *
 * One OAuth client is shared with the mailbox flow (GOOGLE_GMAIL_CLIENT_ID/
 * SECRET), with a marketing-specific override if set. The redirect URI below
 * must be allowed in the Google Cloud console.
 */

export type GoogleService = "ga4" | "searchConsole" | "googleAds"

export const GOOGLE_SERVICES: GoogleService[] = ["ga4", "searchConsole", "googleAds"]

const SCOPES: Record<GoogleService, string[]> = {
  ga4: ["https://www.googleapis.com/auth/analytics.readonly"],
  searchConsole: ["https://www.googleapis.com/auth/webmasters.readonly"],
  googleAds: ["https://www.googleapis.com/auth/adwords"],
}

const GOOGLE_ADS_API_VERSION = "v18"

export class GoogleRefused extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function googleMarketingConfig() {
  const clientId = (process.env.GOOGLE_MARKETING_CLIENT_ID || process.env.GOOGLE_GMAIL_CLIENT_ID || "").trim()
  const clientSecret = (process.env.GOOGLE_MARKETING_CLIENT_SECRET || process.env.GOOGLE_GMAIL_CLIENT_SECRET || "").trim()
  if (!clientId || !clientSecret) throw new GoogleRefused("Google connections aren't set up yet. Add a Google OAuth client.", 503)
  return {
    clientId,
    clientSecret,
    redirectUri: process.env.GOOGLE_MARKETING_REDIRECT_URI?.trim() || `${SITE_ORIGIN}/api/google/callback`,
  }
}

export function googleMarketingConfigured() {
  return Boolean((process.env.GOOGLE_MARKETING_CLIENT_ID || process.env.GOOGLE_GMAIL_CLIENT_ID || "").trim())
}

/** The sign-in link Google shows. `scopes` is one service's read scope plus the basics for the account email. */
export function googleAuthUrl(service: GoogleService, state: string) {
  const config = googleMarketingConfig()
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("redirect_uri", config.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("include_granted_scopes", "true")
  url.searchParams.set("scope", ["openid", "email", ...SCOPES[service]].join(" "))
  url.searchParams.set("state", state)
  return url.toString()
}

// The sign-in link carries who started it and which service, signed so the callback can trust it.
const STATE_KEY = process.env.GOOGLE_MARKETING_CLIENT_SECRET || process.env.GOOGLE_GMAIL_CLIENT_SECRET || process.env.AGENCY_SECRETS_KEY || "visualhq-google-marketing"
const STATE_TTL_MS = 30 * 60 * 1000

export type GoogleState = { companyId: string; agencyId: string; uid: string; service: GoogleService; returnTo: string; at: number }

export function signGoogleState(state: Omit<GoogleState, "at">) {
  const payload = Buffer.from(JSON.stringify({ ...state, at: Date.now() })).toString("base64url")
  const signature = createHmac("sha256", STATE_KEY).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function readGoogleState(value: string): GoogleState | null {
  const [payload, signature] = value.split(".")
  if (!payload || !signature) return null
  const expected = createHmac("sha256", STATE_KEY).update(payload).digest("base64url")
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleState
    if (!GOOGLE_SERVICES.includes(state.service)) return null
    return Date.now() - state.at < STATE_TTL_MS ? state : null
  } catch {
    return null
  }
}

// --- Tokens -------------------------------------------------------------

export async function exchangeCode(code: string) {
  const config = googleMarketingConfig()
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }),
    cache: "no-store",
  })
  const tokens = (await response.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; scope?: string; error_description?: string; error?: string }
  if (!response.ok || !tokens.refresh_token) throw new GoogleRefused(tokens.error_description || tokens.error || "Google didn't return a refresh token. Try again and allow access.", 502)
  return { accessToken: tokens.access_token || "", refreshToken: tokens.refresh_token, scope: tokens.scope || "" }
}

async function accessTokenFrom(refreshToken: string) {
  const config = googleMarketingConfig()
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  })
  const result = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string }
  if (!response.ok || !result.access_token) {
    // invalid_grant means the person removed our access on their side.
    const reconnect = result.error === "invalid_grant"
    throw new GoogleRefused(reconnect ? "Google access was removed. Connect again." : result.error_description || result.error || "Google sign-in could not be refreshed.", reconnect ? 409 : 502)
  }
  return result.access_token
}

export async function googleUserEmail(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" })
  const data = (await response.json().catch(() => ({}))) as { email?: string }
  return data.email || ""
}

// --- Stored connections (per company) -----------------------------------

export type StoredGoogleConnection = {
  email: string
  refreshToken: string // encrypted
  resourceId?: string
  resourceLabel?: string
  scope?: string
  connectedBy?: string
  connectedAt?: unknown
  updatedAt?: unknown
}

export type GoogleConnectionView = {
  service: GoogleService
  connected: boolean
  email?: string
  resourceId?: string
  resourceLabel?: string
}

const orgRef = (companyId: string) => adminServices().db.collection("organizations").doc(companyId)

export async function readGoogleConnections(companyId: string): Promise<Record<string, StoredGoogleConnection>> {
  const data = (await orgRef(companyId).get()).data()
  return (data?.marketingGoogle ?? {}) as Record<string, StoredGoogleConnection>
}

export function connectionView(service: GoogleService, stored?: StoredGoogleConnection): GoogleConnectionView {
  if (!stored?.refreshToken) return { service, connected: false }
  return { service, connected: true, email: stored.email, resourceId: stored.resourceId, resourceLabel: stored.resourceLabel }
}

export async function saveGoogleConnection(companyId: string, service: GoogleService, input: { email: string; refreshToken: string; scope: string; connectedBy: string }) {
  await orgRef(companyId).set({
    marketingGoogle: {
      [service]: {
        email: input.email,
        refreshToken: encryptSecret(input.refreshToken),
        scope: input.scope,
        connectedBy: input.connectedBy,
        connectedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
  }, { merge: true })
}

export async function setGoogleResource(companyId: string, service: GoogleService, resourceId: string, resourceLabel: string) {
  await orgRef(companyId).set({
    marketingGoogle: { [service]: { resourceId, resourceLabel, updatedAt: FieldValue.serverTimestamp() } },
  }, { merge: true })
}

export async function disconnectGoogle(companyId: string, service: GoogleService) {
  await orgRef(companyId).set({ marketingGoogle: { [service]: FieldValue.delete() } }, { merge: true })
}

/** A fresh access token for a company's service, or throws GoogleRefused (409 when a reconnect is needed). */
async function accessTokenFor(companyId: string, service: GoogleService) {
  const stored = (await readGoogleConnections(companyId))[service]
  const refreshToken = stored?.refreshToken ? decryptSecret(stored.refreshToken) : ""
  if (!refreshToken) throw new GoogleRefused("Not connected to Google yet.", 409)
  return accessTokenFrom(refreshToken)
}

// --- Account lists ------------------------------------------------------

export type ResourceOption = { id: string; label: string }

/** GA4 properties the sign-in can see, as { id: "properties/123", label: "Account · Property" }. */
export async function ga4Properties(companyId: string): Promise<ResourceOption[]> {
  const token = await accessTokenFor(companyId, "ga4")
  const response = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
  const data = (await response.json().catch(() => ({}))) as { accountSummaries?: Array<{ displayName?: string; propertySummaries?: Array<{ property?: string; displayName?: string }> }> }
  if (!response.ok) throw new GoogleRefused("Couldn't list your Analytics properties.", 502)
  const options: ResourceOption[] = []
  for (const account of data.accountSummaries ?? []) {
    for (const property of account.propertySummaries ?? []) {
      if (property.property) options.push({ id: property.property, label: [account.displayName, property.displayName].filter(Boolean).join(" · ") || property.property })
    }
  }
  return options
}

/** Search Console sites the sign-in can see, as { id: siteUrl, label: siteUrl }. */
export async function searchConsoleSites(companyId: string): Promise<ResourceOption[]> {
  const token = await accessTokenFor(companyId, "searchConsole")
  const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
  const data = (await response.json().catch(() => ({}))) as { siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }> }
  if (!response.ok) throw new GoogleRefused("Couldn't list your Search Console sites.", 502)
  return (data.siteEntry ?? [])
    .filter((entry) => entry.siteUrl && entry.permissionLevel !== "siteUnverifiedUser")
    .map((entry) => ({ id: entry.siteUrl as string, label: (entry.siteUrl as string).replace(/^sc-domain:/, "") }))
}

/** Google Ads accounts the sign-in can see. Needs a developer token; returns [] with a reason when it's missing. */
export async function adsAccounts(companyId: string): Promise<{ options: ResourceOption[]; note?: string }> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  if (!developerToken) return { options: [], note: "Ads accounts list once a Google Ads developer token is added." }
  const token = await accessTokenFor(companyId, "googleAds")
  const response = await fetch(`https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`, {
    headers: { Authorization: `Bearer ${token}`, "developer-token": developerToken },
    cache: "no-store",
  })
  const data = (await response.json().catch(() => ({}))) as { resourceNames?: string[] }
  if (!response.ok) return { options: [], note: "Couldn't list Ads accounts. Check the developer token." }
  const options = (data.resourceNames ?? []).map((name) => {
    const id = name.replace("customers/", "")
    const pretty = id.length === 10 ? `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}` : id
    return { id, label: pretty }
  })
  return { options }
}

export async function resourceOptions(companyId: string, service: GoogleService): Promise<{ options: ResourceOption[]; note?: string }> {
  if (service === "ga4") return { options: await ga4Properties(companyId) }
  if (service === "searchConsole") return { options: await searchConsoleSites(companyId) }
  return adsAccounts(companyId)
}

// --- Live summaries -----------------------------------------------------

export type GoogleSummary = { label: string; value: string }[]

/** Sessions, users and conversions over the last 28 days for the chosen GA4 property. */
export async function ga4Summary(companyId: string, propertyId: string): Promise<GoogleSummary> {
  const token = await accessTokenFor(companyId, "ga4")
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ dateRanges: [{ startDate: "28daysAgo", endDate: "today" }], metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }] }),
    cache: "no-store",
  })
  const data = (await response.json().catch(() => ({}))) as { rows?: Array<{ metricValues?: Array<{ value?: string }> }> }
  if (!response.ok) throw new GoogleRefused("Couldn't read Analytics numbers.", 502)
  const values = data.rows?.[0]?.metricValues ?? []
  const number = (index: number) => Number(values[index]?.value ?? 0).toLocaleString("en-US")
  return [
    { label: "Sessions (28d)", value: number(0) },
    { label: "Users (28d)", value: number(1) },
    { label: "Conversions (28d)", value: number(2) },
  ]
}

/** Clicks, impressions and average position over the last 28 days for the chosen site. */
export async function searchConsoleSummary(companyId: string, siteUrl: string): Promise<GoogleSummary> {
  const token = await accessTokenFor(companyId, "searchConsole")
  const end = new Date()
  const start = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
  const day = (date: Date) => date.toISOString().slice(0, 10)
  const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: day(start), endDate: day(end), dimensions: [] }),
    cache: "no-store",
  })
  const data = (await response.json().catch(() => ({}))) as { rows?: Array<{ clicks?: number; impressions?: number; position?: number }> }
  if (!response.ok) throw new GoogleRefused("Couldn't read Search Console numbers.", 502)
  const row = data.rows?.[0] ?? {}
  return [
    { label: "Clicks (28d)", value: Math.round(row.clicks ?? 0).toLocaleString("en-US") },
    { label: "Impressions (28d)", value: Math.round(row.impressions ?? 0).toLocaleString("en-US") },
    { label: "Avg position", value: row.position ? row.position.toFixed(1) : "—" },
  ]
}

export async function serviceSummary(companyId: string, service: GoogleService): Promise<{ summary: GoogleSummary; note?: string }> {
  const stored = (await readGoogleConnections(companyId))[service]
  if (!stored?.resourceId) return { summary: [] }
  if (service === "ga4") return { summary: await ga4Summary(companyId, stored.resourceId) }
  if (service === "searchConsole") return { summary: await searchConsoleSummary(companyId, stored.resourceId) }
  return { summary: [], note: "Ads spend turns on once a Google Ads developer token is added." }
}

export function googleFailure(error: unknown) {
  if (error instanceof GoogleRefused) return { body: { error: error.message, reconnect: error.status === 409 }, status: error.status >= 500 ? 502 : error.status }
  console.error("Google marketing request failed", error)
  return { body: { error: "Something went wrong with Google. Please try again." }, status: 500 }
}
