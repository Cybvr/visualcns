import { NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { formatOffer, resolveBrief, resolveOpenings } from "@/lib/campaign-brief"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const text = (value: unknown) => (typeof value === "string" ? value : "")
const clip = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max)

async function creator(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Please sign in again.")
  const { auth, db } = adminServices()
  const { uid } = await auth.verifyIdToken(token)
  const user = (await db.collection("users").doc(uid).get()).data() || {}
  return { uid, agencyId: text(user.agencyId), db }
}

function failure(error: unknown, status = 401) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong." }, { status })
}

/** The signed-in creator's campaigns and payout details. */
export async function GET(request: Request) {
  try {
    const { uid, db } = await creator(request)
    const [applications, payout] = await Promise.all([
      db.collection("campaignApplications").where("userId", "==", uid).get(),
      db.collection("creatorPayouts").doc(uid).get(),
    ])
    const campaigns = await Promise.all(applications.docs.map(async (item) => {
      const application = item.data()
      const [person, project] = await Promise.all([
        db.collection("campaignPeople").doc(item.id).get(),
        db.collection("projects").doc(text(application.projectId)).get(),
      ])
      const personData = person.data()
      const projectData = project.data()
      if (!personData || !projectData) return null
      const organization = projectData.companyId ? (await db.collection("organizations").doc(text(projectData.companyId)).get()).data() : null
      const brief = resolveBrief(projectData.brief)
      // Someone who applied for an opening sees its pay; the campaign's dates stay the same.
      const opening = application.openingId ? resolveOpenings(projectData.openings).find((item) => item.id === application.openingId) : undefined
      const onRoster = personData.source === "ngai" || personData.onRoster !== false
      return {
        id: item.id,
        projectId: project.id,
        title: text(projectData.title),
        client: text(organization?.name) || text(projectData.client),
        logoUrl: text(organization?.logoUrl),
        status: onRoster ? text(personData.status) : "Applied",
        handle: text(personData.handle),
        app: text(personData.app),
        pay: Number(personData.pay) || 0,
        currency: text(personData.currency) || (opening ?? brief).currency,
        offer: opening ? (opening.fixedOffer ? formatOffer(opening) : "") : formatOffer(brief),
        role: text(application.opening),
        openingId: text(application.openingId),
        postFrom: brief.postFrom,
        postTo: brief.postTo,
        postLink: text(personData.postLink),
        paid: personData.paid === true,
        appliedAt: application.createdAt?.toMillis?.() ?? 0,
      }
    }))
    const payoutData = payout.data() || {}
    return NextResponse.json({
      campaigns: campaigns.filter(Boolean).sort((a, b) => (b?.appliedAt ?? 0) - (a?.appliedAt ?? 0)),
      payout: {
        accountName: text(payoutData.accountName),
        bankName: text(payoutData.bankName),
        accountNumber: text(payoutData.accountNumber),
        paypalEmail: text(payoutData.paypalEmail),
      },
    })
  } catch (error) {
    return failure(error)
  }
}

/** Saves the link to a creator's post on one campaign. */
export async function PATCH(request: Request) {
  try {
    const { uid, db } = await creator(request)
    const body = await request.json() as { id?: string; postLink?: string }
    const id = clip(body.id, 128)
    const application = (await db.collection("campaignApplications").doc(id).get()).data()
    if (!application || application.userId !== uid) return failure(new Error("Campaign not found."), 404)
    const postLink = clip(body.postLink, 500)
    if (postLink && !/^https?:\/\//i.test(postLink)) return failure(new Error("Paste the full link, starting with https://"), 400)
    await db.collection("campaignPeople").doc(id).set({ postLink, updatedAt: Timestamp.now() }, { merge: true })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}

/** Saves where the creator gets paid. Readable by them and their agency's admins. */
export async function PUT(request: Request) {
  try {
    const { uid, agencyId, db } = await creator(request)
    const body = await request.json() as Record<string, unknown>
    await db.collection("creatorPayouts").doc(uid).set({
      agencyId,
      accountName: clip(body.accountName, 120),
      bankName: clip(body.bankName, 120),
      accountNumber: clip(body.accountNumber, 40),
      paypalEmail: clip(body.paypalEmail, 200).toLowerCase(),
      updatedAt: Timestamp.now(),
    }, { merge: true })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
