import { NextResponse } from "next/server"

import { authorizeScheduleAdmin, scheduleCollections } from "@/lib/server/lead-schedules"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Saves edits to a draft, or marks it sent or discarded. The email itself goes
 * through /api/email/send from the page, so it lands in Email like any other.
 */
export async function PATCH(request: Request) {
  try {
    const { agencyId, db } = await authorizeScheduleAdmin(request)
    const body = await request.json() as { id?: string; status?: string; subject?: string; body?: string }
    const ref = scheduleCollections(db).drafts.doc(String(body.id || ""))
    const current = (await ref.get()).data()
    if (!current || current.agencyId !== agencyId) return NextResponse.json({ error: "Draft not found." }, { status: 404 })

    const now = new Date().toISOString()
    const patch: Record<string, unknown> = { updatedAt: now }
    if (typeof body.subject === "string") patch.subject = body.subject.trim().slice(0, 150)
    if (typeof body.body === "string") patch.body = body.body.trim().slice(0, 4000)
    if (body.status === "sent" || body.status === "discarded") patch.status = body.status
    await ref.set(patch, { merge: true })

    if (body.status === "sent" && current.leadId) {
      const leadRef = db.collection("leads").doc(String(current.leadId))
      const lead = (await leadRef.get()).data()
      if (lead && lead.agencyId === agencyId) {
        await leadRef.set({ lastContacted: now.slice(0, 10), ...(lead.stage === "new" || !lead.stage ? { stage: "contacted" } : {}), updatedAt: now }, { merge: true })
      }
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The draft could not be saved." }, { status: 403 })
  }
}
