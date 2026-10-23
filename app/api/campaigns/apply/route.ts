import { NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { applicationQuestions, applicationsClosed, hiresCreators, resolveBrief, resolveOpenings } from "@/lib/campaign-brief"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Same lists as lib/campaign-people, which pulls in the browser Firebase SDK.
const APPS = ["Instagram", "TikTok", "YouTube", "Facebook", "X", "Snapchat", "Threads", "LinkedIn"]
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clip = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max)
const count = (value: unknown) => Math.max(0, Math.round(Number(String(value ?? "").replace(/[^\d.]/g, "")) || 0))

const SOCIAL_FIELDS: Record<string, string> = { Instagram: "instagram", X: "x" }

/**
 * Every applicant is a user of the app: they sign up (or in) with a password
 * on the apply page, and their user doc is tagged "creator" for the campaign's
 * agency. Someone who already has a role keeps it; only blanks are filled.
 */
async function ensureCreatorAccount(person: { uid: string; email: string; name: string; phone: string; app: string; handle: string; agencyId: string }) {
  const { auth, db } = adminServices()
  const ref = db.collection("users").doc(person.uid)
  const current = (await ref.get()).data()
  const now = Timestamp.now()
  const social = SOCIAL_FIELDS[person.app]
  // Signing up in the browser can make a bare doc (no role) first, so a doc without a role is still a new creator.
  if (!current?.role) {
    await ref.set({
      email: person.email,
      displayName: current?.displayName || person.name,
      photoURL: current?.photoURL || "",
      role: "creator",
      agencyId: person.agencyId,
      companyId: person.uid,
      phone: person.phone,
      ...(social ? { [social]: person.handle } : {}),
      source: "Campaign application",
      onboardingStatus: "active",
      createdAt: current?.createdAt || now,
      updatedAt: now,
    }, { merge: true })
    await auth.updateUser(person.uid, { displayName: person.name }).catch(() => undefined)
  } else {
    const fill: Record<string, unknown> = {}
    if (!current.displayName) fill.displayName = person.name
    if (!current.phone && person.phone) fill.phone = person.phone
    if (social && !current[social]) fill[social] = person.handle
    if (Object.keys(fill).length) await ref.set({ ...fill, updatedAt: now }, { merge: true })
  }
  return person.uid
}

function tierFor(followers: number) {
  if (followers >= 100_000) return "Big account"
  if (followers >= 10_000) return "Mid account"
  return "Small account"
}

