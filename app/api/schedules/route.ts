import { NextResponse } from "next/server"

import { authorizeScheduleAdmin, scheduleCollections, scheduleFields, toDraft, toSchedule } from "@/lib/server/lead-schedules"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function failure(error: unknown, status = 403) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong." }, { status })
}

/** The agency's schedules and the drafts waiting for approval. */
export async function GET(request: Request) {
  try {
    const { agencyId, db } = await authorizeScheduleAdmin(request)
    const { schedules, drafts } = scheduleCollections(db)
    const [scheduleSnapshot, draftSnapshot] = await Promise.all([
      schedules.where("agencyId", "==", agencyId).get(),
      drafts.where("agencyId", "==", agencyId).where("status", "==", "pending").limit(200).get(),
    ])
    return NextResponse.json({
      schedules: scheduleSnapshot.docs.map((item) => toSchedule(item.id, item.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      drafts: draftSnapshot.docs.map((item) => toDraft(item.id, item.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: Request) {
  try {
    const { uid, agencyId, db } = await authorizeScheduleAdmin(request)
    const fields = scheduleFields(await request.json() as Record<string, unknown>)
    if (!fields.name || !fields.query) return failure(new Error("Give the schedule a name and a search."), 400)
    const now = new Date().toISOString()
    const ref = scheduleCollections(db).schedules.doc()
    await ref.set({ ...fields, agencyId, createdBy: uid, lastRunAt: "", lastRun: null, createdAt: now, updatedAt: now })
    return NextResponse.json({ id: ref.id })
  } catch (error) {
    return failure(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const { agencyId, db } = await authorizeScheduleAdmin(request)
    const body = await request.json() as Record<string, unknown>
    const ref = scheduleCollections(db).schedules.doc(String(body.id || ""))
    const current = (await ref.get()).data()
    if (!current || current.agencyId !== agencyId) return failure(new Error("Schedule not found."), 404)
    const fields = scheduleFields({ ...current, ...body })
    if (!fields.name || !fields.query) return failure(new Error("Give the schedule a name and a search."), 400)
    await ref.set({ ...fields, updatedAt: new Date().toISOString() }, { merge: true })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const { agencyId, db } = await authorizeScheduleAdmin(request)
    const id = new URL(request.url).searchParams.get("id") || ""
    const { schedules, drafts } = scheduleCollections(db)
    const ref = schedules.doc(id)
    const current = (await ref.get()).data()
    if (!current || current.agencyId !== agencyId) return failure(new Error("Schedule not found."), 404)
    // Leads it found stay in Leads; only the unsent drafts go with it.
    const pending = await drafts.where("agencyId", "==", agencyId).where("scheduleId", "==", id).where("status", "==", "pending").get()
    const batch = db.batch()
    pending.docs.forEach((item) => batch.delete(item.ref))
    batch.delete(ref)
    await batch.commit()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
