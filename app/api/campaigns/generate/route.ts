import Firecrawl from "firecrawl"
import type { Document, SearchResultWeb } from "firecrawl"
import OpenAI from "openai"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { requireAgencyId } from "@/lib/require-agency-id"
import { getAgencySecret, recordAgencyUsage } from "@/lib/server/agency-secrets"
import { ensureSubscription } from "@/lib/server/paystack"
import { planAccess } from "@/lib/subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna"
const CREATOR_APPS = ["Instagram", "TikTok", "YouTube"] as const

type CreatorApp = (typeof CREATOR_APPS)[number]
type CreatorEvidence = { handle: string; app: CreatorApp; url: string; title: string; snippet: string }
type GeneratedCreator = { handle: string; app: CreatorApp; followers: number; category: string; overlap: number }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } })
}

/** What Ngai can write, each one only when it's asked for. */
const PARTS = {
  angle: { type: "string", description: "One sentence: the single claim the campaign is built on, that people will want to talk about." },
  strategy: { type: "string", description: "One plain paragraph: who posts, roughly how many creators, when, where people are sent, and how success is judged." },
  announcement: { type: "string", description: "The client's own announcement post, ready to publish. Short lines, plain words, a clear call to action. No hashtags." },
  hooks: { type: "array", items: { type: "string" }, description: "Exactly three opening lines creators can post or adapt. One or two sentences each." },
  rosterTarget: { type: "string", description: "How many creators to aim for, as a range like 20–30." },
  creatorSuggestions: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["handle", "app", "followers", "category", "overlap"],
      properties: {
        handle: { type: "string", description: "The exact public account handle from the supplied search evidence, beginning with @." },
        app: { type: "string", enum: [...CREATOR_APPS] },
        followers: { type: "number", description: "Public follower count only when stated in the evidence; otherwise 0." },
        category: { type: "string", description: "A short plain-language content category." },
        overlap: { type: "number", description: "Campaign relevance from 0 to 100." },
      },
    },
    description: "Six to twelve relevant real public creator accounts selected only from the supplied Firecrawl search evidence, when enough verified results are available.",
  },
  tasks: { type: "array", items: { type: "string" }, description: "Six to ten short steps to run the campaign, in order, from lining up creators to reporting results. Each under ten words." },
} as const
type Part = keyof typeof PARTS
const isPart = (value: unknown): value is Part => typeof value === "string" && value in PARTS

const INSTRUCTIONS = `You plan social campaigns for a marketing agency. From the client's description, write the parts of the campaign you're asked for.
Use plain, everyday words a small business owner would use. No jargon, no hype words, no emojis, no hashtags.
Keep any facts (names, dates, places, links) exactly as given and never invent new ones.
For creator suggestions, use only the supplied Firecrawl evidence. Never invent or alter a handle. Return only accounts whose profile URL and handle appear in that evidence. Choose six to twelve of the strongest matches when enough evidence is available. Use 0 when a follower count is not explicitly available.`

const clip = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max)

function creatorFromResult(entry: Partial<Document & SearchResultWeb & { snippet?: string }>): CreatorEvidence | null {
  const url = entry.url || entry.metadata?.sourceURL || entry.metadata?.url
  if (!url) return null
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "")
    const segments = parsed.pathname.split("/").filter(Boolean).map(decodeURIComponent)
    let app: CreatorApp
    let name = ""
    if (host === "instagram.com") {
      if (!segments[0] || ["p", "reel", "reels", "stories", "explore"].includes(segments[0].toLowerCase())) return null
      app = "Instagram"
      name = segments[0]
    } else if (host === "tiktok.com") {
      if (!segments[0]?.startsWith("@")) return null
      app = "TikTok"
      name = segments[0].slice(1)
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (!segments[0]?.startsWith("@")) return null
      app = "YouTube"
      name = segments[0].slice(1)
    } else {
      return null
    }
    name = name.replace(/^@+/, "").trim()
    if (!name || name.length > 100) return null
    return {
      handle: `@${name}`,
      app,
      url,
      title: clip(entry.title || entry.metadata?.title, 180),
      snippet: clip(entry.description || entry.snippet || entry.metadata?.description, 500),
    }
  } catch {
    return null
  }
}

