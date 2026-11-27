import Firecrawl from "firecrawl"

import { hostOf, type Customer, type Person } from "@/lib/marketing-flow"

/*
 * Email addresses for decision makers. With a Hunter key: the person's own
 * address and how sure Hunter is. Without one, or when Hunter finds nothing:
 * an address published on the company's own website, marked as such.
 */

export type EmailKeys = { hunter: string; firecrawl: string }

type Found = Pick<Person, "email" | "emailSource" | "emailScore">

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
// Addresses on a website that are never worth writing to.
const SKIP = /^(no-?reply|donotreply|privacy|abuse|postmaster|webmaster|unsubscribe|example|test|email|name|your)/i
// Inboxes most likely read by someone who decides, best first.
const PREFERRED = ["founder", "ceo", "hello", "hi", "contact", "info", "team", "sales", "partnerships", "marketing"]

function splitName(name: string) {
  const parts = name.replace(/\(.*?\)|,.*$/g, "").trim().split(/\s+/).filter(Boolean)
  return { first: parts[0] ?? "", last: parts.length > 1 ? parts[parts.length - 1] : "" }
}

async function fromHunter(key: string, domain: string, name: string): Promise<Found | null> {
  const { first, last } = splitName(name)
  if (!first || !last) return null
  const params = new URLSearchParams({ domain, first_name: first, last_name: last, api_key: key })
  try {
    const response = await fetch(`https://api.hunter.io/v2/email-finder?${params}`, { signal: AbortSignal.timeout(20000) })
    if (!response.ok) return null
    const body = (await response.json()) as { data?: { email?: string | null; score?: number | null } }
    const email = body.data?.email?.trim().toLowerCase()
    return email ? { email, emailSource: "hunter", emailScore: typeof body.data?.score === "number" ? body.data.score : undefined } : null
  } catch {
    return null
  }
}

/** The best address published on the company's homepage or contact page, on its own domain. */
async function fromWebsite(firecrawl: Firecrawl, url: string, domain: string, name: string): Promise<Found | null> {
  const site = url.startsWith("http") ? url : `https://${url}`
  const pages = [site, new URL("/contact", site).toString()]
  const texts = await Promise.all(pages.map(async (page) => {
    try {
      const doc = await firecrawl.scrape(page, { formats: ["markdown"], onlyMainContent: false, timeout: 30000 })
      return doc.markdown ?? ""
    } catch {
      return ""
    }
  }))
  const found = Array.from(new Set(texts.join("\n").match(EMAIL) ?? []))
    .map((email) => email.toLowerCase().replace(/^mailto:/, ""))
    .filter((email) => email.endsWith(`@${domain}`) || email.endsWith(`.${domain}`))
    .filter((email) => !SKIP.test(email) && !/\.(png|jpe?g|gif|svg|webp)$/.test(email))
  if (!found.length) return null
  const { first } = splitName(name)
  const own = first && found.find((email) => email.startsWith(`${first.toLowerCase()}@`) || email.startsWith(`${first.toLowerCase()}.`))
  const rank = (email: string) => {
    const index = PREFERRED.findIndex((word) => email.split("@")[0].startsWith(word))
    return index === -1 ? PREFERRED.length : index
  }
  const best = own || [...found].sort((a, b) => rank(a) - rank(b))[0]
  return { email: best, emailSource: "website" }
}

/** Finds an address for each person that doesn't have one yet. Returns the people with what was found. */
export async function findEmails(keys: EmailKeys, people: Person[], customers: Customer[]): Promise<Person[]> {
  const firecrawl = keys.firecrawl ? new Firecrawl({ apiKey: keys.firecrawl, apiUrl: process.env.FIRECRAWL_API_URL || undefined }) : null
  return Promise.all(people.map(async (person) => {
    if (person.email) return person
    const customer = customers.find((item) => item.id === person.customerId)
    const domain = hostOf(customer?.url ?? "")
    if (!customer || !domain) return { ...person, emailSource: "none" as const }
    const found = (keys.hunter ? await fromHunter(keys.hunter, domain, person.name) : null)
      ?? (firecrawl ? await fromWebsite(firecrawl, customer.url, domain, person.name) : null)
    return found ? { ...person, ...found } : { ...person, emailSource: "none" as const }
  }))
}
