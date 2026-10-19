import Firecrawl from "firecrawl"
import OpenAI from "openai"

import { adminServices } from "@/lib/firebase-admin"
import { requireAgencyId } from "@/lib/require-agency-id"
import { getAgencySecret, recordAgencyUsage } from "@/lib/server/agency-secrets"
import { MAX_LEADS_PER_RUN, SCHEDULE_FREQUENCIES, type LeadSchedule, type ScheduleDraft, type ScheduleFrequency, type ScheduleRunSummary } from "@/lib/lead-schedules"

export type { LeadSchedule, ScheduleDraft, ScheduleRunSummary }

const SCHEDULES = "leadSchedules"
const DRAFTS = "scheduleDrafts"
const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna"

type Db = ReturnType<typeof adminServices>["db"]

const text = (value: unknown) => (typeof value === "string" ? value : "")
const clip = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max)

export async function authorizeScheduleAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Please sign in again.")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token)
  const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
  return { uid: decoded.uid, agencyId: requireAgencyId(user), db }
}

/** The fields an admin can set, cleaned up. */
export function scheduleFields(body: Record<string, unknown>) {
  const frequency = SCHEDULE_FREQUENCIES.some((item) => item.value === body.frequency) ? (body.frequency as ScheduleFrequency) : "daily"
  return {
    name: clip(body.name, 80),
    query: clip(body.query, 200),
    pitch: String(body.pitch ?? "").trim().slice(0, 2000),
    frequency,
    limit: Math.min(Math.max(Math.round(Number(body.limit) || 10), 1), MAX_LEADS_PER_RUN),
    active: body.active !== false,
  }
}

export function toSchedule(id: string, data: Record<string, unknown>): LeadSchedule {
  const fields = scheduleFields(data)
  const lastRun = data.lastRun && typeof data.lastRun === "object" ? (data.lastRun as ScheduleRunSummary) : null
  return {
    ...fields,
    id,
    agencyId: text(data.agencyId),
    createdBy: text(data.createdBy),
    lastRunAt: text(data.lastRunAt),
    lastRun,
    createdAt: text(data.createdAt),
    updatedAt: text(data.updatedAt),
  }
}

export function toDraft(id: string, data: Record<string, unknown>): ScheduleDraft {
  const status = data.status === "sent" || data.status === "discarded" ? data.status : "pending"
  return {
    id,
    agencyId: text(data.agencyId),
    scheduleId: text(data.scheduleId),
    scheduleName: text(data.scheduleName),
    leadId: text(data.leadId),
    to: text(data.to),
    company: text(data.company),
    website: text(data.website),
    subject: text(data.subject),
    body: text(data.body),
    status,
    createdAt: text(data.createdAt),
  }
}

export function scheduleCollections(db: Db) {
  return { schedules: db.collection(SCHEDULES), drafts: db.collection(DRAFTS) }
}

/** Whether a schedule should run on the daily cron. Days are counted in UTC. */
export function isScheduleDue(schedule: LeadSchedule, now = new Date()) {
  if (!schedule.active || !schedule.query) return false
  const last = schedule.lastRunAt ? new Date(schedule.lastRunAt) : null
  const ranToday = last !== null && last.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)
  if (schedule.frequency === "weekly") return !last || now.getTime() - last.getTime() >= 6.5 * 24 * 60 * 60 * 1000
  if (schedule.frequency === "weekdays" && (now.getUTCDay() === 0 || now.getUTCDay() === 6)) return false
  return !ranToday
}

// --- Google Places -----------------------------------------------------------

type Place = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  rating?: number
  userRatingCount?: number
  primaryTypeDisplayName?: { text?: string }
  addressComponents?: Array<{ longText?: string; types?: string[] }>
}

const PLACE_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
  "places.addressComponents",
  "nextPageToken",
].join(",")