async function discoverCreators(openai: OpenAI, firecrawlKey: string, project: Record<string, unknown>, about: string) {
  const fallbackTopic = clip([project.title, about].filter(Boolean).join(" "), 220)
  const fallbackSearches: { app: CreatorApp; query: string }[] = CREATOR_APPS.map((app) => ({ app, query: `${fallbackTopic} creator ${app}` }))
  let searches = fallbackSearches
  try {
    const queryResponse = await openai.responses.create({
      model: MODEL,
      instructions: "Turn a campaign brief into concise web searches for real public social creator profiles. Preserve the market and location in the brief. Do not name or invent accounts.",
      input: `Campaign: ${clip(project.title, 160)}\nAbout: ${clip(about, 1800)}\nStrategy: ${clip(project.description, 800)}\nAngle: ${clip(project.angle, 500)}`,
      text: { format: { type: "json_schema", name: "creator_searches", strict: true, schema: {
        type: "object",
        additionalProperties: false,
        required: ["searches"],
        properties: {
          searches: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["app", "query"],
              properties: { app: { type: "string", enum: [...CREATOR_APPS] }, query: { type: "string" } },
            },
          },
        },
      } } },
    })
    const parsed = JSON.parse(queryResponse.output_text || "{}") as { searches?: { app?: CreatorApp; query?: string }[] }
    const valid = (parsed.searches ?? []).filter((item): item is { app: CreatorApp; query: string } => CREATOR_APPS.includes(item.app as CreatorApp) && Boolean(item.query?.trim()))
    if (valid.length) {
      const missingPlatforms = fallbackSearches.filter((fallback) => !valid.some((item) => item.app === fallback.app))
      searches = [...valid, ...missingPlatforms].slice(0, 4)
    }
  } catch {
    // The deterministic campaign-based queries above keep discovery available.
  }

  const firecrawl = new Firecrawl({ apiKey: firecrawlKey, apiUrl: process.env.FIRECRAWL_API_URL || undefined })
  const domains: Record<CreatorApp, string> = { Instagram: "instagram.com", TikTok: "tiktok.com", YouTube: "youtube.com/@" }
  const groups = await Promise.all(searches.map(async ({ app, query }) => {
    try {
      const response = await firecrawl.search(`${clip(query, 300)} site:${domains[app]}`, { limit: 10, sources: ["web"] })
      return (response.web ?? []).map((entry) => creatorFromResult(entry as Partial<Document & SearchResultWeb>)).filter((entry): entry is CreatorEvidence => Boolean(entry))
    } catch {
      return []
    }
  }))
  const unique = new Map<string, CreatorEvidence>()
  groups.flat().forEach((creator) => unique.set(`${creator.app}:${creator.handle.toLowerCase()}`, creator))
  return [...unique.values()].slice(0, 40)
}

function creatorTier(followers: number) {
  if (followers >= 100_000) return "Big account"
  if (followers >= 10_000) return "Mid account"
  return "Small account"
}

function publicFollowerCount(evidence?: CreatorEvidence) {
  if (!evidence) return 0
  const match = `${evidence.title} ${evidence.snippet}`.match(/([\d,.]+)\s*([km])?\s+(?:followers|subscribers)/i)
  if (!match) return 0
  const value = Number(match[1].replace(/,/g, ""))
  const multiplier = match[2]?.toLowerCase() === "m" ? 1_000_000 : match[2]?.toLowerCase() === "k" ? 1_000 : 1
  return Number.isFinite(value) ? Math.max(0, Math.round(value * multiplier)) : 0
}