/**
 * A creator applying from the shared campaign page, signed in with the account
 * the apply form made. They land on the campaign's Creators tab as "Applied",
 * and their contact details go in campaignApplications, which only the agency can read.
 * With an openingId they apply for that job instead, and are listed under it.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
  let uid = ""
  let email = ""
  try {
    const decoded = await adminServices().auth.verifyIdToken(token)
    uid = decoded.uid
    email = String(decoded.email ?? "").toLowerCase()
  } catch {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const projectId = clip(body.projectId, 128)
  const name = clip(body.name, 120)
  const phone = clip(body.phone, 40)
  // A pasted profile link works too: keep the last part of the path.
  const typedHandle = clip(body.handle, 200).replace(/^https?:\/\/[^/]+\//i, "").replace(/[/?#].*$/, "").replace(/^@+/, "").slice(0, 100)
  const followers = count(body.followers)
  const openingId = clip(body.openingId, 64)
  const portfolio = clip(body.portfolio, 500)
  // The cover letter; older forms sent a short note instead.
  const note = String(body.coverLetter ?? body.note ?? "").trim().slice(0, 3000)

  if (!projectId || !name || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Add your name and email." }, { status: 400 })
  }
  if (!note) return NextResponse.json({ error: "Add a cover letter." }, { status: 400 })

  const { db } = adminServices()
  const project = (await db.collection("projects").doc(projectId).get()).data()
  const opening = openingId ? resolveOpenings(project?.openings).find((item) => item.id === openingId) : undefined
  if (!project || project.isArchived || (openingId ? !opening : !hiresCreators(project.brief))) {
    return NextResponse.json({ error: "This campaign isn't taking applications." }, { status: 404 })
  }
  const brief = resolveBrief(project.brief)
  // The opening's own pay, dates and questions; the creator brief's otherwise.
  const terms = opening ?? brief
  if (applicationsClosed(terms)) {
    return NextResponse.json({ error: `Applications for this ${opening ? "role" : "campaign"} have closed.` }, { status: 410 })
  }
  if (opening && !portfolio) return NextResponse.json({ error: "Add a link to your work." }, { status: 400 })
  // Answers are kept against the campaign's own questions, not whatever the form sent.
  const sentAnswers = Array.isArray(body.answers) ? body.answers as Array<{ question?: unknown; answer?: unknown }> : []
  const answers = applicationQuestions(terms).map((question) => ({
    question,
    answer: String(sentAnswers.find((item) => item?.question === question)?.answer ?? "").trim().slice(0, 1000),
  }))
  if (answers.some((item) => !item.answer)) {
    return NextResponse.json({ error: "Answer every question." }, { status: 400 })
  }

  // Without a handle the Creators tab lists them by name, with no app to link to.
  const app = opening || !brief.showCreatorDetails ? "" : APPS.includes(String(body.app)) ? String(body.app) : "Instagram"
  const handle = opening || !brief.showCreatorDetails ? name : typedHandle ? `@${typedHandle}` : ""
  if (!handle) return NextResponse.json({ error: "Add your handle." }, { status: 400 })

  const people = db.collection("campaignPeople")
  const [sameHandle, sameAccount] = await Promise.all([
    app ? people.where("projectId", "==", projectId).where("handle", "==", handle).limit(5).get() : null,
    db.collection("campaignApplications").where("projectId", "==", projectId).where("userId", "==", uid).limit(20).get(),
  ])
  // One application per job: the same person can apply to post and, say, to design.
  const appliedHere = sameAccount.docs.some((item) => String(item.data().openingId || "") === openingId)
  if (appliedHere || sameHandle?.docs.some((item) => item.data().app === app)) {
    return NextResponse.json({ error: `You've already applied for this ${opening ? "role" : "campaign"}.` }, { status: 409 })
  }

  let userId = ""
  try {
    userId = await ensureCreatorAccount({ uid, email, name, phone, app, handle, agencyId: String(project.agencyId || "") })
  } catch (error) {
    console.error("Could not create the creator's account", error)
    return NextResponse.json({ error: "That didn't send. Try again." }, { status: 500 })
  }

  const rate = terms.fixedOffer ? terms.offerAmount : count(body.rate)
  const role = opening ? { openingId: opening.id, opening: opening.title.trim() } : {}
  const now = Timestamp.now()
  const personRef = people.doc()
  const batch = db.batch()
  batch.set(personRef, {
    agencyId: project.agencyId || "",
    companyId: project.companyId || "",
    projectId,
    handle,
    app,
    followers,
    tier: tierFor(followers),
    wave: "",
    status: "Applied",
    postLink: "",
    pay: rate,
    currency: terms.currency,
    paid: false,
    labelled: false,
    category: "",
    overlap: 0,
    onRoster: false,
    source: "apply",
    ...role,
    createdAt: now,
    updatedAt: now,
  })
  batch.set(db.collection("campaignApplications").doc(personRef.id), {
    agencyId: project.agencyId || "",
    companyId: project.companyId || "",
    projectId,
    userId,
    name,
    email,
    phone,
    note,
    answers,
    rate: terms.fixedOffer ? 0 : rate,
    currency: terms.currency,
    ...role,
    ...(portfolio ? { portfolio } : {}),
    createdAt: now,
  })
  await batch.commit()
  return NextResponse.json({ ok: true })
}
