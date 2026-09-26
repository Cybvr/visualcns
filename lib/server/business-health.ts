import Firecrawl from "firecrawl"
import type { Document, SearchResultNews, SearchResultWeb } from "firecrawl"
import OpenAI from "openai"

import type { BHAction, BHAnswer, BHBadgeTone, BHHue, BHIcon, BHItem, BHLevel, BHReport } from "@/lib/business-health"

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna"

export type CompanyFacts = {
  name: string
  website?: string
  industry?: string
  description?: string
  targetCustomers?: string
  location?: string
}

type Keys = { firecrawl: string; openai: string }

type Evidence = {
  pages: number
  links: string[]
  scraped: { url: string; title: string; description: string; status: number; words: number; excerpt: string }[]
  searches: { label: string; results: { title: string; url: string; snippet: string; date?: string }[] }[]
}

const clip = (text: string | undefined, max: number) => (text ?? "").replace(/\s+/g, " ").trim().slice(0, max)

function normalizeUrl(url?: string) {
  if (!url?.trim()) return ""
  const value = url.trim()
  return value.startsWith("http") ? value : `https://${value}`
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function pathOf(url: string) {
  try {
    return new URL(url).pathname.toLowerCase()
  } catch {
    return ""
  }
}

// Pages worth reading beyond the homepage, in order of preference.
const KEY_PAGES = ["about", "service", "product", "pricing", "solution", "contact", "blog", "case", "work", "portfolio"]

function pickKeyPages(home: string, links: string[], count: number) {
  const picked: string[] = []
  for (const word of KEY_PAGES) {
    const match = links.find((link) => link !== home && !picked.includes(link) && pathOf(link).includes(word))
    if (match) picked.push(match)
    if (picked.length >= count) break
  }
  return picked
}

function searchRows(data: { web?: unknown[]; news?: unknown[] }) {
  const rows: Evidence["searches"][number]["results"] = []
  for (const entry of [...(data.web ?? []), ...(data.news ?? [])]) {
    const doc = entry as Partial<SearchResultWeb & SearchResultNews & Document>
    const url = doc.url || doc.metadata?.sourceURL || doc.metadata?.url
    if (!url) continue
    rows.push({
      title: clip(doc.title || doc.metadata?.title, 160),
      url,
      snippet: clip(doc.description || doc.snippet || doc.metadata?.description, 300),
      date: doc.date,
    })
  }
  return rows
}

/** Crawls the company's site and searches the web around it. Every call is best-effort. */
async function gather(firecrawl: Firecrawl, company: CompanyFacts): Promise<Evidence> {
  const site = normalizeUrl(company.website)
  const host = site ? hostOf(site) : ""
  const place = company.location?.trim() || ""
  const field = company.industry?.trim() || company.description?.split(/[.,]/)[0]?.trim() || "business services"
  const year = new Date().getFullYear()

  const mapPromise = site
    ? firecrawl.map(site, { limit: 200, sitemap: "include" }).catch(() => ({ links: [] as SearchResultWeb[] }))
    : Promise.resolve({ links: [] as SearchResultWeb[] })

  const queries: { label: string; query: string; news?: boolean }[] = [
    { label: "Competitors", query: `${field} companies ${place}`.trim() },
    { label: "Competitor news", query: `${field} ${place} launch OR new service OR pricing`.trim(), news: true },
    { label: "Industry trends", query: `${field} industry trends ${year}`, news: true },
    { label: "Events", query: `${field} conference OR expo OR summit ${place} ${year}`.trim() },
    { label: "Tenders", query: `${field} tender OR RFP OR procurement ${place}`.trim() },
    { label: "Grants", query: `small business grant ${field} ${place} ${year}`.trim() },
    { label: "Partners", query: `${company.targetCustomers || field} partnership ${place}`.trim() },
    { label: "Mentions and reviews", query: `"${company.name}"${host ? ` -site:${host}` : ""} review OR news` },
  ]

  const searchPromise = Promise.all(
    queries.map(async (item) => {
      try {
        const data = await firecrawl.search(item.query, { limit: 6, sources: item.news ? ["news", "web"] : ["web"] })
        const results = searchRows(data).filter((row) => !host || hostOf(row.url) !== host)
        return { label: item.label, results }
      } catch {
        return { label: item.label, results: [] }
      }
    }),
  )

  const map = await mapPromise
  const links = Array.from(new Set((map.links ?? []).map((link) => link.url).filter(Boolean)))

  const pageUrls = site ? [site, ...pickKeyPages(site, links.filter((link) => hostOf(link) === host), 4)] : []
  const scrapePromise = Promise.all(
    pageUrls.map(async (url, index) => {
      try {
        const doc = await firecrawl.scrape(url, { formats: ["markdown"], onlyMainContent: true, timeout: 45000 })
        const text = doc.markdown ?? ""
        return {
          url,
          title: clip(doc.metadata?.title, 200),
          description: clip(doc.metadata?.description, 300),
          status: Number(doc.metadata?.statusCode ?? 200),
          words: text.split(/\s+/).filter(Boolean).length,
          excerpt: clip(text, index === 0 ? 6000 : 1800),
        }
      } catch {
        return { url, title: "", description: "", status: 0, words: 0, excerpt: "" }
      }
    }),
  )

  const [scraped, searches] = await Promise.all([scrapePromise, searchPromise])
  return { pages: links.length || scraped.length, links, scraped, searches }
}

// The model returns plain fields; the server turns them into the tab's icons and colours.
const LEVEL = { type: "string", enum: ["high", "medium", "low"] } as const
const text = (description: string) => ({ type: "string", description }) as const

function list(properties: Record<string, unknown>, description: string) {
  return {
    type: "array",
    description,
    items: { type: "object", additionalProperties: false, properties, required: Object.keys(properties) },
  }
}

const REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", description: "Overall business health, 0 to 100." },
    summary: text("Three plain sentences on what matters most for the business right now."),
    attention: list(
      {
        area: { type: "string", enum: ["positioning", "seo", "technical", "reputation", "content", "market"] },
        severity: LEVEL,
        title: text("Short name of the problem."),
        detail: text("One sentence on what was found."),
        more: text("One or two sentences on why it matters."),
        source: text("URL from the evidence where it was found, or empty."),
      },
      "Three to six problems found, most serious first.",
    ),
    opportunities: list(
      {
        kind: { type: "string", enum: ["partner", "event", "tender", "grant", "content", "market"] },
        fit: LEVEL,
        title: text("Short name. Use the real event, tender or company name when known."),
        detail: text("One sentence on what it is."),
        when: text("Date, deadline or timing if known, else empty."),
        more: text("Why it fits this business."),
        source: text("URL from the evidence, or empty."),
      },
      "Three to eight real opportunities from the evidence, best fit first.",
    ),
    market: list(
      {
        kind: { type: "string", enum: ["competitor", "launch", "trend", "news"] },
        title: text("What happened. Name the competitor when known."),
        detail: text("One sentence of detail."),
        when: text("When, if known, else empty."),
        source: text("URL from the evidence, or empty."),
      },
      "Two to six competitor moves, industry developments and trends.",
    ),
    online: list(
      {
        area: { type: "string", enum: ["website", "discoverability", "messaging", "offer", "content", "reputation"] },
        status: { type: "string", enum: ["good", "fair", "weak"] },
        title: text("Area name, e.g. 'Website health'."),
        detail: text("Short facts, e.g. 'Pages scanned: 42 · 3 missing descriptions'."),
        more: text("One or two sentences of assessment."),
      },
      "One entry for each of the six areas.",
    ),
    changes: list(
      {
        scope: { type: "string", enum: ["business", "market"] },
        title: text("What changed since the previous scan."),
        detail: text("One sentence of detail."),
      },
      "Changes compared with the previous scan. Empty when there is no previous scan.",
    ),
    actions: list(
      {
        priority: LEVEL,
        title: text("A clear next action."),
        why: text("One sentence on why it matters."),
        evidence: text("The finding that supports it."),
        steps: { type: "array", items: { type: "string" }, description: "Two to four short next steps." },
      },
      "Three to six recommended actions, highest priority first.",
    ),
  },
  required: ["score", "summary", "attention", "opportunities", "market", "online", "changes", "actions"],
} as const