async function searchPlaces(apiKey: string, textQuery: string, pageToken?: string) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": PLACE_FIELDS },
    body: JSON.stringify({ textQuery, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
    cache: "no-store",
  })
  const data = (await response.json().catch(() => ({}))) as { places?: Place[]; nextPageToken?: string; error?: { message?: string } }
  if (!response.ok) throw new Error(data.error?.message || `Google Places returned ${response.status}.`)
  return data
}

type FoundBusiness = {
  placeId: string
  company: string
  category: string
  website: string
  companyPhone: string
  address: string
  city: string
  state: string
  country: string
  reviews: string
}

function businessFromPlace(place: Place): FoundBusiness {
  const part = (type: string) => place.addressComponents?.find((item) => item.types?.includes(type))?.longText || ""
  return {
    placeId: place.id || "",
    company: clip(place.displayName?.text, 160),
    category: clip(place.primaryTypeDisplayName?.text, 80),
    website: place.websiteUri || "",
    companyPhone: place.internationalPhoneNumber || place.nationalPhoneNumber || "",
    address: clip(place.formattedAddress, 300),
    city: part("locality") || part("postal_town"),
    state: part("administrative_area_level_1"),
    country: part("country"),
    reviews: place.rating ? `${place.rating} (${place.userRatingCount ?? 0})` : "",
  }
}

// --- Telling new businesses from ones already in Leads ------------------------

function hostOf(url: string) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return ""
  }
}

const phoneKey = (value: string) => value.replace(/\D/g, "").slice(-9)
const nameKey = (company: string, city: string) => `${company}|${city}`.toLowerCase().replace(/[^a-z0-9|]/g, "")

type KnownLeads = { placeIds: Set<string>; hosts: Set<string>; phones: Set<string>; emails: Set<string>; names: Set<string> }

async function knownLeads(db: Db, agencyId: string): Promise<KnownLeads> {
  const snapshot = await db.collection("leads").where("agencyId", "==", agencyId).select("placeId", "website", "email", "phone", "companyPhone", "company", "city").get()
  const known: KnownLeads = { placeIds: new Set(), hosts: new Set(), phones: new Set(), emails: new Set(), names: new Set() }
  for (const item of snapshot.docs) {
    const data = item.data()
    if (data.placeId) known.placeIds.add(String(data.placeId))
    const host = hostOf(text(data.website))
    if (host) known.hosts.add(host)
    for (const phone of [text(data.phone), text(data.companyPhone)]) if (phoneKey(phone).length >= 7) known.phones.add(phoneKey(phone))
    if (data.email) known.emails.add(String(data.email).toLowerCase())
    if (data.company) known.names.add(nameKey(text(data.company), text(data.city)))
  }
  return known
}

/** Checks a business against Leads and, when it's new, remembers it so the same run can't add it twice. */
function claimIfNew(known: KnownLeads, business: FoundBusiness) {
  const host = hostOf(business.website)
  const phone = phoneKey(business.companyPhone)
  const name = nameKey(business.company, business.city)
  if (
    (business.placeId && known.placeIds.has(business.placeId)) ||
    (host && known.hosts.has(host)) ||
    (phone.length >= 7 && known.phones.has(phone)) ||
    known.names.has(name)
  ) return false
  if (business.placeId) known.placeIds.add(business.placeId)
  if (host) known.hosts.add(host)
  if (phone.length >= 7) known.phones.add(phone)
  known.names.add(name)
  return true
}

// --- Reading the business's website ------------------------------------------

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const JUNK_EMAIL = /\.(png|jpe?g|gif|svg|webp)$|@(example|sentry|wixpress|domain|email)\.|^(name|your|you|user|someone)@/i
const GENERIC_EMAIL = /^(info|hello|contact|enquiries|enquiry|inquiries|sales|admin|office|reception|bookings)@/