/** Plans a campaign from its About, writing only the parts that were ticked. */
export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  if (!authorization.startsWith("Bearer ")) return json({ error: "Please sign in." }, 401)
  const input = (await request.json().catch(() => ({}))) as { projectId?: string; parts?: unknown[] }
  const projectId = input.projectId
  const parts = [...new Set((input.parts ?? Object.keys(PARTS)).filter(isPart))]
  if (!projectId) return json({ error: "Missing campaign." }, 400)
  if (!parts.length) return json({ error: "Pick at least one thing to write." }, 400)

  const { auth, db } = adminServices()
  let uid = ""
  try {
    uid = (await auth.verifyIdToken(authorization.slice(7))).uid
  } catch {
    return json({ error: "Please sign in again." }, 401)
  }
  const user = (await db.collection("users").doc(uid).get()).data()
  const projectRef = db.collection("projects").doc(projectId)
  const project = (await projectRef.get()).data()
  if (!user || !project) return json({ error: "Campaign not found." }, 404)

  let agencyId = ""
  try {
    agencyId = requireAgencyId(project.agencyId ? project : user)
  } catch {
    return json({ error: "This campaign has no agency." }, 400)
  }
  const role = String(user.role || "")
  const isAgency = role === "superadmin" || (role === "admin" && user.agencyId === agencyId)
  const isClient = user.agencyId === agencyId && user.companyId === project.companyId
  if (!isAgency && !isClient) return json({ error: "You can't change this campaign." }, 403)

  // Clients use it as part of their plan; the agency's own admins aren't limited.
  if (!isAgency) {
    const billing = await ensureSubscription(db, agencyId, project.companyId)
    if (!planAccess(billing as Parameters<typeof planAccess>[0]).allowed) return json({ error: "Upgrade to use Ngai.", upgrade: true }, 402)
  }

  const about = String(project.about || "").trim()
  if (!about) return json({ error: "Write the About first." }, 400)

  const apiKey = await getAgencySecret(agencyId, "OPENAI_API_KEY", process.env.OPENAI_API_KEY || "")
  if (!apiKey) return json({ error: "Ngai isn't set up yet." }, 503)

  const openai = new OpenAI({ apiKey })
  let creatorEvidence: CreatorEvidence[] = []
  if (parts.includes("creatorSuggestions")) {
    const firecrawlKey = await getAgencySecret(agencyId, "FIRECRAWL_API_KEY", process.env.FIRECRAWL_API_KEY || "")
    if (!firecrawlKey) return json({ error: "Creator research isn't set up yet. Add a Firecrawl API key." }, 503)
    creatorEvidence = await discoverCreators(openai, firecrawlKey, project, about)
    if (!creatorEvidence.length) return json({ error: "No public creator accounts were found. Add more audience and location detail to About, then try again." }, 404)
  }

  const schema = { type: "object", additionalProperties: false, required: parts, properties: Object.fromEntries(parts.map((part) => [part, PARTS[part]])) }
  let result: Partial<{ angle: string; strategy: string; announcement: string; hooks: string[]; rosterTarget: string; creatorSuggestions: GeneratedCreator[]; tasks: string[] }>
  try {
    const response = await openai.responses.create({
      model: MODEL,
      instructions: INSTRUCTIONS,
      input: [{ role: "user", content: [
        `Campaign: ${project.title || "Untitled"}`,
        `About:\n${about}`,
        // Parts already written, so new ones agree with them.
        project.angle && !parts.includes("angle") ? `Narrative and angle:\n${project.angle}` : "",
        project.description && !parts.includes("strategy") ? `Strategy:\n${project.description}` : "",
        creatorEvidence.length ? `Firecrawl creator evidence:\n${JSON.stringify(creatorEvidence)}` : "",
      ].filter(Boolean).join("\n\n") }],
      text: { format: { type: "json_schema", name: "campaign_plan", strict: true, schema } },
    })
    result = JSON.parse(response.output_text || "{}")
  } catch (error) {
    console.error("Campaign generation failed", error)
    return json({ error: "Ngai couldn't write it this time. Try again." }, 502)
  }

  if (result.creatorSuggestions) {
    const grounded = new Set(creatorEvidence.map((creator) => `${creator.app}:${creator.handle.toLowerCase()}`))
    result.creatorSuggestions = result.creatorSuggestions.filter((creator) => grounded.has(`${creator.app}:${creator.handle.toLowerCase()}`))
    if (!result.creatorSuggestions.length) return json({ error: "Creator research returned no verified profiles. Add more audience and location detail to About, then try again." }, 502)
  }

  const now = FieldValue.serverTimestamp()
  const patch: Record<string, unknown> = {}
  if (result.angle !== undefined) patch.angle = result.angle
  if (result.strategy !== undefined) patch.description = result.strategy
  if (result.rosterTarget !== undefined) patch.rosterTarget = result.rosterTarget
  if (result.creatorSuggestions) patch.creatorSuggestions = result.creatorSuggestions.slice(0, 12).map((creator) => creator.handle)
  if (Object.keys(patch).length) await projectRef.set({ ...patch, updatedAt: now }, { merge: true })

  const batch = db.batch()
  const scope = { agencyId, companyId: project.companyId, projectId }

  // Fresh Firecrawl results replace only untouched Ngai suggestions. Creators already added to the roster are preserved.
  if (result.creatorSuggestions) {
    const people = await db.collection("campaignPeople").where("projectId", "==", projectId).get()
    const replaceable = people.docs.filter((doc) => {
      const data = doc.data()
      return data.source === "ngai" && (data.onRoster === false || data.status === "Prospect")
    })
    replaceable.forEach((doc) => batch.delete(doc.ref))
    const replaceableIds = new Set(replaceable.map((doc) => doc.id))
    const existing = new Set(
      people.docs
        .filter((doc) => !replaceableIds.has(doc.id))
        .map((doc) => `${String(doc.data().app)}:${String(doc.data().handle).toLowerCase()}`),
    )
    for (const creator of result.creatorSuggestions.slice(0, 12)) {
      const handle = creator.handle.trim().replace(/^@+/, "")
      if (!handle || !CREATOR_APPS.includes(creator.app)) continue
      const normalizedHandle = `@${handle}`
      const key = `${creator.app}:${normalizedHandle.toLowerCase()}`
      if (existing.has(key)) continue
      existing.add(key)
      const evidence = creatorEvidence.find((item) => item.app === creator.app && item.handle.toLowerCase() === normalizedHandle.toLowerCase())
      const followers = publicFollowerCount(evidence)
      batch.set(db.collection("campaignPeople").doc(), {
        ...scope,
        handle: normalizedHandle,
        app: creator.app,
        followers,
        tier: creatorTier(followers),
        wave: "",
        status: "Prospect",
        postLink: "",
        pay: 0,
        currency: "USD",
        paid: false,
        labelled: false,
        category: clip(creator.category, 80),
        overlap: Math.max(0, Math.min(100, Math.round(Number(creator.overlap) || 0))),
        onRoster: true,
        source: "ngai",
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  // The announcement is updated in place; earlier draft hooks are replaced so running it again doesn't pile them up.
  if (result.announcement !== undefined || result.hooks) {
    const posts = await db.collection("campaignCreatives").where("projectId", "==", projectId).get()
    if (result.announcement !== undefined) {
      const announcement = posts.docs.find((doc) => doc.data().type === "text" && /announcement/i.test(String(doc.data().title)))
      if (announcement) batch.update(announcement.ref, { body: result.announcement, status: "Draft", updatedAt: now })
      else batch.set(db.collection("campaignCreatives").doc(), { ...scope, title: "Announcement post", url: "", type: "text", kind: "content", postedBy: "Founder", body: result.announcement, status: "Draft", createdAt: now, updatedAt: now })
    }
    if (result.hooks) {
      for (const doc of posts.docs) {
        const data = doc.data()
        if (data.type === "text" && /^hook\b/i.test(String(data.title)) && (data.status ?? "Draft") === "Draft") batch.delete(doc.ref)
      }
      result.hooks.slice(0, 3).forEach((hook, index) => {
        batch.set(db.collection("campaignCreatives").doc(), { ...scope, title: `Hook ${String.fromCharCode(65 + index)}`, url: "", type: "text", kind: "content", postedBy: "Roster", body: hook, status: "Draft", createdAt: now, updatedAt: now })
      })
    }
  }

  // Tasks Ngai wrote before and nobody has started are replaced too.
  if (result.tasks) {
    const tasks = await db.collection("tasks").where("projectId", "==", projectId).get()
    for (const doc of tasks.docs) {
      const data = doc.data()
      if (data.source === "ngai" && (data.status ?? "todo") === "todo") batch.delete(doc.ref)
    }
    const start = Date.now()
    result.tasks.slice(0, 12).forEach((name, index) => {
      // A second apart so they keep their order.
      const at = Timestamp.fromMillis(start + index * 1000)
      batch.set(db.collection("tasks").doc(), {
        ...scope, client: String(project.client || ""), project: String(project.title || ""),
        name, status: "todo", priority: "medium", dueDate: "", content: "", isPublic: false, source: "ngai", createdAt: at, updatedAt: at,
      })
    })
  }

  await batch.commit()
  void recordAgencyUsage(agencyId, "campaignGenerations").catch(() => undefined)

  return json({ patch: { ...patch } })
}