const SYSTEM = `You are the business intelligence engine behind Business Health in VisualCNS.
You receive facts about one company, a crawl of its website and web search results about its market.
Turn them into a clear, honest report the business owner can act on.

Rules:
- Only state things supported by the evidence or the company facts. Never invent names, prices, dates or numbers.
- Opportunities must come from the search results. Skip results that are old, irrelevant or not a fit.
- When the evidence for a section is thin, return fewer items rather than filler.
- Use the page facts (titles, descriptions, status codes, word counts) for SEO and technical findings.
- Put a URL from the evidence in "source" whenever an item comes from one.
- Plain words, no jargon, no marketing speak. Short sentences.`

function describe(company: CompanyFacts, evidence: Evidence, previous: BHReport | null, newPages: string[], gonePages: string[]) {
  let out = "COMPANY\n"
  for (const [label, value] of Object.entries({
    Name: company.name,
    Website: company.website,
    Industry: company.industry,
    About: company.description,
    "Target customers": company.targetCustomers,
    Location: company.location,
  })) {
    if (value?.trim()) out += `${label}: ${value.trim()}\n`
  }

  out += `\nWEBSITE: ${evidence.pages} pages found\n`
  const titles = evidence.scraped.map((page) => page.title).filter(Boolean)
  const duplicateTitles = titles.length - new Set(titles).size
  out += `Scraped ${evidence.scraped.length} key pages. Missing descriptions: ${evidence.scraped.filter((page) => !page.description).length}. Duplicate titles: ${duplicateTitles}. Failed or error pages: ${evidence.scraped.filter((page) => page.status === 0 || page.status >= 400).length}.\n`
  for (const page of evidence.scraped) {
    out += `\n--- ${page.url} (status ${page.status || "failed"}, ${page.words} words)\nTitle: ${page.title || "(none)"}\nDescription: ${page.description || "(none)"}\n${page.excerpt}\n`
  }
  if (!company.website) out += "No website on record.\n"

  for (const search of evidence.searches) {
    out += `\nSEARCH: ${search.label}\n`
    if (!search.results.length) out += "(no results)\n"
    for (const row of search.results) out += `- ${row.title} | ${row.url}${row.date ? ` | ${row.date}` : ""}\n  ${row.snippet}\n`
  }

  if (previous) {
    out += `\nPREVIOUS SCAN (${previous.scannedAt})\nScore: ${previous.score}. Pages: ${previous.pages}.\n`
    out += `Summary: ${previous.summary}\n`
    out += `Problems: ${previous.attention.map((item) => item.title).join("; ")}\n`
    out += `Opportunities: ${previous.opportunities.map((item) => item.title).join("; ")}\n`
    out += `Market: ${previous.market.map((item) => item.title).join("; ")}\n`
    if (newPages.length) out += `New pages since then: ${newPages.slice(0, 15).join(", ")}\n`
    if (gonePages.length) out += `Pages removed since then: ${gonePages.slice(0, 15).join(", ")}\n`
  } else {
    out += "\nPREVIOUS SCAN: none, this is the first.\n"
  }
  return out
}

