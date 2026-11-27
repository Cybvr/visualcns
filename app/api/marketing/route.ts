import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { EMPTY_STEP, FLOW_STEPS, isFlowStep, stepsAfter, type FlowState, type FlowStep } from "@/lib/marketing-flow"
import { requireAgencyId } from "@/lib/require-agency-id"
import { getAgencySecret, recordAgencyUsage } from "@/lib/server/agency-secrets"
import { findEmails } from "@/lib/server/email-finder"
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

/** Firestore refuses undefined fields. */
const withoutUndefined = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const thisMonth = () => new Date().toISOString().slice(0, 7)

type Stored = { flow?: FlowState; runMonth?: string; runsThisMonth?: number; socialCopied?: string[] }

/** Marketing's social posts go into the company's Posts as drafts, once each. */
async function copySocialPosts(db: FirebaseFirestore.Firestore, ref: FirebaseFirestore.DocumentReference, agencyId: string, companyId: string, flow: FlowState, copied: string[]) {
  const fresh = (flow.social?.posts ?? []).filter((post) => !copied.includes(post.id))
  if (!fresh.length) return
  const batch = db.batch()
  for (const post of fresh) {
    batch.set(db.collection("campaignCreatives").doc(), {
      agencyId, companyId, projectId: "", title: post.title || "Post", url: "", type: "text", kind: "content",
      body: post.text, postedBy: "Founder", status: "Draft",
      ...(post.image ? { mediaUrl: post.image, mediaType: "image" } : {}),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    })
  }
  batch.set(ref, { socialCopied: [...copied, ...fresh.map((post) => post.id)] }, { merge: true })
  await batch.commit()
}

export async function GET(request: Request) {
  const caller = await resolveCaller(request, new URL(request.url).searchParams.get("companyId") || "")
  if ("error" in caller) return caller.error
  const ref = caller.db.collection(COLLECTION).doc(caller.companyId)
  const stored = (await ref.get()).data() as Stored | undefined
  if (stored?.flow?.social) await copySocialPosts(caller.db, ref, caller.agencyId, caller.companyId, stored.flow, stored.socialCopied ?? []).catch((error) => console.error("Copying social posts failed", error))
  return json({ flow: stored?.flow ?? { website: caller.website } })
}

type Body = { companyId?: string; action?: string; step?: string; website?: string; id?: string; ids?: unknown[]; url?: string; subject?: string; body?: string; to?: string; keywords?: unknown[]; name?: string; audienceId?: string; headline?: string; text?: string; cta?: string; sent?: boolean }

const REMOVABLE = ["customers", "people", "emails", "competitors", "ads"] as const
const adFields = (body: Body, flow: FlowState) => ({
  headline: clip(body.headline, 80),
  text: String(body.text ?? "").trim().slice(0, 300),
  cta: clip(body.cta, 20) || "Learn more",
  audienceId: flow.audiences?.some((item) => item.id === body.audienceId) ? String(body.audienceId) : "",
})
const newId = () => Math.random().toString(36).slice(2, 10)
const clip = (value: unknown, max: number) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max)
const siteUrl = (value: unknown) => {
  const url = clip(value, 300)
  return !url ? "" : /^https?:\/\//i.test(url) ? url : `https://${url}`
}

