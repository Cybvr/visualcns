import { FieldValue } from "firebase-admin/firestore"

import type { PulseReport, PulseReportSummary, PulseState } from "@/lib/pulse"
import { adminServices } from "@/lib/firebase-admin"
import { requireAgencyId } from "@/lib/require-agency-id"
import { getAgencySecret, recordAgencyUsage } from "@/lib/server/agency-secrets"
import { answerQuestion, runScan, type CompanyFacts } from "@/lib/server/pulse"
import { ensureSubscription } from "@/lib/server/paystack"
import { currentPlan, PLANS, planAccess } from "@/lib/subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// A scan crawls several pages and runs eight searches before the model writes the report.
export const maxDuration = 300

// Stored names below predate the Pulse rename. Kept so saved reports and usage counts carry over.
const COLLECTION = "businessHealth"

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } })
}

/** Signed-in admins of the company's agency, or the company's own client users. */
async function resolveCaller(request: Request, companyId: string) {
  const authorization = request.headers.get("authorization") || ""
  if (!authorization.startsWith("Bearer ")) return { error: json({ error: "Please sign in to use Reports." }, 401) }
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
  return { db, agencyId, companyId, company, isAdmin }
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

/**
 * Each company has one record for its scan allowance, and a "reports"
 * collection under it with every scan ever run. Before reports were kept, the
 * single latest report sat on the company record itself; `moveOldReport` copies
 * that into the collection the first time it's read, so nothing is lost.
 */
type CompanyRecord = {
  latestReportId?: string
  scanMonth?: string
  scansThisMonth?: number
  // The old single-report fields.
  report?: PulseReport | null
  links?: string[]
  done?: string[]
  dismissed?: string[]
}
type StoredReport = { report: PulseReport; links?: string[]; done?: string[]; dismissed?: string[] }
type CompanyRef = FirebaseFirestore.DocumentReference

const thisMonth = () => new Date().toISOString().slice(0, 7)
const reportsOf = (ref: CompanyRef) => ref.collection("reports")

function stateOf(id: string, data: StoredReport | undefined): PulseState {
  return { id, report: data?.report ?? null, done: data?.done ?? [], dismissed: data?.dismissed ?? [] }
}

async function moveOldReport(db: FirebaseFirestore.Firestore, ref: CompanyRef, agencyId: string, companyId: string) {
  await db.runTransaction(async (tx) => {
    const record = (await tx.get(ref)).data() as CompanyRecord | undefined
    if (!record?.report || record.latestReportId) return
    const reportRef = reportsOf(ref).doc()
    tx.set(reportRef, {
      agencyId,
      companyId,
      report: record.report,
      links: record.links ?? [],
      done: record.done ?? [],
      dismissed: record.dismissed ?? [],
      scannedAt: record.report.scannedAt,
      createdAt: FieldValue.serverTimestamp(),
    })
    tx.set(ref, {
      latestReportId: reportRef.id,
      report: FieldValue.delete(),
      links: FieldValue.delete(),
      done: FieldValue.delete(),
      dismissed: FieldValue.delete(),
    }, { merge: true })
  })
}

/** Every saved report for a company, newest first, or one report in full with ?reportId=. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const caller = await resolveCaller(request, params.get("companyId") || "")
  if ("error" in caller) return caller.error
  const { db, agencyId, companyId } = caller
  const ref = db.collection(COLLECTION).doc(companyId)
  await moveOldReport(db, ref, agencyId, companyId)

  const reportId = params.get("reportId")
  if (reportId) {
    const snap = await reportsOf(ref).doc(reportId).get()
    if (!snap.exists) return json({ error: "That report doesn't exist." }, 404)
    return json(stateOf(snap.id, snap.data() as StoredReport))
  }

  const snaps = await reportsOf(ref).orderBy("scannedAt", "desc").limit(200).get()
  const reports: PulseReportSummary[] = snaps.docs.map((doc) => {
    const { report } = doc.data() as StoredReport
    return {
      id: doc.id,
      scannedAt: report.scannedAt,
      score: report.score,
      summary: report.summary.slice(0, 240),
      attention: report.attention.length,
      opportunities: report.opportunities.length,
    }
  })
  return json({ reports })
}

type Body = { companyId?: string; reportId?: string; action?: string; question?: string; done?: unknown; dismissed?: unknown }

const ids = (value: unknown) => (Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(0, 200) : undefined)

/** scan: run a fresh scan and save it as a new report. ask: research a question. update: save done and dismissed items on a report. */
export async function POST(request: Request) {
  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    body = {}
  }
  const caller = await resolveCaller(request, String(body.companyId || ""))
  if ("error" in caller) return caller.error
  const { db, agencyId, companyId, company, isAdmin } = caller
  const ref = db.collection(COLLECTION).doc(companyId)
  await moveOldReport(db, ref, agencyId, companyId)

  if (body.action === "update") {
    if (!body.reportId) return json({ error: "Missing report." }, 400)
    const reportRef = reportsOf(ref).doc(body.reportId)
    if (!(await reportRef.get()).exists) return json({ error: "That report doesn't exist." }, 404)
    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
    const done = ids(body.done)
    const dismissed = ids(body.dismissed)
    if (done) patch.done = done
    if (dismissed) patch.dismissed = dismissed
    await reportRef.set(patch, { merge: true })
    return json({ ok: true })
  }

  // Reports are part of the company's plan. The agency's own admins aren't limited.
  const billing = isAdmin ? null : await ensureSubscription(db, agencyId, companyId)
  if (billing && !planAccess(billing as Parameters<typeof planAccess>[0]).allowed) {
    return json({ error: "Your plan is paused. Choose a plan to use Reports again." }, 402)
  }

  const keys = await keysFor(agencyId)
  if ("error" in keys) return json({ error: keys.error }, 503)
  const record = (await ref.get()).data() as CompanyRecord | undefined
  const reportData = async (id?: string) => (id ? ((await reportsOf(ref).doc(id).get()).data() as StoredReport | undefined) : undefined)

  if (body.action === "ask") {
    const question = String(body.question || "").trim().slice(0, 500)
    if (!question) return json({ error: "Ask a question first." }, 400)
    try {
      // Answers build on the report being looked at, or the newest one.
      const base = await reportData(body.reportId || record?.latestReportId)
      const answer = await answerQuestion(keys, company, base?.report ?? null, question)
      void recordAgencyUsage(agencyId, "businessHealthQuestions").catch(() => undefined)
      return json({ answer })
    } catch (error) {
      console.error("Reports question failed", error)
      return json({ error: "Couldn't research that right now. Please try again." }, 502)
    }
  }

  if (body.action === "scan") {
    if (!company.name) return json({ error: "Add a business name first." }, 400)
    const scansSoFar = record?.scanMonth === thisMonth() ? record.scansThisMonth ?? 0 : 0
    if (billing) {
      const plan = PLANS[currentPlan(billing as Parameters<typeof currentPlan>[0])]
      if (scansSoFar >= plan.pulseScans) {
        return json({ error: `Your ${plan.name} plan includes ${plan.pulseScans} ${plan.pulseScans === 1 ? "scan" : "scans"} a month. Upgrade your plan for more.` }, 402)
      }
    }
    try {
      // Compared with the newest report, so "Recent changes" shows what moved since then.
      const latest = await reportData(record?.latestReportId)
      const { report, links } = await runScan(keys, company, { report: latest?.report ?? null, links: latest?.links ?? [] })
      const reportRef = reportsOf(ref).doc()
      await reportRef.set({ agencyId, companyId, report, links, done: [], dismissed: [], scannedAt: report.scannedAt, createdAt: FieldValue.serverTimestamp() })
      await ref.set(
        { agencyId, companyId, latestReportId: reportRef.id, scanMonth: thisMonth(), scansThisMonth: scansSoFar + 1, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      )
      void recordAgencyUsage(agencyId, "businessHealthScans").catch(() => undefined)
      return json(stateOf(reportRef.id, { report }))
    } catch (error) {
      console.error("Reports scan failed", error)
      return json({ error: "The scan didn't finish. Please try again." }, 502)
    }
  }

  return json({ error: "Unknown action." }, 400)
}