const ICONS: Record<string, { icon: BHIcon; tone: BHHue }> = {
  positioning: { icon: "positioning", tone: "red" },
  seo: { icon: "seo", tone: "red" },
  technical: { icon: "technical", tone: "red" },
  reputation: { icon: "reputation", tone: "red" },
  content: { icon: "content", tone: "amber" },
  market: { icon: "market", tone: "blue" },
  partner: { icon: "partner", tone: "green" },
  event: { icon: "event", tone: "purple" },
  tender: { icon: "tender", tone: "green" },
  grant: { icon: "grant", tone: "amber" },
  competitor: { icon: "competitor", tone: "blue" },
  launch: { icon: "launch", tone: "blue" },
  trend: { icon: "trend", tone: "blue" },
  news: { icon: "news", tone: "blue" },
  website: { icon: "website", tone: "blue" },
  discoverability: { icon: "seo", tone: "blue" },
  messaging: { icon: "messaging", tone: "blue" },
  offer: { icon: "offer", tone: "blue" },
}

const LEVEL_BADGE: Record<BHLevel, { label: string; tone: BHBadgeTone }> = {
  high: { label: "High", tone: "bad" },
  medium: { label: "Medium", tone: "warn" },
  low: { label: "Low", tone: "plain" },
}
const FIT_BADGE: Record<BHLevel, { label: string; tone: BHBadgeTone }> = {
  high: { label: "Strong fit", tone: "good" },
  medium: { label: "Good fit", tone: "warn" },
  low: { label: "Possible", tone: "plain" },
}
const STATUS_BADGE: Record<string, { label: string; tone: BHBadgeTone }> = {
  good: { label: "Good", tone: "good" },
  fair: { label: "Needs work", tone: "warn" },
  weak: { label: "Weak", tone: "bad" },
}

