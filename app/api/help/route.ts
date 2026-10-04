import { createHash } from "node:crypto"
import OpenAI from "openai"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { getSiteAgencyId } from "@/lib/require-agency-id"
import { getAgencySecret } from "@/lib/server/agency-secrets"
import { agencyKnowledge, KNOWLEDGE_RULES } from "@/lib/server/agency-knowledge"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna"
/** Questions one visitor can ask an hour. Anyone can use this page, so it's capped. */
const HOURLY_LIMIT = 30
const MAX_MESSAGES = 20
const MAX_LENGTH = 2000

const PROMPT = `You are Ngai, the VisualCNS help assistant on the public website.
Anyone can ask you questions: about VisualCNS, its services and pricing, the VisualCNS plans,
Pass (visitor sign-in), Pulse, Ngai, and how to get started.
Answer only from what VisualCNS has told you about itself, below. Be short, warm and plain.
You can't see anyone's account, projects or invoices here. For those, they should sign in to their company page.
If you don't know, say so and suggest emailing hello@visualcns.com.`

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } })
}

/** Counts this visitor's questions in the current hour. Returns false once they're over the cap. */
async function withinLimit(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown"
  const hour = new Date().toISOString().slice(0, 13)
  const key = createHash("sha256").update(`${ip}|${hour}`).digest("hex").slice(0, 40)
  const { db } = adminServices()
  const ref = db.collection("helpLimits").doc(key)
  return db.runTransaction(async (transaction) => {
    const count = Number((await transaction.get(ref)).data()?.count || 0)
    if (count >= HOURLY_LIMIT) return false
    transaction.set(ref, { count: count + 1, hour, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return true
  })
}

/** Public Ngai for the Help page: answers from the agency knowledge only, no account access. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { messages?: { role?: string; content?: unknown }[] }
  const messages = (body.messages ?? [])
    .filter((message) => (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.trim())
    .slice(-MAX_MESSAGES)
    .map((message) => ({ role: message.role as "user" | "assistant", content: String(message.content).slice(0, MAX_LENGTH) }))
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Ask a question first." }, 400)

  if (!(await withinLimit(request).catch(() => true))) {
    return json({ error: "You've asked a lot of questions in a short time. Please try again in an hour, or email hello@visualcns.com." }, 429)
  }

  const agencyId = getSiteAgencyId()
  const apiKey = await getAgencySecret(agencyId, "OPENAI_API_KEY", process.env.OPENAI_API_KEY || "")
  if (!apiKey) return json({ error: "Help isn't available right now. Please email hello@visualcns.com." }, 503)
  const knowledge = await agencyKnowledge(agencyId)

  try {
    const client = new OpenAI({ apiKey })
    const response = await client.responses.create({
      model: MODEL,
      instructions: `${PROMPT}\n\nToday is ${new Date().toDateString()}.${knowledge ? `\n\n${KNOWLEDGE_RULES}\n\n${knowledge}` : ""}`,
      input: messages,
      max_output_tokens: 800,
    })
    return json({ answer: response.output_text?.trim() || "Sorry, I didn't catch that. Could you ask again?" })
  } catch (error) {
    console.error("Help answer failed", error)
    return json({ error: "Sorry, I couldn't answer just now. Please try again." }, 502)
  }
}
