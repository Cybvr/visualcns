import Firecrawl from "firecrawl"
import type { Document, SearchResultWeb } from "firecrawl"
import OpenAI from "openai"

import { hostOf, type Ad, type Audience, type Competitors, type Customer, type Email, type FlowState, type FlowStep, type Person, type Research, type SocialPlan } from "@/lib/marketing-flow"

const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna"

export type FlowKeys = { firecrawl: string; openai: string }

type Row = { title: string; url: string; snippet: string }

const clip = (value: unknown, max: number) => (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim().slice(0, max)
const str = (value: unknown, max = 600) => clip(value, max)
const strs = (value: unknown, count: number, max = 120) => (Array.isArray(value) ? value.map((item) => str(item, max)).filter(Boolean).slice(0, count) : [])
const id = () => Math.random().toString(36).slice(2, 10)

function normalizeUrl(url: string) {
  const value = url.trim()
  return value.startsWith("http") ? value : `https://${value}`
}

const SYSTEM = [
  "You help a business find and reach new customers.",
  "Write in plain, simple English. No marketing buzzwords, no hype, no em dashes.",
  "Only use names, companies, people and links that appear in the evidence you are given, unless told otherwise.",
].join(" ")

class Tools {
  firecrawl: Firecrawl
  openai: OpenAI
  constructor(keys: FlowKeys) {
    this.firecrawl = new Firecrawl({ apiKey: keys.firecrawl, apiUrl: process.env.FIRECRAWL_API_URL || undefined })
    this.openai = new OpenAI({ apiKey: keys.openai })
  }

  async scrape(url: string, max: number) {
    try {
      const doc = await this.firecrawl.scrape(url, { formats: ["markdown"], onlyMainContent: true, timeout: 45000 })
      return { url, title: clip(doc.metadata?.title, 200), text: clip(doc.markdown, max) }
    } catch {
      return { url, title: "", text: "" }
    }
  }

  async search(query: string, limit: number): Promise<Row[]> {
    try {
      const data = await this.firecrawl.search(query, { limit, sources: ["web"] })
      return (data.web ?? []).flatMap((entry) => {
        const doc = entry as Partial<SearchResultWeb & Document>
        const url = doc.url || doc.metadata?.sourceURL || doc.metadata?.url
        return url ? [{ title: clip(doc.title || doc.metadata?.title, 160), url, snippet: clip(doc.description || doc.metadata?.description, 300) }] : []
      })
    } catch {
      return []
    }
  }

  /** One model call with a strict JSON shape. */
  async ask<T>(name: string, schema: Record<string, unknown>, instructions: string, input: string): Promise<Partial<T>> {
    const response = await this.openai.responses.create({
      model: MODEL,
      instructions: `${SYSTEM}\n${instructions}`,
      input: [{ role: "user", content: input }] as any,
      text: { format: { type: "json_schema", name, strict: true, schema: schema as any } },
    })
    try {
      return JSON.parse(response.output_text || "{}") as Partial<T>
    } catch {
      return {}
    }
  }
}

// Schema helpers.
const text = (description: string) => ({ type: "string", description })
const texts = (description: string) => ({ type: "array", items: { type: "string" }, description })
function object(properties: Record<string, unknown>) {
  return { type: "object", additionalProperties: false, properties, required: Object.keys(properties) }
}
const list = (properties: Record<string, unknown>, description: string) => ({ type: "array", description, items: object(properties) })

const rowsText = (rows: Row[]) => rows.map((row) => `- ${row.title} | ${row.url}\n  ${row.snippet}`).join("\n")

function about(state: FlowState) {
  const research = state.research
  let out = `BUSINESS: ${research?.name || ""}\nWebsite: ${state.website}\nWhat they do: ${research?.summary || ""}\nKeywords: ${[...(research?.keywords ?? []), ...(state.myKeywords ?? [])].join(", ")}\n`
  if (state.competitors) out += `Product: ${state.competitors.product}\nStrengths: ${state.competitors.points.join("; ")}\n`
  return out
}

function audiencesText(audiences: Audience[]) {
  return audiences.map((item) => `[${item.id}] ${item.name}: ${item.offer} Pain: ${item.pain}. Criteria: ${item.criteria.join(", ")}`).join("\n")
}

async function runResearch(tools: Tools, state: FlowState): Promise<Research> {
  const site = normalizeUrl(state.website)
  const host = hostOf(site)
  let links: string[] = []
  try {
    const map = await tools.firecrawl.map(site, { limit: 100 })
    links = (map.links ?? []).map((link) => link.url).filter((url) => hostOf(url) === host)
  } catch {
    links = []
  }
  const extra = ["about", "product", "service", "pricing", "solution"]
    .map((word) => links.find((link) => new URL(link).pathname.toLowerCase().includes(word)))
    .filter((link): link is string => Boolean(link))
    .filter((link, index, all) => all.indexOf(link) === index)
    .slice(0, 2)
  const pages = await Promise.all([tools.scrape(site, 6000), ...extra.map((url) => tools.scrape(url, 2000))])
  if (!pages.some((page) => page.text)) throw new Error("We couldn't read that website. Check the address and try again.")

  const raw = await tools.ask<{ name: string; summary: string; keywords: string[] }>(
    "research",
    object({
      name: text("The business name."),
      summary: text("Two plain sentences on what the business does and who for."),
      keywords: texts("Six to eight short keywords that describe what they offer."),
    }),
    "Read the website pages and describe the business.",
    pages.map((page) => `PAGE ${page.url}\n${page.title}\n${page.text}`).join("\n\n"),
  )
  return { name: str(raw.name, 120) || host, website: site, summary: str(raw.summary, 600), keywords: strs(raw.keywords, 8, 40) }
}

async function runCompetitors(tools: Tools, state: FlowState): Promise<Competitors> {
  const plan = await tools.ask<{ product: string; points: string[]; searches: string[] }>(
    "product",
    object({
      product: text("A short name for what they sell, e.g. 'Payroll software for small shops'."),
      points: texts("Three short things that set them apart."),
      searches: texts("Three searches a buyer would type to find this kind of business."),
    }),
    "Describe the product and how buyers search for it.",
    about(state),
  )
  const searches = strs(plan.searches, 3, 80)
  const own = hostOf(state.website)
  const rows = (await Promise.all(searches.map((query) => tools.search(query, 8)))).flat().filter((row) => hostOf(row.url) !== own)
  const raw = await tools.ask<{ competitors: { name: string; url: string }[] }>(
    "competitors",
    object({ competitors: list({ name: text("Company name."), url: text("Its website URL, copied from the results.") }, "Up to twelve companies that offer something similar. Skip directories, lists and articles.") }),
    "Pick the real competitors from the search results.",
    `${about(state)}\nSEARCH RESULTS\n${rowsText(rows)}`,
  )
  const known = new Set(rows.map((row) => hostOf(row.url)))
  const seen = new Set<string>()
  const competitors = (raw.competitors ?? [])
    .map((item) => ({ name: str(item.name, 80), url: str(item.url, 300) }))
    .filter((item) => item.name && known.has(hostOf(item.url)) && !seen.has(hostOf(item.url)) && seen.add(hostOf(item.url)))
    .slice(0, 12)
  return { product: str(plan.product, 120), points: strs(plan.points, 3, 160), searches, competitors }
}

async function runAudiences(tools: Tools, state: FlowState): Promise<Audience[]> {
  const raw = await tools.ask<{ audiences: Omit<Audience, "id">[] }>(
    "audiences",
    object({
      audiences: list(
        {
          name: text("One short phrase describing the people, the way Facebook or Google ads target them: age, job, and a place or habit. E.g. '30 year old restaurant owners in Lagos' or '27 year old lawyers who follow tech news'. Under ten words."),
          offer: text("One sentence on what the business offers these people."),
          pain: text("The problem these people have, in under twelve words."),
          criteria: texts("Three short signs a company employs or is run by these people."),
        },
        "Four or five audiences to go after, best first.",
      ),
    }),
    "Suggest the audiences this business should reach, described as people the way ad platforms target them.",
    `${about(state)}\nCompetitors: ${(state.competitors?.competitors ?? []).map((item) => item.name).join(", ")}`,
  )
  return (raw.audiences ?? []).slice(0, 5).map((item) => ({
    id: id(),
    name: str(item.name, 80),
    offer: str(item.offer, 240),
    pain: str(item.pain, 120),
    criteria: strs(item.criteria, 3, 80),
    examples: [],
  }))
}

async function runCustomers(tools: Tools, state: FlowState): Promise<Customer[]> {
  const audiences = state.audiences ?? []
  if (!audiences.length) throw new Error("Define audiences first.")
  const plan = await tools.ask<{ searches: { audienceId: string; query: string }[] }>(
    "customer_searches",
    object({ searches: list({ audienceId: text("The audience id in brackets."), query: text("A web search that finds companies in this group.") }, "Two searches for each audience.") }),
    "Write web searches that turn up real companies matching each audience. Aim for company websites and startup directories, not articles about the topic.",
    `${about(state)}\nAUDIENCES\n${audiencesText(audiences)}`,
  )
  const searches = (plan.searches ?? []).filter((item) => audiences.some((a) => a.id === item.audienceId)).slice(0, 10)
  const results = await Promise.all(searches.map(async (item) => ({ audienceId: item.audienceId, rows: await tools.search(str(item.query, 120), 10) })))
  const own = hostOf(state.website)
  const competitorHosts = new Set((state.competitors?.competitors ?? []).map((item) => hostOf(item.url)))
  const evidence = results.map((item) => `AUDIENCE ${item.audienceId}\n${rowsText(item.rows)}`).join("\n\n")

  const raw = await tools.ask<{ customers: Omit<Customer, "id">[] }>(
    "customers",
    object({
      customers: list(
        {
          audienceId: text("The audience id."),
          name: text("Company name."),
          url: text("The company's own website, from the results, or empty if only its name appears."),
          description: text("One sentence on what the company does."),
          country: text("Two-letter country code if known, else empty."),
          industry: text("The company's industry in two or three words, e.g. 'Software Development'."),
        },
        "Up to eight real companies for each audience. Only companies named in the results. No directories, publishers or competitors of the business.",
      ),
    }),
    "Pick the companies that could buy from this business.",
    `${about(state)}\nAUDIENCES\n${audiencesText(audiences)}\n\nSEARCH RESULTS\n${evidence}`,
  )
  const seen = new Set<string>()
  return (raw.customers ?? [])
    .filter((item) => audiences.some((a) => a.id === item.audienceId))
    .map((item) => ({ id: id(), audienceId: item.audienceId, name: str(item.name, 80), url: str(item.url, 300), description: str(item.description, 240), country: str(item.country, 2).toUpperCase(), industry: str(item.industry, 60) }))
    .filter((item) => {
      const key = hostOf(item.url) || item.name.toLowerCase()
      if (!item.name || seen.has(key) || hostOf(item.url) === own || competitorHosts.has(hostOf(item.url))) return false
      seen.add(key)
      return true
    })
    .slice(0, 24)
}

const PEOPLE_LIMIT = 12

async function runPeople(tools: Tools, state: FlowState): Promise<Person[]> {
  const customers = (state.customers ?? []).slice(0, PEOPLE_LIMIT)
  if (!customers.length) throw new Error("Find potential customers first.")
  const results = await Promise.all(customers.map(async (customer) => ({
    customer,
    rows: await tools.search(`site:linkedin.com/in "${customer.name}" founder OR CEO OR "head of marketing" OR CMO`, 5),
  })))
  const evidence = results.map(({ customer, rows }) => `COMPANY [${customer.id}] ${customer.name} ${customer.url}\n${rowsText(rows)}`).join("\n\n")
  const raw = await tools.ask<{ people: Omit<Person, "id">[] }>(
    "people",
    object({
      people: list(
        {
          customerId: text("The company id in brackets."),
          name: text("The person's full name."),
          title: text("Their job title."),
          company: text("The company name."),
          linkedin: text("Their LinkedIn URL, copied from the results."),
        },
        "At most one person per company: the founder, CEO or head of marketing. Skip a company when no result clearly shows someone who works there now.",
      ),
    }),
    "Find the person at each company who decides on buying this kind of service.",
    `${about(state)}\n${evidence}`,
  )
  const known = new Set(results.flatMap(({ rows }) => rows.map((row) => row.url)))
  const seen = new Set<string>()
  const people = (raw.people ?? [])
    .filter((item) => customers.some((c) => c.id === item.customerId) && known.has(item.linkedin) && !seen.has(item.customerId) && seen.add(item.customerId))
    .map((item) => ({ id: id(), customerId: item.customerId, name: str(item.name, 80), title: str(item.title, 120), company: str(item.company, 80), linkedin: str(item.linkedin, 300) }))
  if (!people.length) throw new Error("No decision makers found.")
  return people
}

const EMAIL_LIMIT = 3

async function runEmails(tools: Tools, state: FlowState): Promise<Email[]> {
  // Three emails: the first three decision makers.
  const people = (state.people ?? []).slice(0, EMAIL_LIMIT)
  if (!people.length) throw new Error("Find decision makers first.")
  const lines = people.map((person) => {
    const customer = state.customers?.find((c) => c.id === person.customerId)
    const audience = state.audiences?.find((a) => a.id === customer?.audienceId)
    return `[${person.id}] ${person.name}, ${person.title} at ${person.company}. Company: ${customer?.description || ""} (${customer?.url || ""}). Audience: ${audience?.name || ""}, pain: ${audience?.pain || ""}`
  })
  const raw = await tools.ask<{ emails: Omit<Email, "id">[] }>(
    "emails",
    object({
      emails: list(
        {
          personId: text("The person id in brackets."),
          subject: text("Two or three plain words."),
          body: text("The email. Greeting with their first name, one line about their company, one line on how the business helps, a small low-effort offer, then 'Best,' and the business name. Under 110 words. Paragraphs separated by blank lines."),
        },
        "One email for each person, three at most.",
      ),
    }),
    "Write a short first email to each person. Make it about them, not about the sender. No flattery, no buzzwords.",
    `${about(state)}\nPEOPLE\n${lines.join("\n")}`,
  )
  const seen = new Set<string>()
  return (raw.emails ?? [])
    .filter((item) => people.some((p) => p.id === item.personId) && !seen.has(item.personId) && seen.add(item.personId))
    .map((item) => ({ id: id(), personId: item.personId, subject: str(item.subject, 80), body: (typeof item.body === "string" ? item.body : "").trim().slice(0, 2000) }))
}

async function runSocial(tools: Tools, state: FlowState): Promise<SocialPlan> {
  const raw = await tools.ask<{ posts: { title: string; text: string }[] }>(
    "social",
    object({ posts: list({ title: text("What the post is about, in a few words."), text: text("The post, under 90 words, ready to publish.") }, "Three posts.") }),
    "Write social posts that the people in these audiences would find useful. Teach something or show proof. No hashtag walls.",
    `${about(state)}\nAUDIENCES\n${audiencesText(state.audiences ?? [])}`,
  )
  return { posts: (raw.posts ?? []).slice(0, 3).map((item) => ({ id: id(), title: str(item.title, 80), text: (typeof item.text === "string" ? item.text : "").trim().slice(0, 1200) })) }
}

async function runAds(tools: Tools, state: FlowState): Promise<Ad[]> {
  const audiences = state.audiences ?? []
  const raw = await tools.ask<{ ads: Omit<Ad, "id">[] }>(
    "ads",
    object({
      ads: list(
        {
          audienceId: text("The audience id in brackets."),
          headline: text("Under eight words."),
          text: text("Intro text above the ad, under 40 words."),
          cta: { type: "string", enum: ["Learn more", "Book a call", "Get a quote", "Sign up", "Download"] },
          jobTitles: texts("Three to five job titles to target."),
        },
        "One ad for each audience.",
      ),
    }),
    "Write one ad per audience. Speak to the audience's pain.",
    `${about(state)}\nAUDIENCES\n${audiencesText(audiences)}`,
  )
  const seen = new Set<string>()
  return (raw.ads ?? [])
    .filter((item) => audiences.some((a) => a.id === item.audienceId) && !seen.has(item.audienceId) && seen.add(item.audienceId))
    .map((item) => ({ id: id(), audienceId: item.audienceId, headline: str(item.headline, 80), text: str(item.text, 300), cta: str(item.cta, 20) || "Learn more", jobTitles: strs(item.jobTitles, 5, 60) }))
}

const RUNNERS: { [K in FlowStep]: (tools: Tools, state: FlowState) => Promise<NonNullable<FlowState[K]>> } = {
  research: runResearch,
  competitors: runCompetitors,
  audiences: runAudiences,
  customers: runCustomers,
  people: runPeople,
  emails: runEmails,
  social: runSocial,
  ads: runAds,
}

/** Runs one step on what the earlier steps found. */
export async function runFlowStep<K extends FlowStep>(keys: FlowKeys, step: K, state: FlowState): Promise<NonNullable<FlowState[K]>> {
  return RUNNERS[step](new Tools(keys), state)
}
