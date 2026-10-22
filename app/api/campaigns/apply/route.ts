import { NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { applicationQuestions, hasBrief, resolveBrief } from "@/lib/campaign-brief"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Same lists as lib/campaign-people, which pulls in the browser Firebase SDK.
const APPS = ["Instagram", "TikTok", "YouTube", "Facebook", "X", "Snapchat", "Threads", "LinkedIn"]
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clip = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max)
const count = (value: unknown) => Math.max(0, Math.round(Number(String(value ?? "").replace(/[^\d.]/g, "")) || 0))

const SOCIAL_FIELDS: Record<string, string> = { Instagram: "instagram", X: "x" }

/**
 * Every applicant becomes a user of the app: a Firebase Auth account with no
 * password (they set one through password reset) and a "creator" user doc.
 * Someone who already has an account keeps their role; only blanks are filled.
 */
async function ensureCreatorAccount(person: { email: string; name: string; phone: string; app: string; handle: string; agencyId: string }) {
  const { auth, db } = adminServices()
  const account = await auth.getUserByEmail(person.email).catch(async (error: { code?: string }) => {
    if (error?.code !== "auth/user-not-found") throw error
    return auth.createUser({ email: person.email, displayName: person.name, emailVerified: false })
  })
  const ref = db.collection("users").doc(account.uid)
  const current = (await ref.get()).data()
  const now = Timestamp.now()
  const social = SOCIAL_FIELDS[person.app]
  if (!current) {
    await ref.set({
      email: person.email,
      displayName: person.name,
      photoURL: "",
      role: "creator",
      agencyId: person.agencyId,
      companyId: account.uid,
      phone: person.phone,
      ...(social ? { [social]: person.handle } : {}),
      source: "Campaign application",
      onboardingStatus: "pending-invite",
      createdAt: now,
      updatedAt: now,
    })
  } else {
    const fill: Record<string, unknown> = {}
    if (!current.displayName) fill.displayName = person.name
    if (!current.phone && person.phone) fill.phone = person.phone
    if (social && !current[social]) fill[social] = person.handle
    if (Object.keys(fill).length) await ref.set({ ...fill, updatedAt: now }, { merge: true })
  }
  return account.uid
}

function tierFor(followers: number) {
  if (followers >= 100_000) return "Big account"
  if (followers >= 10_000) return "Mid account"
  return "Small account"
}

/**
 * A creator registering interest from the shared campaign page. No login: they
 * land on the campaign's Creators tab as "Applied", and their contact details go
 * in campaignApplications, which only the agency can read.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const projectId = clip(body.projectId, 128)
  const name = clip(body.name, 120)
  const email = clip(body.email, 200).toLowerCase()
  const phone = clip(body.phone, 40)
  const app = APPS.includes(String(body.app)) ? String(body.app) : "Instagram"
  // A pasted profile link works too: keep the last part of the path.
  const typedHandle = clip(body.handle, 200).replace(/^https?:\/\/[^/]+\//i, "").replace(/[/?#].*$/, "").replace(/^@+/, "").slice(0, 100)
  const handle = typedHandle ? `@${typedHandle}` : ""
  const followers = count(body.followers)
  // The cover letter; older forms sent a short note instead.
  const note = String(body.coverLetter ?? body.note ?? "").trim().slice(0, 3000)

  if (!projectId || !name || !handle || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Add your name, email and handle." }, { status: 400 })
  }
  if (!note) return NextResponse.json({ error: "Add a cover letter." }, { status: 400 })

  const { db } = adminServices()
  const project = (await db.collection("projects").doc(projectId).get()).data()
  if (!project || project.isArchived || !hasBrief(project.brief)) {
    return NextResponse.json({ error: "This campaign isn't taking applications." }, { status: 404 })
  }
  const brief = resolveBrief(project.brief)
  if (brief.registerBy && new Date().toISOString().slice(0, 10) > brief.registerBy) {
    return NextResponse.json({ error: "Applications for this campaign have closed." }, { status: 410 })
  }
  // Answers are kept against the campaign's own questions, not whatever the form sent.
  const sentAnswers = Array.isArray(body.answers) ? body.answers as Array<{ question?: unknown; answer?: unknown }> : []
  const answers = applicationQuestions(brief).map((question) => ({
    question,
    answer: String(sentAnswers.find((item) => item?.question === question)?.answer ?? "").trim().slice(0, 1000),
  }))
  if (answers.some((item) => !item.answer)) {
    return NextResponse.json({ error: "Answer every question." }, { status: 400 })
  }

  const people = db.collection("campaignPeople")
  const existing = await people.where("projectId", "==", projectId).where("handle", "==", handle).limit(5).get()
  if (existing.docs.some((item) => item.data().app === app)) {
    return NextResponse.json({ error: "You've already applied for this campaign." }, { status: 409 })
  }

  let userId = ""
  try {
    userId = await ensureCreatorAccount({ email, name, phone, app, handle, agencyId: String(project.agencyId || "") })
  } catch (error) {
    console.error("Could not create the creator's account", error)
    return NextResponse.json({ error: "That didn't send. Try again." }, { status: 500 })
  }

  const rate = brief.fixedOffer ? brief.offerAmount : count(body.rate)
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
    currency: brief.currency,
    paid: false,
    labelled: false,
    category: "",
    overlap: 0,
    onRoster: false,
    source: "apply",
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
    rate: brief.fixedOffer ? 0 : rate,
    currency: brief.currency,
    createdAt: now,
  })
  await batch.commit()
  return NextResponse.json({ ok: true })
}