type Raw = Record<string, unknown>
const str = (value: unknown) => (typeof value === "string" ? value.trim() : "")
const level = (value: unknown): BHLevel => (value === "high" || value === "low" ? value : "medium")
const rows = (value: unknown) => (Array.isArray(value) ? (value as Raw[]) : [])

function item(prefix: string, index: number, fields: Omit<BHItem, "id">): BHItem {
  const clean: BHItem = { id: `${prefix}${index + 1}`, ...fields }
  for (const key of ["meta", "more", "source"] as const) if (!clean[key]) delete clean[key]
  return clean
}

function shape(raw: Raw, evidence: Evidence, newPages: string[], previous: BHReport | null): Omit<BHReport, "scannedAt"> {
  const icon = (key: string, fallback: string) => ICONS[key] ?? ICONS[fallback]

  const attention = rows(raw.attention).filter((row) => str(row.title)).map((row, index) =>
    item("i", index, { ...icon(str(row.area), "technical"), title: str(row.title), detail: str(row.detail), badge: LEVEL_BADGE[level(row.severity)], more: str(row.more), source: str(row.source) }),
  )
  const opportunities = rows(raw.opportunities).filter((row) => str(row.title)).map((row, index) =>
    item("o", index, { ...icon(str(row.kind), "market"), tone: ICONS[str(row.kind)]?.tone ?? "green", title: str(row.title), detail: str(row.detail), meta: str(row.when), badge: FIT_BADGE[level(row.fit)], more: str(row.more), source: str(row.source) }),
  )
  const market = rows(raw.market).filter((row) => str(row.title)).map((row, index) =>
    item("m", index, { ...icon(str(row.kind), "news"), title: str(row.title), detail: str(row.detail), meta: str(row.when), source: str(row.source) }),
  )
  const online = rows(raw.online).filter((row) => str(row.title)).map((row, index) =>
    item("p", index, { ...icon(str(row.area), "website"), title: str(row.title), detail: str(row.detail), badge: STATUS_BADGE[str(row.status)] ?? STATUS_BADGE.fair, more: str(row.more) }),
  )

  const changes: BHItem[] = []
  if (previous && newPages.length) {
    changes.push(item("c", 0, { icon: "page", tone: "green", title: `${newPages.length} new page${newPages.length === 1 ? "" : "s"} found on your website`, detail: newPages.slice(0, 3).map((url) => pathOf(url) || url).join(", "), meta: "Since last scan" }))
  }
  for (const row of rows(raw.changes).filter((row) => str(row.title))) {
    const isMarket = str(row.scope) === "market"
    changes.push(item("c", changes.length, { icon: isMarket ? "market" : "change", tone: isMarket ? "blue" : "purple", title: str(row.title), detail: str(row.detail), meta: "Since last scan" }))
  }

  const actions: BHAction[] = rows(raw.actions).filter((row) => str(row.title)).map((row, index) => ({
    id: `a${index + 1}`,
    priority: level(row.priority),
    title: str(row.title),
    why: str(row.why),
    evidence: str(row.evidence),
    steps: (Array.isArray(row.steps) ? row.steps : []).map(str).filter(Boolean).slice(0, 5),
  }))

  const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)))
  const sources = new Set([...evidence.scraped.map((page) => page.url), ...evidence.searches.flatMap((search) => search.results.map((row) => row.url))]).size

  return { score, pages: evidence.pages, sources, summary: str(raw.summary), attention, opportunities, market, online, changes, actions }
}

