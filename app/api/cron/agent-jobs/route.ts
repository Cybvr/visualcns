import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { claimAgentJob, updateAgentJob } from "@/lib/agent/jobs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const jobSecret = process.env.AGENT_JOB_SECRET || process.env.CRON_SECRET || ""
  const authorization = request.headers.get("authorization") || ""
  const authorized = Boolean(jobSecret) && (authorization === `Bearer ${process.env.AGENT_JOB_SECRET || ""}` || authorization === `Bearer ${process.env.CRON_SECRET || ""}`)
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  const { db } = adminServices()
  const [queued, running] = await Promise.all([
    db.collection("agentJobs").where("status", "==", "queued").limit(5).get(),
    db.collection("agentJobs").where("status", "==", "running").limit(5).get(),
  ])
  const candidates = [...queued.docs, ...running.docs.filter((doc) => {
    const lease = doc.data().leaseUntil
    return lease && typeof lease.toMillis === "function" && lease.toMillis() < Date.now()
  })]
  const results: Array<{ id: string; status: string }> = []
  for (const doc of candidates) {
    const job = await claimAgentJob(doc.id)
    if (!job) continue
    try {
      const origin = new URL(request.url).origin
      const response = await fetch(`${origin}/api/agent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-agent-job-id": job.id, "x-agent-job-secret": jobSecret },
        body: JSON.stringify({ messages: job.messages, surface: job.surface, companyContext: job.companyContext }),
      })
      if (!response.body) throw new Error("Agent worker returned no stream.")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let result = ""
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        result += decoder.decode(chunk.value, { stream: true })
        await updateAgentJob(job.id, { status: "running", checkpoint: result.slice(-4000) })
      }
      if (!response.ok) throw new Error(result.slice(0, 500) || `Agent returned ${response.status}`)
      await updateAgentJob(job.id, { status: "succeeded", result: result.slice(-20000) })
      results.push({ id: job.id, status: "succeeded" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Background agent run failed."
      const retryable = job.attempts < job.maxAttempts
      await updateAgentJob(job.id, retryable ? { status: "queued", lastError: message } : { status: "failed", lastError: message })
      results.push({ id: job.id, status: retryable ? "queued" : "failed" })
    }
  }
  return NextResponse.json({ processed: results.length, jobs: results })
}
