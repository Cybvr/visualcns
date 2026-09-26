import { FieldValue } from "firebase-admin/firestore"

import type { BHReport, BHState } from "@/lib/business-health"
import { adminServices } from "@/lib/firebase-admin"
import { requireAgencyId } from "@/lib/require-agency-id"
import { getAgencySecret, recordAgencyUsage } from "@/lib/server/agency-secrets"
import { answerQuestion, runScan, type CompanyFacts } from "@/lib/server/business-health"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// A scan crawls several pages and runs eight searches before the model writes the report.
export const maxDuration = 300

const COLLECTION = "businessHealth"

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } })
}

/** Signed-in admins of the company's agency, or the company's own client users. */
async function resolveCaller(request: Request, companyId: string) {
  const authorization = request.headers.get("authorization") || ""
  if (!authorization.startsWith("Bearer ")) return { error: json({ error: "Please sign in to use Business Health." }, 401) }
  if (!companyId) return { error: json({ error: "Missing company." }, 400) }

  const { auth, db } = adminServices()
  let uid = ""
  try {
    uid = (await auth.verifyIdToken(authorization.slice(7))).uid
  } catch {
    return { error: json({ error: "Could not verify your account." }, 401) }
  }

  const user = (await db.collection("users").doc(uid).get()).data()
  if (!user) return { error: json({ error: "Your account is not ready." }, 403) }

  const role = String(user.role || "")
  const isAdmin = role === "admin" || role === "superadmin"
  let agencyId = ""
  try {
    agencyId = requireAgencyId(user)
  } catch {
    return { error: json({ error: "Your account has no agency assigned." }, 403) }
  }

  const org = (await db.collection("organizations").doc(companyId).get()).data()
  if (!org) return { error: json({ error: "Company not found." }, 404) }
  if (org.agencyId && org.agencyId !== agencyId) return { error: json({ error: "You can't view this company." }, 403) }
  if (!isAdmin && user.companyId !== companyId) return { error: json({ error: "You can only view your own company." }, 403) }

  const company: CompanyFacts = {
    name: String(org.name || ""),
    website: typeof org.website === "string" ? org.website : undefined,
    industry: typeof org.industry === "string" ? org.industry : undefined,
    description: typeof org.description === "string" ? org.description : undefined,
    targetCustomers: typeof org.targetCustomers === "string" ? org.targetCustomers : undefined,
    location: typeof org.location === "string" ? org.location : undefined,
  }
  return { db, agencyId, companyId, company }
}

async function keysFor(agencyId: string) {
  const [firecrawl, openai] = await Promise.all([
    getAgencySecret(agencyId, "FIRECRAWL_API_KEY", process.env.FIRECRAWL_API_KEY || ""),
    getAgencySecret(agencyId, "OPENAI_API_KEY", process.env.OPENAI_API_KEY || ""),
  ])
  if (!firecrawl) return { error: "Web research isn't set up yet. Add a Firecrawl API key." }
  if (!openai) return { error: "The AI isn't set up yet. Add an OpenAI API key." }
  return { firecrawl, openai }
}

type Stored = { report?: BHReport | null; links?: string[]; done?: string[]; dismissed?: string[] }

function stateOf(data: Stored | undefined): BHState {
  return { report: data?.report ?? null, done: data?.done ?? [], dismissed: data?.dismissed ?? [] }
}

/** The saved report for a company, or null before the first scan. */
export async function GET(request: Request) {
  const companyId = new URL(request.url).searchParams.get("companyId") || ""
  const caller = await resolveCaller(request, companyId)
  if ("error" in caller) return caller.error
  const snap = await caller.db.collection(COLLECTION).doc(caller.companyId).get()
  return json(stateOf(snap.data() as Stored | undefined))
}

type Body = { companyId?: string; action?: string; question?: string; done?: unknown; dismissed?: unknown }

const ids = (value: unknown) => (Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(0, 200) : undefined)

/** scan: run a fresh scan. ask: research a question. update: save done and dismissed items. */
export async function POST(request: Request) {
  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    body = {}
  }
  const caller = await resolveCaller(request, String(body.companyId || ""))
  if ("error" in caller) return caller.error
  const { db, agencyId, companyId, company } = caller
  const ref = db.collection(COLLECTION).doc(companyId)

  if (body.action === "update") {
    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
    const done = ids(body.done)
    const dismissed = ids(body.dismissed)
    if (done) patch.done = done
    if (dismissed) patch.dismissed = dismissed
    await ref.set({ agencyId, companyId, ...patch }, { merge: true })
    return json({ ok: true })
  }

  const keys = await keysFor(agencyId)
  if ("error" in keys) return json({ error: keys.error }, 503)
  const stored = (await ref.get()).data() as Stored | undefined

  if (body.action === "ask") {
    const question = String(body.question || "").trim().slice(0, 500)
    if (!question) return json({ error: "Ask a question first." }, 400)
    try {
      const answer = await answerQuestion(keys, company, stored?.report ?? null, question)
      void recordAgencyUsage(agencyId, "businessHealthQuestions").catch(() => undefined)
      return json({ answer })
    } catch (error) {
      console.error("Business Health question failed", error)
      return json({ error: "Couldn't research that right now. Please try again." }, 502)
    }
  }

  if (body.action === "scan") {
    if (!company.name) return json({ error: "Add a business name first." }, 400)
    try {
      const { report, links } = await runScan(keys, company, { report: stored?.report ?? null, links: stored?.links ?? [] })
      // A new scan brings new item ids, so earlier done and dismissed marks no longer apply.
      await ref.set(
        { agencyId, companyId, report, links, done: [], dismissed: [], previousScannedAt: stored?.report?.scannedAt ?? null, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      )
      void recordAgencyUsage(agencyId, "businessHealthScans").catch(() => undefined)
      return json(stateOf({ report, done: [], dismissed: [] }))
    } catch (error) {
      console.error("Business Health scan failed", error)
      return json({ error: "The scan didn't finish. Please try again." }, 502)
    }
  }

  return json({ error: "Unknown action." }, 400)
}
