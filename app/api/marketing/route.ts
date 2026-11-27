import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { FLOW_STEPS, isFlowStep, stepsAfter, type FlowState, type FlowStep } from "@/lib/marketing-flow"
import { requireAgencyId } from "@/lib/require-agency-id"
import { getAgencySecret, recordAgencyUsage } from "@/lib/server/agency-secrets"
import { runFlowStep } from "@/lib/server/marketing-flow"
import { ensureSubscription } from "@/lib/server/paystack"
import { currentPlan, PLANS, planAccess } from "@/lib/subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// One step searches the web and runs one or two model calls.
export const maxDuration = 300

const COLLECTION = "marketingFlows"

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } })
}

/** Signed-in admins of the company's agency, or the company's own users. */
async function resolveCaller(request: Request, companyId: string) {
  const authorization = request.headers.get("authorization") || ""
  if (!authorization.startsWith("Bearer ")) return { error: json({ error: "Please sign in to use Marketing." }, 401) }
  if (!companyId) return { error: json({ error: "Missing company." }, 400) }

  const { auth, db } = adminServices()
  let uid = ""
  try {
    uid = (await auth.verifyIdToken(authorization.slice(7))).uid
  } catch {
    return { error: json({ error: "Could not verify your account." }, 401) }
  }
  const [userSnapshot, organizationSnapshot] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("organizations").doc(companyId).get(),
  ])
  const user = userSnapshot.data()
  if (!user) return { error: json({ error: "Your account is not ready." }, 403) }
  const role = String(user.role || "")
  const isAdmin = role === "admin" || role === "superadmin"
  let agencyId = ""
  try {
    agencyId = requireAgencyId(user)
  } catch {
    return { error: json({ error: "Your account has no agency assigned." }, 403) }
  }
  const org = organizationSnapshot.data()
  if (!org) return { error: json({ error: "Company not found." }, 404) }
  if (org.agencyId && org.agencyId !== agencyId) return { error: json({ error: "You can't view this company." }, 403) }
  if (!isAdmin && user.companyId !== companyId) return { error: json({ error: "You can only view your own company." }, 403) }
  return { db, agencyId, companyId, isAdmin, website: typeof org.website === "string" ? org.website : "" }
}

const thisMonth = () => new Date().toISOString().slice(0, 7)

type Stored = { flow?: FlowState; runMonth?: string; runsThisMonth?: number }

export async function GET(request: Request) {
  const caller = await resolveCaller(request, new URL(request.url).searchParams.get("companyId") || "")
  if ("error" in caller) return caller.error
  const snap = await caller.db.collection(COLLECTION).doc(caller.companyId).get()
  const stored = snap.data() as Stored | undefined
  return json({ flow: stored?.flow ?? { website: caller.website } })
}

type Body = { companyId?: string; action?: string; step?: string; website?: string; id?: string; subject?: string; body?: string }

const REMOVABLE = ["customers", "people", "emails", "competitors"] as const

/**
 * run: run one step and clear the steps after it.
 * remove: drop one row the company doesn't want (a customer, person, email or competitor).
 * email: save an edited email.
 */
