import { NextResponse } from "next/server"

import { authorizeScheduleAdmin, runSchedule, scheduleCollections, toSchedule } from "@/lib/server/lead-schedules"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

/** Runs one schedule now, whatever its timing. */
export async function POST(request: Request) {
  try {
    const { agencyId, db } = await authorizeScheduleAdmin(request)
    const { id } = await request.json() as { id?: string }
    const snapshot = await scheduleCollections(db).schedules.doc(String(id || "")).get()
    const data = snapshot.data()
    if (!data || data.agencyId !== agencyId) return NextResponse.json({ error: "Schedule not found." }, { status: 404 })
    const summary = await runSchedule(toSchedule(snapshot.id, data))
    return NextResponse.json({ summary }, { status: summary.error ? 502 : 200 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The schedule could not run." }, { status: 403 })
  }
}
