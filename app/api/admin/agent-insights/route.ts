import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { requireAgencyId } from "@/lib/require-agency-id"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(token)
    const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
    if (user.role !== "admin" && user.role !== "superadmin") return NextResponse.json({ error: "Admin access required." }, { status: 403 })
    const agencyId = requireAgencyId(user)
    const [runsSnapshot, eventsSnapshot] = await Promise.all([
      db.collection("agentRuns").where("agencyId", "==", agencyId).limit(500).get(),
      db.collection("agentAdoptionEvents").where("agencyId", "==", agencyId).limit(1000).get(),
    ])
    const runs = runsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, any>))
    const events = eventsSnapshot.docs.map((doc) => doc.data())
    const completed = runs.filter((run) => run.status === "succeeded")
    const staleCutoff = Date.now() - 10 * 60 * 1000
    const abandoned = runs.filter((run) => run.status === "running" && (run.startedAt?.toMillis?.() || 0) < staleCutoff).length
    const durations = completed.map((run) => {
      const start = run.startedAt?.toMillis?.() || 0
      const end = run.completedAt?.toMillis?.() || 0
      return start && end ? end - start : 0
    }).filter(Boolean)
    const eventCounts: Record<string, number> = {}
    for (const event of events) eventCounts[String(event.type || "unknown")] = (eventCounts[String(event.type || "unknown")] || 0) + 1
    const users = new Set(runs.map((run) => String(run.userId || "")).filter(Boolean))
    const cost = runs.reduce((sum, run) => sum + (typeof run.estimatedCostUsd === "number" ? run.estimatedCostUsd : 0), 0)
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      runs: { total: runs.length, succeeded: completed.length, failed: runs.filter((run) => run.status === "failed").length, abandoned, successRate: runs.length ? completed.length / runs.length : 0, activeUsers: users.size, avgLatencyMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0, totalTokens: runs.reduce((sum, run) => sum + Number(run.totalTokens || 0), 0), estimatedCostUsd: cost, toolFailures: runs.reduce((sum, run) => sum + Number(run.toolFailures || 0), 0) },
      adoption: eventCounts,
      recentRuns: runs.sort((a, b) => String(b.startedAt?.toMillis?.() || "").localeCompare(String(a.startedAt?.toMillis?.() || ""))).slice(0, 20),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent insights lookup failed." }, { status: 403 })
  }
}
