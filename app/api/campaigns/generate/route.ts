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
  creatorSuggestions: { type: "array", items: { type: "string" }, description: "Four to six kinds of creators to look for, each a few words, like \"Local boxing coaches\". Never name real people or accounts." },
  tasks: { type: "array", items: { type: "string" }, description: "Six to ten short steps to run the campaign, in order, from lining up creators to reporting results. Each under ten words." },
} as const
type Part = keyof typeof PARTS
const isPart = (value: unknown): value is Part => typeof value === "string" && value in PARTS

const INSTRUCTIONS = `You plan social campaigns for a marketing agency. From the client's description, write the parts of the campaign you're asked for.
Use plain, everyday words a small business owner would use. No jargon, no hype words, no emojis, no hashtags.
Keep any facts (names, dates, places, links) exactly as given and never invent new ones.`

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

  const schema = { type: "object", additionalProperties: false, required: parts, properties: Object.fromEntries(parts.map((part) => [part, PARTS[part]])) }
  let result: Partial<{ angle: string; strategy: string; announcement: string; hooks: string[]; rosterTarget: string; creatorSuggestions: string[]; tasks: string[] }>
  try {
    const response = await new OpenAI({ apiKey }).responses.create({
      model: MODEL,
      instructions: INSTRUCTIONS,
      input: [{ role: "user", content: [
        `Campaign: ${project.title || "Untitled"}`,
        `About:\n${about}`,
        // Parts already written, so new ones agree with them.
        project.angle && !parts.includes("angle") ? `Narrative and angle:\n${project.angle}` : "",
        project.description && !parts.includes("strategy") ? `Strategy:\n${project.description}` : "",
      ].filter(Boolean).join("\n\n") }],
      text: { format: { type: "json_schema", name: "campaign_plan", strict: true, schema } },
    })
    result = JSON.parse(response.output_text || "{}")
  } catch (error) {
    console.error("Campaign generation failed", error)
    return json({ error: "Ngai couldn't write it this time. Try again." }, 502)
  }

  const now = FieldValue.serverTimestamp()
  const patch: Record<string, unknown> = {}
  if (result.angle !== undefined) patch.angle = result.angle
  if (result.strategy !== undefined) patch.description = result.strategy
  if (result.rosterTarget !== undefined) patch.rosterTarget = result.rosterTarget
  if (result.creatorSuggestions) patch.creatorSuggestions = result.creatorSuggestions.slice(0, 8)
  if (Object.keys(patch).length) await projectRef.set({ ...patch, updatedAt: now }, { merge: true })

  const batch = db.batch()
  const scope = { agencyId, companyId: project.companyId, projectId }

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
