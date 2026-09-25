import { requireAgencyId } from "@/lib/require-agency-id"
import OpenAI from "openai"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth as getAdminAuth } from "firebase-admin/auth"
import { FieldValue, getFirestore as getAdminFirestore } from "firebase-admin/firestore"
import { getAgencySecret, recordAgencyUsage } from "@/lib/server/agency-secrets"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna"

// How long a saved set stays fresh before it is regenerated on the next open.
const FRESH_FOR_MS = 7 * 24 * 60 * 60 * 1000

// The four things the engine covers. Order here is the order the portal shows.
const CATEGORIES = [
  { key: "website", label: "Website", brief: "the client's website: SEO, speed, copy, structure, conversion, or a refresh when it is stale or missing." },
  { key: "social", label: "Social media", brief: "the client's social presence: which platforms to be on, posting cadence, content types, and campaign ideas." },
  { key: "brand", label: "Brand & design", brief: "the client's visual identity: logo, brand consistency across channels, and missing or dated design assets." },
  { key: "content", label: "Content & growth", brief: "marketing that grows the client: email, ads, blog or video, and seasonal or goal-driven campaigns." },
] as const

type CategoryKey = (typeof CATEGORIES)[number]["key"]

function adminServices() {
  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
  return { auth: getAdminAuth(app), db: getAdminFirestore(app) }
}

const RECOMMENDATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    categories: {
      type: "array",
      description: "Exactly four categories, one per area, in the order website, social, brand, content.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: { type: "string", enum: CATEGORIES.map((category) => category.key) },
          summary: { type: "string", description: "One plain sentence on where this area stands for the client." },
          items: {
            type: "array",
            description: "Two or three concrete next moves for this area.",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string", description: "A short, specific recommendation, e.g. 'Add a services page'." },
                detail: { type: "string", description: "One or two sentences on why it matters and what it involves." },
                impact: { type: "string", enum: ["high", "medium", "low"] },
                effort: { type: "string", enum: ["quick", "moderate", "involved"] },
              },
              required: ["title", "detail", "impact", "effort"],
            },
          },
        },
        required: ["key", "summary", "items"],
      },
    },
  },
  required: ["categories"],
} as const

const SYSTEM_PROMPT = `You are the recommendations engine for VisualCNS, a creative and marketing agency.
You look at one client's account and suggest the agency's best next moves for that client, across four
areas only: website, social media, brand and design, and content and growth.

Write for the client to read in their portal. Be concrete and specific to this client's industry and the
work already on their account. Never invent facts about the client you were not given; when a signal is
missing, recommend the sensible first step for a business like theirs rather than guessing details.
Make each recommendation a clear next action, tie impact and effort honestly, and keep the language plain
and free of jargon. Return two or three items per area. Do not mention prices.`

function line(label: string, value: unknown) {
  const text = typeof value === "string" ? value.trim() : ""
  return text ? `${label}: ${text}\n` : ""
}

/** Builds a compact, safe description of the client for the model. */
async function buildContext(db: FirebaseFirestore.Firestore, agencyId: string, companyId: string) {
  const [orgSnap, projectsSnap, tasksSnap, docsSnap] = await Promise.all([
    db.collection("organizations").doc(companyId).get(),
    db.collection("projects").where("agencyId", "==", agencyId).where("companyId", "==", companyId).limit(50).get(),
    db.collection("tasks").where("agencyId", "==", agencyId).where("companyId", "==", companyId).limit(80).get(),
    db.collection("companyDocuments").where("agencyId", "==", agencyId).where("companyId", "==", companyId).limit(30).get(),
  ])

  const org = orgSnap.data() || {}
  let context = "CLIENT\n"
  context += line("Name", org.name)
  context += line("Industry", org.industry)
  context += line("Location", org.location)
  context += line("Website", org.website)
  context += line("About", org.description)

  const projects = projectsSnap.docs.map((doc) => doc.data())
  if (projects.length) {
    context += `\nPROJECTS (${projects.length})\n`
    for (const project of projects.slice(0, 15)) {
      const bits = [project.title, project.service, project.status].filter((value) => typeof value === "string" && value.trim())
      if (bits.length) context += `- ${bits.join(" · ")}\n`
    }
  }

  const tasks = tasksSnap.docs.map((doc) => doc.data())
  const openTasks = tasks.filter((task) => task.status && task.status !== "done").length
  if (tasks.length) context += `\nTASKS: ${tasks.length} total, ${openTasks} open\n`

  const docs = docsSnap.docs.map((doc) => doc.data())
  if (docs.length) {
    context += `\nDOCUMENTS (${docs.length})\n`
    for (const doc of docs.slice(0, 12)) {
      const bits = [doc.title, doc.kind].filter((value) => typeof value === "string" && value.trim())
      if (bits.length) context += `- ${bits.join(" · ")}\n`
    }
  }

  return { context, clientName: typeof org.name === "string" ? org.name : "" }
}

type StoredItem = { title: string; detail: string; impact: string; effort: string }
type StoredCategory = { key: CategoryKey; label: string; summary: string; items: StoredItem[] }
type StoredSet = { generatedAt: string; categories: StoredCategory[] }