/**
 * run: run one step and clear the steps after it.
 * remove: drop one row the company doesn't want (a customer, person, email or competitor).
 * email: save an edited email.
 * keywords: save the keywords the company added itself.
 * add: add the company's own competitor, audience, lead or email.
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
    } else if (step === "audiences") {
      // An audience takes its companies, their people, their emails and its ad with it.
      flow.audiences = flow.audiences?.filter((item) => item.id !== rowId)
      const gone = new Set((flow.customers ?? []).filter((item) => item.audienceId === rowId).map((item) => item.id))
      flow.customers = flow.customers?.filter((item) => !gone.has(item.id))
      flow.people = flow.people?.filter((item) => !gone.has(item.customerId))
      flow.emails = flow.emails?.filter((item) => item.audienceId !== rowId && (!item.personId || flow.people?.some((person) => person.id === item.personId)))
      flow.ads = flow.ads?.filter((item) => item.audienceId !== rowId)
    } else if ((REMOVABLE as readonly string[]).includes(step)) {
      const key = step as "customers" | "people" | "emails" | "ads"
      const rows = (flow[key] ?? []) as { id: string }[]
      ;(flow as Record<string, unknown>)[key] = rows.filter((item) => item.id !== rowId)
      // A removed company takes its person and email with it, and a removed person their email.
      if (key === "customers") flow.people = flow.people?.filter((item) => item.customerId !== rowId)
      if (key === "customers" || key === "people") flow.emails = flow.emails?.filter((item) => !item.personId || flow.people?.some((person) => person.id === item.personId))
    } else {
      return json({ error: "That can't be removed." }, 400)
    }
    await ref.set({ flow: { ...flow, updatedAt: new Date().toISOString() } }, { merge: true })
    return json({ flow })
  }

  if (body.action === "keywords") {
    const seen = new Set<string>()
    flow.myKeywords = (Array.isArray(body.keywords) ? body.keywords : [])
      .map((item) => String(item ?? "").trim().replace(/\s+/g, " ").slice(0, 60))
      .filter((item) => item && !seen.has(item.toLowerCase()) && seen.add(item.toLowerCase()))
      .slice(0, 100)
    await ref.set({ flow: { ...flow, updatedAt: new Date().toISOString() } }, { merge: true })
    return json({ flow })
  }

  if (body.action === "add") {
    const name = clip(body.name, 80)
    if (body.step === "competitors") {
      const url = siteUrl(body.url)
      if (!url) return json({ error: "Enter their website." }, 400)
      const current = flow.competitors ?? EMPTY_STEP.competitors
      if (current.competitors.some((item) => item.url === url)) return json({ flow })
      flow.competitors = { ...current, competitors: [...current.competitors, { name: name || url.replace(/^https?:\/\/(www\.)?/, ""), url }] }
    } else if (body.step === "audiences") {
      if (!name) return json({ error: "Describe the audience." }, 400)
      flow.audiences = [...(flow.audiences ?? []), { id: newId(), name, offer: "", pain: "", criteria: [], examples: [] }]
    } else if (body.step === "customers") {
      if (!name) return json({ error: "Enter the company name." }, 400)
      const audienceId = flow.audiences?.some((item) => item.id === body.audienceId) ? String(body.audienceId) : ""
      flow.customers = [...(flow.customers ?? []), { id: newId(), audienceId, name, url: siteUrl(body.url), description: "", country: "" }]
    } else if (body.step === "emails") {
      const subject = clip(body.subject, 120)
      const text = String(body.body ?? "").trim().slice(0, 4000)
      if (!subject && !text) return json({ error: "Write the email first." }, 400)
      flow.emails = [...(flow.emails ?? []), { id: newId(), personId: "", to: clip(body.to, 200) || undefined, subject, body: text }]
    } else if (body.step === "ads") {
      const ad = adFields(body, flow)
      if (!ad.headline && !ad.text) return json({ error: "Write the ad first." }, 400)
      flow.ads = [...(flow.ads ?? []), { id: newId(), jobTitles: [], ...ad }]
    } else {
      return json({ error: "That can't be added." }, 400)
    }
    await ref.set({ flow: withoutUndefined({ ...flow, updatedAt: new Date().toISOString() }) }, { merge: true })
    return json({ flow })
  }

  // ad: save an edited ad.
  if (body.action === "ad") {
    const ad = flow.ads?.find((item) => item.id === body.id)
    if (!ad) return json({ error: "That ad doesn't exist." }, 404)
    Object.assign(ad, adFields(body, flow))
    await ref.set({ flow: withoutUndefined({ ...flow, updatedAt: new Date().toISOString() }) }, { merge: true })
    return json({ flow })
  }

  if (body.action === "email") {
    const email = flow.emails?.find((item) => item.id === body.id)
    if (!email) return json({ error: "That email doesn't exist." }, 404)
    email.subject = String(body.subject ?? email.subject).trim().slice(0, 120)
    email.body = String(body.body ?? email.body).trim().slice(0, 4000)
    if (body.to !== undefined) email.to = String(body.to).trim().slice(0, 200) || undefined
    if (typeof body.sent === "boolean") email.sent = body.sent
    await ref.set({ flow: { ...flow, updatedAt: new Date().toISOString() } }, { merge: true })
    return json({ flow })
  }

  // image: set (or clear, with an empty url) the uploaded image on a post or an ad.
  if (body.action === "image") {
    const url = String(body.url || "").trim()
    if (url && !/^https:\/\/firebasestorage\.googleapis\.com\//.test(url)) return json({ error: "Upload the image first." }, 400)
    const rows: { id: string; image?: string }[] | undefined = body.step === "social" ? flow.social?.posts : body.step === "ads" ? flow.ads : undefined
    const row = rows?.find((item) => item.id === body.id)
    if (!row) return json({ error: "That post or ad doesn't exist." }, 404)
    if (url) row.image = url.slice(0, 2000)
    else delete row.image
    await ref.set({ flow: withoutUndefined({ ...flow, updatedAt: new Date().toISOString() }) }, { merge: true })
    return json({ flow })
  }

  // find-emails: look up addresses for decision makers that don't have one. ids limits it to some people.
  if (body.action === "find-emails") {
    if (!flow.people?.length) return json({ error: "Find decision makers first." }, 400)
    const billing = isAdmin ? null : await ensureSubscription(db, agencyId, companyId)
    if (billing && !planAccess(billing as Parameters<typeof planAccess>[0]).allowed) {
      return json({ error: "Your plan is paused. Choose a plan to use Marketing again." }, 402)
    }
    const [hunter, firecrawl] = await Promise.all([
      getAgencySecret(agencyId, "HUNTER_API_KEY", process.env.HUNTER_API_KEY || ""),
      getAgencySecret(agencyId, "FIRECRAWL_API_KEY", process.env.FIRECRAWL_API_KEY || ""),
    ])
    if (!hunter && !firecrawl) return json({ error: "Email finding isn't set up yet. Add a Hunter or Firecrawl API key." }, 503)
    const only = Array.isArray(body.ids) ? new Set(body.ids.map(String)) : null
    // Asking again for one person looks again, even if the last look found nothing.
    const targets = flow.people.filter((person) => (only ? only.has(person.id) : !person.email && person.emailSource !== "none"))
    const fresh = targets.map(({ email: _email, emailSource: _source, emailScore: _score, ...person }) => person)
    const found = await findEmails({ hunter, firecrawl }, fresh, flow.customers ?? [])
    // An address found before is kept when a second look finds nothing.
    flow.people = flow.people.map((person) => {
      const update = found.find((item) => item.id === person.id)
      return update && (update.email || !person.email) ? update : person
    })
    await ref.set({ flow: withoutUndefined({ ...flow, updatedAt: new Date().toISOString() }) }, { merge: true })
    void recordAgencyUsage(agencyId, "marketingEmailLookups", targets.length).catch(() => undefined)
    return json({ flow })
  }

  // skip: mark a step done with nothing in it, so the run can carry on. Research can't be skipped.
  if (body.action === "skip") {
    if (!isFlowStep(body.step) || body.step === "research") return json({ error: "That step can't be skipped." }, 400)
    const skippedStep: FlowStep = body.step
    const next: FlowState = { ...flow, [skippedStep]: EMPTY_STEP[skippedStep], skipped: Array.from(new Set([...(flow.skipped ?? []), skippedStep])), updatedAt: new Date().toISOString() }
    for (const later of stepsAfter(skippedStep)) delete next[later]
    next.skipped = next.skipped?.filter((key) => !stepsAfter(skippedStep).includes(key))
    // update, not a merge, so the cleared later steps are really gone.
    await ref.update({ flow: withoutUndefined(next) })
    return json({ flow: next })
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
    let result = await runFlowStep({ firecrawl, openai }, step, flow)
    // Decision makers come with their email addresses where they can be found.
    if (step === "people") {
      const hunter = await getAgencySecret(agencyId, "HUNTER_API_KEY", process.env.HUNTER_API_KEY || "")
      result = (await findEmails({ hunter, firecrawl }, result as NonNullable<FlowState["people"]>, flow.customers ?? [])) as typeof result
    }
    const next: FlowState = withoutUndefined({
      ...flow,
      [step]: result,
      skipped: (flow.skipped ?? []).filter((key) => key !== step && !stepsAfter(step).includes(key)),
      updatedAt: new Date().toISOString(),
    })
    for (const later of stepsAfter(step)) delete next[later]
    // set without merge, so cleared steps are really gone.
    await ref.set({ agencyId, companyId, flow: next, runMonth: thisMonth(), runsThisMonth: runs, updatedAt: FieldValue.serverTimestamp() })
    if (step === "research" && !caller.website) {
      await db.collection("organizations").doc(companyId).set({ website: flow.website }, { merge: true })
    }
    if (step === "social") await copySocialPosts(db, ref, agencyId, companyId, next, []).catch((error) => console.error("Copying social posts failed", error))
    void recordAgencyUsage(agencyId, "marketingFlowSteps").catch(() => undefined)
    return json({ flow: next })
  } catch (error) {
    console.error(`Marketing step ${step} failed`, error)
    const text = error instanceof Error ? error.message : ""
    const message = /website|first\.|found\.$/.test(text) ? text
      : /quota|credit|billing|insufficient/i.test(text) ? "Out of AI credits."
      : /fetch failed|network|timeout|timed out|ECONN|ENOTFOUND|socket/i.test(text) ? "Network error."
      : "That step didn't finish."
    return json({ error: message }, 502)
  }
}