function pickEmail(texts: string[], host: string) {
  const found = new Set<string>()
  for (const value of texts) {
    for (const match of value.matchAll(EMAIL_PATTERN)) {
      const email = match[0].toLowerCase()
      if (!JUNK_EMAIL.test(email)) found.add(email)
    }
  }
  const all = [...found]
  const onSite = all.filter((email) => {
    const domain = email.split("@")[1]
    return Boolean(host) && (domain === host || domain.endsWith(`.${host}`) || host.endsWith(`.${domain}`))
  })
  const pool = onSite.length ? onSite : all
  return pool.find((email) => GENERIC_EMAIL.test(email)) || pool[0] || ""
}

async function readWebsite(firecrawl: Firecrawl, website: string) {
  const host = hostOf(website)
  const home = await firecrawl.scrape(website, { formats: ["markdown", "links"], timeout: 30_000 })
  const texts = [home.markdown || "", ...(home.links || [])]
  let email = pickEmail(texts, host)
  if (!email) {
    // Most small sites keep the address on a contact or about page.
    const contactPage = (home.links || []).find((link) => {
      try {
        const url = new URL(link)
        return hostOf(url.hostname) === host && /contact|about|reach|get-in-touch|enquir/i.test(url.pathname)
      } catch {
        return false
      }
    })
    if (contactPage) {
      const page = await firecrawl.scrape(contactPage, { formats: ["markdown", "links"], timeout: 30_000 })
      email = pickEmail([page.markdown || "", ...(page.links || [])], host)
    }
  }
  return {
    email,
    description: clip(home.metadata?.description, 300),
    content: String(home.markdown || "").slice(0, 4000),
  }
}

// --- Writing the first email -------------------------------------------------

const DRAFT_INSTRUCTIONS = `You write a short first email from an agency to a business it has never worked with.
Use what the agency offers, as given. Mention one specific, true detail from the business's own website so it's clear the email was written for them.
Keep it under 120 words. Plain, everyday words. No hype, no emojis, no exclamation marks, no flattery.
Never invent facts, numbers, clients or results. Leave out anything you aren't sure of.
Start with "Hi" and the business name. End with one simple question.
After the question, add a last line saying that if they'd rather not hear from us, they can reply and we won't email again.
Do not add a sign-off or signature.`

const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "body", "summary"],
  properties: {
    subject: { type: "string", description: "A short, plain subject line under eight words. No clickbait." },
    body: { type: "string", description: "The email as plain text, paragraphs separated by a blank line." },
    summary: { type: "string", description: "One sentence on what this business does, for the agency's notes." },
  },
} as const

async function writeDraft(openai: OpenAI, schedule: LeadSchedule, business: FoundBusiness, site: { description: string; content: string }) {
  const response = await openai.responses.create({
    model: MODEL,
    instructions: DRAFT_INSTRUCTIONS,
    input: [{
      role: "user",
      content: [
        `What the agency offers:\n${schedule.pitch || "Marketing help for local businesses."}`,
        `Business: ${business.company}`,
        business.category ? `Kind of business: ${business.category}` : "",
        business.address ? `Address: ${business.address}` : "",
        business.reviews ? `Google rating: ${business.reviews}` : "",
        site.description ? `Website description: ${site.description}` : "",
        site.content ? `Website content:\n${site.content}` : "",
      ].filter(Boolean).join("\n\n"),
    }],
    text: { format: { type: "json_schema", name: "lead_email", strict: true, schema: DRAFT_SCHEMA } },
  })
  const result = JSON.parse(response.output_text || "{}") as { subject?: string; body?: string; summary?: string }
  if (!result.subject?.trim() || !result.body?.trim()) throw new Error("The email came back empty.")
  return { subject: clip(result.subject, 150), body: result.body.trim().slice(0, 4000), summary: clip(result.summary, 300) }
}

// --- Running a schedule ------------------------------------------------------

async function inChunks<T>(items: T[], size: number, work: (item: T) => Promise<void>) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(work))
  }
}