export async function POST(request: Request) {
  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    body = {}
  }
  const caller = await resolveCaller(request, String(body.companyId || ""))
  if ("error" in caller) return caller.error
  const { db, agencyId, companyId, isAdmin } = caller
  const ref = db.collection(COLLECTION).doc(companyId)
  const stored = ((await ref.get()).data() as Stored | undefined) ?? {}
  const flow: FlowState = stored.flow ?? { website: caller.website }

  if (body.action === "remove") {
    const step = String(body.step || "")
    const rowId = String(body.id || "")
    if (step === "competitors") {
      if (!flow.competitors) return json({ flow })
      flow.competitors = { ...flow.competitors, competitors: flow.competitors.competitors.filter((item) => item.url !== rowId) }
    } else if ((REMOVABLE as readonly string[]).includes(step)) {
      const key = step as "customers" | "people" | "emails"
      const rows = (flow[key] ?? []) as { id: string }[]
      ;(flow as Record<string, unknown>)[key] = rows.filter((item) => item.id !== rowId)
      // A removed company takes its person and email with it, and a removed person their email.
      if (key === "customers") flow.people = flow.people?.filter((item) => item.customerId !== rowId)
      if (key === "customers" || key === "people") flow.emails = flow.emails?.filter((item) => flow.people?.some((person) => person.id === item.personId))
    } else {
      return json({ error: "That can't be removed." }, 400)
    }
    await ref.set({ flow: { ...flow, updatedAt: new Date().toISOString() } }, { merge: true })
    return json({ flow })
  }

  if (body.action === "email") {
    const email = flow.emails?.find((item) => item.id === body.id)
    if (!email) return json({ error: "That email doesn't exist." }, 404)
    email.subject = String(body.subject ?? email.subject).trim().slice(0, 120)
    email.body = String(body.body ?? email.body).trim().slice(0, 4000)
    await ref.set({ flow: { ...flow, updatedAt: new Date().toISOString() } }, { merge: true })
    return json({ flow })
  }

  if (body.action !== "run" || !isFlowStep(body.step)) return json({ error: "Unknown action." }, 400)
  const step: FlowStep = body.step

  // Each step needs the one before it.
  const index = FLOW_STEPS.findIndex((item) => item.key === step)
  if (index > 0 && !flow[FLOW_STEPS[index - 1].key]) return json({ error: "Run the step before this one first." }, 400)

  const billing = isAdmin ? null : await ensureSubscription(db, agencyId, companyId)
  if (billing && !planAccess(billing as Parameters<typeof planAccess>[0]).allowed) {
    return json({ error: "Your plan is paused. Choose a plan to use Marketing again." }, 402)
  }

  // A run starts at research. That's what the plan's monthly runs count.
  let runs = stored.runMonth === thisMonth() ? stored.runsThisMonth ?? 0 : 0
  if (step === "research") {
    const website = String(body.website || flow.website || "").trim().slice(0, 300)
    if (!website || !/^[^\s]+\.[^\s]+$/.test(website.replace(/^https?:\/\//, ""))) return json({ error: "Enter your website address." }, 400)
    if (billing) {
      const plan = PLANS[currentPlan(billing as Parameters<typeof currentPlan>[0])]
      if (runs >= plan.pulseScans) {
        return json({ error: `Your ${plan.name} plan includes ${plan.pulseScans} ${plan.pulseScans === 1 ? "run" : "runs"} a month. Upgrade your plan for more.` }, 402)
      }
    }
    flow.website = website
    runs += 1
  }

  const [firecrawl, openai] = await Promise.all([
    getAgencySecret(agencyId, "FIRECRAWL_API_KEY", process.env.FIRECRAWL_API_KEY || ""),
    getAgencySecret(agencyId, "OPENAI_API_KEY", process.env.OPENAI_API_KEY || ""),
  ])
  if (!firecrawl) return json({ error: "Web research isn't set up yet. Add a Firecrawl API key." }, 503)
  if (!openai) return json({ error: "The AI isn't set up yet. Add an OpenAI API key." }, 503)

  try {
    const result = await runFlowStep({ firecrawl, openai }, step, flow)
    const next: FlowState = { ...flow, [step]: result, updatedAt: new Date().toISOString() }
    for (const later of stepsAfter(step)) delete next[later]
    // set without merge, so cleared steps are really gone.
    await ref.set({ agencyId, companyId, flow: next, runMonth: thisMonth(), runsThisMonth: runs, updatedAt: FieldValue.serverTimestamp() })
    if (step === "research" && !caller.website) {
      await db.collection("organizations").doc(companyId).set({ website: flow.website }, { merge: true })
    }
    void recordAgencyUsage(agencyId, "marketingFlowSteps").catch(() => undefined)
    return json({ flow: next })
  } catch (error) {
    console.error(`Marketing step ${step} failed`, error)
    const message = error instanceof Error && /website|first\./.test(error.message) ? error.message : "That step didn't finish. Please try again."
    return json({ error: message }, 502)
  }
}
