import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { isScheduleDue, runSchedule, scheduleCollections, toSchedule } from "@/lib/server/lead-schedules"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

/** Daily: runs every active schedule that's due. Anything that doesn't fit in this run goes tomorrow. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || ""
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  const started = Date.now()
  const { db } = adminServices()
  const snapshot = await scheduleCollections(db).schedules.where("active", "==", true).get()
  const due = snapshot.docs
    .map((item) => toSchedule(item.id, item.data()))
    .filter((schedule) => isScheduleDue(schedule))
    .sort((a, b) => a.lastRunAt.localeCompare(b.lastRunAt))

  const results: Array<{ id: string; added: number; drafted: number; error?: string }> = []
  for (const schedule of due) {
    if (Date.now() - started > 200_000) break
    const summary = await runSchedule(schedule)
    results.push({ id: schedule.id, added: summary.added, drafted: summary.drafted, error: summary.error })
  }
  return NextResponse.json({ due: due.length, ran: results.length, results })
}