export async function runScan(keys: Keys, company: CompanyFacts, previous: { report: BHReport | null; links: string[] }) {
  const firecrawl = new Firecrawl({ apiKey: keys.firecrawl, apiUrl: process.env.FIRECRAWL_API_URL || undefined })
  const evidence = await gather(firecrawl, company)

  const before = new Set(previous.links)
  const newPages = previous.report && before.size ? evidence.links.filter((link) => !before.has(link)) : []
  const goneLinks = new Set(evidence.links)
  const gonePages = previous.report ? previous.links.filter((link) => !goneLinks.has(link)) : []

  const openai = new OpenAI({ apiKey: keys.openai })
  const response = await openai.responses.create({
    model: MODEL,
    instructions: SYSTEM,
    input: [{ role: "user", content: describe(company, evidence, previous.report, newPages, gonePages) }] as any,
    text: { format: { type: "json_schema", name: "business_health", strict: true, schema: REPORT_SCHEMA as any } },
  })

  let raw: Raw = {}
  try {
    raw = JSON.parse(response.output_text || "{}")
  } catch {
    raw = {}
  }

  const report: BHReport = { scannedAt: new Date().toISOString(), ...shape(raw, evidence, newPages, previous.report) }
  return { report, links: evidence.links.slice(0, 1000) }
}

const ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: text("A direct answer in two to five short plain sentences."),
    sources: { type: "array", items: { type: "string" }, description: "URLs from the evidence the answer relies on." },
  },
  required: ["text", "sources"],
} as const

/** Researches a free-form question about the company with a fresh web search. */
export async function answerQuestion(keys: Keys, company: CompanyFacts, report: BHReport | null, question: string): Promise<BHAnswer> {
  const firecrawl = new Firecrawl({ apiKey: keys.firecrawl, apiUrl: process.env.FIRECRAWL_API_URL || undefined })
  const context = [company.industry, company.location].filter((value) => value?.trim()).join(" ")
  let results: ReturnType<typeof searchRows> = []
  try {
    const data = await firecrawl.search(`${question} ${context}`.trim(), {
      limit: 5,
      sources: ["web", "news"],
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    })
    const docs = [...(data.web ?? []), ...(data.news ?? [])] as Partial<Document & SearchResultWeb>[]
    results = searchRows(data).map((row) => {
      const doc = docs.find((entry) => (entry.url || entry.metadata?.sourceURL) === row.url)
      return { ...row, snippet: clip(doc?.markdown, 1500) || row.snippet }
    })
  } catch {
    results = []
  }

  let input = `COMPANY: ${company.name}\n`
  if (company.website) input += `Website: ${company.website}\n`
  if (company.industry) input += `Industry: ${company.industry}\n`
  if (company.description) input += `About: ${company.description}\n`
  if (company.targetCustomers) input += `Target customers: ${company.targetCustomers}\n`
  if (company.location) input += `Location: ${company.location}\n`
  if (report) input += `\nLATEST SCAN SUMMARY: ${report.summary}\nProblems: ${report.attention.map((row) => row.title).join("; ")}\nOpportunities: ${report.opportunities.map((row) => row.title).join("; ")}\n`
  input += "\nWEB RESULTS\n"
  for (const row of results) input += `- ${row.title} | ${row.url}\n  ${row.snippet}\n`
  input += `\nQUESTION: ${question}`

  const openai = new OpenAI({ apiKey: keys.openai })
  const response = await openai.responses.create({
    model: MODEL,
    instructions: `${SYSTEM}\nAnswer the owner's question about their business using the scan and the web results. If the evidence does not answer it, say so and suggest what to look into.`,
    input: [{ role: "user", content: input }] as any,
    text: { format: { type: "json_schema", name: "answer", strict: true, schema: ANSWER_SCHEMA as any } },
  })

  let raw: Raw = {}
  try {
    raw = JSON.parse(response.output_text || "{}")
  } catch {
    raw = {}
  }
  const known = new Set(results.map((row) => row.url))
  const sources = (Array.isArray(raw.sources) ? raw.sources : []).map(str).filter((url) => known.has(url)).slice(0, 5)
  return { question, text: str(raw.text) || "I couldn't find a clear answer to that. Try asking in a different way.", sources }
}