/** Reshapes the model output into the fixed four-category order the portal expects. */
function normalize(raw: unknown): StoredCategory[] {
  const byKey = new Map<string, { summary?: unknown; items?: unknown }>()
  const list = (raw as { categories?: unknown })?.categories
  if (Array.isArray(list)) {
    for (const entry of list) {
      const key = (entry as { key?: unknown })?.key
      if (typeof key === "string") byKey.set(key, entry as { summary?: unknown; items?: unknown })
    }
  }
  return CATEGORIES.map((category) => {
    const found = byKey.get(category.key)
    const rawItems = Array.isArray(found?.items) ? found?.items : []
    const items: StoredItem[] = (rawItems as unknown[])
      .map((item) => {
        const value = item as Record<string, unknown>
        return {
          title: typeof value.title === "string" ? value.title.trim() : "",
          detail: typeof value.detail === "string" ? value.detail.trim() : "",
          impact: ["high", "medium", "low"].includes(String(value.impact)) ? String(value.impact) : "medium",
          effort: ["quick", "moderate", "involved"].includes(String(value.effort)) ? String(value.effort) : "moderate",
        }
      })
      .filter((item) => item.title)
    return {
      key: category.key,
      label: category.label,
      summary: typeof found?.summary === "string" ? (found.summary as string).trim() : "",
      items,
    }
  })
}

async function generate(apiKey: string, context: string, clientName: string): Promise<StoredCategory[]> {
  const client = new OpenAI({ apiKey })
  const areas = CATEGORIES.map((category) => `- ${category.label} (key "${category.key}"): ${category.brief}`).join("\n")
  const response = await client.responses.create({
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: `Recommend next moves for ${clientName || "this client"} across these four areas:\n${areas}\n\nWhat we know about them:\n\n${context}`,
      },
    ] as any,
    text: {
      format: {
        type: "json_schema",
        name: "recommendations",
        strict: true,
        schema: RECOMMENDATION_SCHEMA as any,
      },
    },
  })

  let parsed: unknown = {}
  try {
    parsed = JSON.parse(response.output_text || "{}")
  } catch {
    parsed = {}
  }
  return normalize(parsed)
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } })
}

/** Resolves the signed-in caller and the company these recommendations are for. */
async function resolveCaller(request: Request, wantedCompanyId: string) {
  const authorization = request.headers.get("authorization") || ""
  if (!authorization.startsWith("Bearer ")) return { error: jsonResponse({ error: "Please sign in." }, 401) }

  const { auth, db } = adminServices()
  let uid = ""
  try {
    uid = (await auth.verifyIdToken(authorization.slice(7))).uid
  } catch {
    return { error: jsonResponse({ error: "Could not verify your account." }, 401) }
  }

  const userData = (await db.collection("users").doc(uid).get()).data()
  if (!userData) return { error: jsonResponse({ error: "Your account is not ready." }, 403) }

  const role = String(userData.role || "")
  const isAdmin = role === "admin" || role === "superadmin"
  const agencyId = requireAgencyId(userData)
  const ownCompanyId = typeof userData.companyId === "string" ? userData.companyId : ""

  // A client only ever sees their own company. An admin may pass a companyId to
  // read for a specific client; without one they fall back to their own link.
  const companyId = isAdmin ? wantedCompanyId || ownCompanyId : ownCompanyId
  if (!companyId) return { error: jsonResponse({ error: "No client company is linked to this view." }, 400) }
  if (!isAdmin && wantedCompanyId && wantedCompanyId !== ownCompanyId) {
    return { error: jsonResponse({ error: "You can only see your own recommendations." }, 403) }
  }

  return { db, agencyId, companyId }
}

async function readStored(db: FirebaseFirestore.Firestore, companyId: string): Promise<StoredSet | null> {
  const snap = await db.collection("portalInsights").doc(companyId).get()
  if (!snap.exists) return null
  const data = snap.data() as StoredSet | undefined
  if (!data || !Array.isArray(data.categories)) return null
  return data
}

async function buildAndStore(db: FirebaseFirestore.Firestore, agencyId: string, companyId: string): Promise<Response> {
  const apiKey = await getAgencySecret(agencyId, "OPENAI_API_KEY", process.env.OPENAI_API_KEY || "")
  if (!apiKey) return jsonResponse({ error: "The recommendations engine is not set up yet." }, 503)

  const { context, clientName } = await buildContext(db, agencyId, companyId)
  let categories: StoredCategory[]
  try {
    categories = await generate(apiKey, context, clientName)
  } catch (error) {
    console.error("Recommendations generation failed", error)
    return jsonResponse({ error: "Could not put recommendations together right now." }, 502)
  }

  const generatedAt = new Date().toISOString()
  await db.collection("portalInsights").doc(companyId).set(
    { agencyId, companyId, generatedAt, categories, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  )
  void recordAgencyUsage(agencyId, "insightRuns").catch(() => undefined)
  return jsonResponse({ generatedAt, categories, cached: false })
}

/** Read the saved set, generating a fresh one only when it is missing or stale. */
export async function GET(request: Request) {
  const wantedCompanyId = new URL(request.url).searchParams.get("companyId") || ""
  const caller = await resolveCaller(request, wantedCompanyId)
  if ("error" in caller) return caller.error
  const { db, agencyId, companyId } = caller

  const stored = await readStored(db, companyId)
  if (stored) {
    const age = Date.now() - new Date(stored.generatedAt).getTime()
    if (Number.isFinite(age) && age < FRESH_FOR_MS) {
      return jsonResponse({ generatedAt: stored.generatedAt, categories: stored.categories, cached: true })
    }
  }
  return buildAndStore(db, agencyId, companyId)
}

/** Force a fresh set, e.g. the client tapped "Refresh". */
export async function POST(request: Request) {
  let wantedCompanyId = ""
  try {
    wantedCompanyId = String((await request.json())?.companyId || "")
  } catch {
    wantedCompanyId = ""
  }
  const caller = await resolveCaller(request, wantedCompanyId)
  if ("error" in caller) return caller.error
  const { db, agencyId, companyId } = caller
  return buildAndStore(db, agencyId, companyId)
}