/** Searches Google Maps, adds the businesses not already in Leads, and drafts an email to each one with an address. */
export async function runSchedule(schedule: LeadSchedule): Promise<ScheduleRunSummary> {
  const { db } = adminServices()
  const at = new Date().toISOString()
  const summary: ScheduleRunSummary = { at, found: 0, added: 0, drafted: 0 }

  try {
    const [placesKey, firecrawlKey, openaiKey] = await Promise.all([
      getAgencySecret(schedule.agencyId, "GOOGLE_PLACES_API_KEY", process.env.GOOGLE_PLACES_API_KEY || ""),
      getAgencySecret(schedule.agencyId, "FIRECRAWL_API_KEY", process.env.FIRECRAWL_API_KEY || ""),
      getAgencySecret(schedule.agencyId, "OPENAI_API_KEY", process.env.OPENAI_API_KEY || ""),
    ])
    if (!placesKey) throw new Error("Add a Google Places API key first.")
    if (!firecrawlKey) throw new Error("Add a Firecrawl API key first.")
    if (!openaiKey) throw new Error("Add an OpenAI API key first.")

    const firecrawl = new Firecrawl({ apiKey: firecrawlKey, apiUrl: process.env.FIRECRAWL_API_URL || undefined })
    const openai = new OpenAI({ apiKey: openaiKey })
    const known = await knownLeads(db, schedule.agencyId)
    const { drafts } = scheduleCollections(db)

    let pageToken: string | undefined
    for (let page = 0; page < 3 && summary.added < schedule.limit; page += 1) {
      const result = await searchPlaces(placesKey, schedule.query, pageToken)
      const businesses = (result.places ?? []).map(businessFromPlace).filter((business) => business.company)
      summary.found += businesses.length
      const fresh = businesses.filter((business) => claimIfNew(known, business)).slice(0, schedule.limit - summary.added)
      summary.added += fresh.length

      await inChunks(fresh, 5, async (business) => {
        let site = { email: "", description: "", content: "" }
        if (business.website) {
          try {
            site = await readWebsite(firecrawl, business.website)
          } catch (error) {
            console.warn("Schedule could not read website", business.website, error)
          }
        }
        // An address already in Leads under another name still means we've met them.
        const email = site.email && !known.emails.has(site.email) ? site.email : ""
        if (email) known.emails.add(email)

        let draft: Awaited<ReturnType<typeof writeDraft>> | null = null
        if (email) {
          try {
            draft = await writeDraft(openai, schedule, business, site)
          } catch (error) {
            console.warn("Schedule could not write a draft", business.company, error)
          }
        }

        const now = new Date().toISOString()
        const leadRef = db.collection("leads").doc()
        const batch = db.batch()
        batch.set(leadRef, {
          ...business,
          name: business.company,
          email,
          notes: draft?.summary || site.description,
          source: `Schedule: ${schedule.name}`,
          stage: "new",
          value: 0,
          doNotCall: false,
          agencyId: schedule.agencyId,
          createdBy: schedule.createdBy,
          createdAt: now,
          updatedAt: now,
        })
        if (draft) {
          batch.set(drafts.doc(), {
            agencyId: schedule.agencyId,
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            leadId: leadRef.id,
            to: email,
            company: business.company,
            website: business.website,
            subject: draft.subject,
            body: draft.body,
            status: "pending",
            createdAt: now,
          })
          summary.drafted += 1
        }
        await batch.commit()
      })

      pageToken = result.nextPageToken
      if (!pageToken) break
    }
    if (summary.added) await recordAgencyUsage(schedule.agencyId, "scheduleLeads", summary.added)
  } catch (error) {
    summary.error = error instanceof Error ? error.message : "The schedule could not run."
  }

  await db.collection(SCHEDULES).doc(schedule.id).set({ lastRunAt: at, lastRun: summary, updatedAt: at }, { merge: true })
  return summary
}
