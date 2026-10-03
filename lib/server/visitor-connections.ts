import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import type { Firestore } from "firebase-admin/firestore"

/**
 * A company's visitor sign-in extras, kept server-side in visitorSettings/{companyId}
 * (the browser never reads it directly; /api/visitors/settings does):
 * - qrKey: a second link, for visitors to sign in on their own phone from a QR code
 * - agreement: an NDA or terms visitors agree to before they sign in
 * - slackUrl / teamsUrl: incoming webhooks that get a message when a visitor arrives
 * - webhookUrl: any https address (Zapier, Make, etc.) that gets every sign-in and sign-out
 */
export type VisitorSettings = {
  agencyId?: string
  companyId?: string
  qrKey?: string
  agreement?: { enabled: boolean; title: string; text: string }
  slackUrl?: string
  teamsUrl?: string
  webhookUrl?: string
}

export const AGREEMENT_TITLE_MAX = 80
export const AGREEMENT_TEXT_MAX = 6000

export async function getVisitorSettings(db: Firestore, companyId: string): Promise<VisitorSettings> {
  return ((await db.collection("visitorSettings").doc(companyId).get()).data() ?? {}) as VisitorSettings
}

/** The agreement visitors see, or null when it's off or empty. */
export function activeAgreement(settings: VisitorSettings) {
  const agreement = settings.agreement
  return agreement?.enabled && agreement.title.trim() && agreement.text.trim() ? { title: agreement.title, text: agreement.text } : null
}

function privateAddress(ip: string): boolean {
  if (ip.startsWith("::ffff:")) return privateAddress(ip.slice(7))
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number)
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
  }
  const lower = ip.toLowerCase()
  return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower)
}

/**
 * An https address on the public internet, or null. Stops a webhook being
 * pointed at our own servers or a private network.
 */
export async function publicHttpsUrl(raw: string): Promise<URL | null> {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== "https:" || url.username || url.password) return null
  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (!host || host === "localhost" || /\.(local|internal|localhost)$/i.test(host)) return null
  if (isIP(host)) return privateAddress(host) ? null : url
  const addresses = await lookup(host, { all: true }).catch(() => [])
  if (!addresses.length || addresses.some((address) => privateAddress(address.address))) return null
  return url
}

const TEAMS_HOSTS = /(^|\.)(logic\.azure\.com|webhook\.office\.com|powerplatform\.com|powerautomate\.com)$/i

/** Checks a pasted address is the right kind for its channel. Returns an error message, or "" when fine. */
export async function checkConnectionUrl(kind: "slack" | "teams" | "webhook", raw: string): Promise<string> {
  if (!raw) return ""
  const url = await publicHttpsUrl(raw)
  if (kind === "slack") return url?.hostname === "hooks.slack.com" && /^\/(services|triggers|workflows)\//.test(url.pathname) ? "" : "That doesn't look like a Slack webhook. It starts with https://hooks.slack.com/"
  if (kind === "teams") return url && TEAMS_HOSTS.test(url.hostname) ? "" : "That doesn't look like a Teams workflow link. Copy it from the Workflows app in Teams."
  return url ? "" : "Use a public https address, like the one Zapier or Make gives you."
}

async function post(raw: string, body: unknown) {
  const url = await publicHttpsUrl(raw)
  if (!url) return false
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "VisualCNS-Pass/1" },
    body: JSON.stringify(body),
    // A redirect could lead somewhere private, so don't follow one.
    redirect: "manual",
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  }).catch(() => null)
  return Boolean(response?.ok)
}

export type ArrivalVisit = {
  id: string
  companyName: string
  name: string
  visitorCompany: string
  email: string
  phone: string
  hostName: string
  reason: string
  signedInAt: number
  via: "tablet" | "phone"
  agreement: string | null
  /** A sign-in saved offline arrives late; say how late. */
  minutesAgo: number
}

function arrivalLine(visit: ArrivalVisit) {
  const when = visit.minutesAgo >= 5 ? ` (signed in ${visit.minutesAgo < 90 ? `${visit.minutesAgo} minutes` : `about ${Math.round(visit.minutesAgo / 60)} hours`} ago)` : ""
  return { who: visit.name, to: visit.hostName, when }
}

function slackEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Slack and Teams get who arrived and who for, not their phone or email: a channel is wider than the host. */
function chatFacts(visit: ArrivalVisit) {
  return [
    visit.visitorCompany && ["From", visit.visitorCompany],
    visit.reason && ["Purpose", visit.reason],
    visit.agreement && ["Agreed to", visit.agreement],
    ["Signed in", visit.via === "phone" ? "On their phone" : "At the front desk"],
  ].filter(Boolean) as [string, string][]
}

export function slackArrival(visit: ArrivalVisit) {
  const { who, to, when } = arrivalLine(visit)
  const headline = to ? `*${slackEscape(who)}* is here to see *${slackEscape(to)}*${when}` : `*${slackEscape(who)}* just arrived at ${slackEscape(visit.companyName)}${when}`
  const facts = chatFacts(visit).map(([label, value]) => `${label}: ${slackEscape(value)}`).join("\n")
  return { text: `${headline}${facts ? `\n${facts}` : ""}` }
}

export function teamsArrival(visit: ArrivalVisit) {
  const { who, to, when } = arrivalLine(visit)
  const headline = to ? `${who} is here to see ${to}${when}` : `${who} just arrived at ${visit.companyName}${when}`
  return {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          { type: "TextBlock", text: headline, weight: "Bolder", size: "Medium", wrap: true },
          { type: "FactSet", facts: chatFacts(visit).map(([title, value]) => ({ title, value })) },
        ],
      },
    }],
  }
}

/** Everything about the visit: the webhook goes wherever the company points it. */
export function webhookArrival(companyId: string, visit: ArrivalVisit) {
  return {
    event: "visitor.signed_in",
    company: { id: companyId, name: visit.companyName },
    visitor: {
      id: visit.id,
      name: visit.name,
      company: visit.visitorCompany,
      email: visit.email,
      phone: visit.phone,
      visiting: visit.hostName,
      purpose: visit.reason,
      signedInAt: new Date(visit.signedInAt).toISOString(),
      signedInOn: visit.via,
      agreedTo: visit.agreement,
    },
    sentAt: new Date().toISOString(),
  }
}

/** Tells Slack, Teams and the webhook that someone arrived. Never throws. */
export async function announceArrival(settings: VisitorSettings, companyId: string, visit: ArrivalVisit) {
  await Promise.allSettled([
    settings.slackUrl ? post(settings.slackUrl, slackArrival(visit)) : null,
    settings.teamsUrl ? post(settings.teamsUrl, teamsArrival(visit)) : null,
    settings.webhookUrl ? post(settings.webhookUrl, webhookArrival(companyId, visit)) : null,
  ])
}

/** Only the webhook hears about sign-outs; a chat message for every departure would be noise. */
export async function announceDeparture(settings: VisitorSettings, companyId: string, companyName: string, visit: { id: string; name: string; signedOutAt: number }) {
  if (!settings.webhookUrl) return
  await post(settings.webhookUrl, {
    event: "visitor.signed_out",
    company: { id: companyId, name: companyName },
    visitor: { id: visit.id, name: visit.name, signedOutAt: new Date(visit.signedOutAt).toISOString() },
    sentAt: new Date().toISOString(),
  }).catch(() => false)
}

/** A sample visit for the "Send test" buttons. */
export function sampleArrival(companyName: string): ArrivalVisit {
  return {
    id: "test",
    companyName,
    name: "Test Visitor",
    visitorCompany: "VisualCNS",
    email: "test@example.com",
    phone: "",
    hostName: "",
    reason: "Testing the connection",
    signedInAt: Date.now(),
    via: "tablet",
    agreement: null,
    minutesAgo: 0,
  }
}

export async function sendTest(kind: "slack" | "teams" | "webhook", raw: string, companyId: string, companyName: string) {
  const visit = sampleArrival(companyName)
  if (kind === "slack") return post(raw, slackArrival(visit))
  if (kind === "teams") return post(raw, teamsArrival(visit))
  return post(raw, { ...webhookArrival(companyId, visit), event: "test" })
}
