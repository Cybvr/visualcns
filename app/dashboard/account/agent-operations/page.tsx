"use client"

import { useCallback, useEffect, useState } from "react"

import { AccountHeader } from "@/components/account/account-nav"
import { useAuth } from "@/components/auth-provider"

type Insights = {
  runs: { total: number; succeeded: number; failed: number; abandoned: number; successRate: number; activeUsers: number; avgLatencyMs: number; totalTokens: number; estimatedCostUsd: number; toolFailures: number }
  adoption: Record<string, number>
}

type Memory = { id: string; content: string; status: string; kind: string; scope: string; source?: string; version?: number }

function Metric({ label, value, help }: { label: string; value: string; help: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{help}</p></div>
}

export default function AgentOperationsPage() {
  const { user } = useAuth()
  const [insights, setInsights] = useState<Insights | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")

  const load = useCallback(async () => {
    if (!user) return
    const token = await user.getIdToken()
    const [insightsResponse, memoriesResponse] = await Promise.all([
      fetch("/api/admin/agent-insights", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/agent/memories", { headers: { Authorization: `Bearer ${token}` } }),
    ])
    const insightsBody = await insightsResponse.json().catch(() => ({}))
    const memoriesBody = await memoriesResponse.json().catch(() => ({}))
    if (!insightsResponse.ok) throw new Error(insightsBody.error || "Could not load Ngai operations.")
    setInsights(insightsBody)
    setMemories(Array.isArray(memoriesBody.memories) ? memoriesBody.memories : [])
  }, [user])

  useEffect(() => { void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load Ngai operations.")) }, [load])

  async function updateMemory(id: string, status: "approved" | "archived") {
    if (!user) return
    setBusy(id)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/agent/memories", { method: "PATCH", headers: { "content-type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, status }) })
      if (!response.ok) throw new Error("Memory update failed.")
      await load()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Memory update failed.")
    } finally { setBusy("") }
  }

  const runStats = insights?.runs
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-9 sm:px-6">
      <AccountHeader title="Ngai operations" />
      {error && <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Agent metrics">
        <Metric label="Runs" value={String(runStats?.total ?? "—")} help={`${runStats?.succeeded ?? 0} succeeded`} />
        <Metric label="Success rate" value={runStats ? `${Math.round(runStats.successRate * 100)}%` : "—"} help={`${runStats?.failed ?? 0} failed · ${runStats?.abandoned ?? 0} stale`} />
        <Metric label="Active users" value={String(runStats?.activeUsers ?? "—")} help="Users with recorded runs" />
        <Metric label="Avg latency" value={runStats ? `${(runStats.avgLatencyMs / 1000).toFixed(1)}s` : "—"} help={`${runStats?.toolFailures ?? 0} tool failures`} />
        <Metric label="Tokens" value={runStats ? runStats.totalTokens.toLocaleString() : "—"} help="Input + output tokens" />
        <Metric label="Estimated cost" value={runStats ? `$${runStats.estimatedCostUsd.toFixed(4)}` : "—"} help="Configured OpenAI rates" />
        <Metric label="Messages sent" value={String(insights?.adoption.message_sent ?? 0)} help="Composer submissions" />
        <Metric label="Agent opened" value={String(insights?.adoption.agent_opened ?? 0)} help="Panel or page opens" />
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Shared memory review</h2>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {memories.length === 0 && <p className="px-4 py-5 text-sm text-muted-foreground">No memories have been proposed yet.</p>}
          {memories.map((memory) => (
            <div key={memory.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{memory.status}</span><span>·</span><span>{memory.kind}</span><span>·</span><span>{memory.scope}</span></div><p className="mt-1 text-sm">{memory.content}</p>{memory.source && <p className="mt-1 text-xs text-muted-foreground">Source: {memory.source}</p>}</div>
              {memory.status === "proposed" && <div className="flex shrink-0 gap-2"><button type="button" disabled={busy === memory.id} onClick={() => void updateMemory(memory.id, "approved")} className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background disabled:opacity-50">Approve</button><button type="button" disabled={busy === memory.id} onClick={() => void updateMemory(memory.id, "archived")} className="rounded-md border border-border px-3 py-2 text-xs font-medium disabled:opacity-50">Archive</button></div>}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
