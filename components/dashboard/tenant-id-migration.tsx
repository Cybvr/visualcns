"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Database, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function TenantIdMigration() {
  const { user, isAdmin, isImpersonating } = useAuth()
  const [pending, setPending] = useState<number | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isAdmin || isImpersonating) return null

  async function call(method: "GET" | "POST") {
    if (!user || busy) return
    setBusy(true); setError(null); setMessage(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/tenant-migration", { method, headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Request failed")
      setTenantId(data.tenantId); setPending(data.total)
      setMessage(method === "GET" ? "Scan complete. No records were changed." : `Migration complete. ${data.total} record${data.total === 1 ? "" : "s"} updated.`)
    } catch (migrationError) {
      setError(migrationError instanceof Error ? migrationError.message : "Tenant migration failed")
    } finally { setBusy(false) }
  }

  async function migrate() {
    if (pending === null || pending === 0) return
    if (!window.confirm(`Add tenantId to ${pending} existing record${pending === 1 ? "" : "s"}${tenantId ? ` in ${tenantId}` : ""}?`)) return
    await call("POST")
  }

  return <Card className="mt-8 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base"><Database className="size-4" aria-hidden="true" />Tenant ID migration</CardTitle>
      <CardDescription>Backfill the tenant boundary on existing records before tenant-isolated rules are enabled.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => void call("GET")} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}Scan records</Button>
        {pending !== null && pending > 0 && <Button type="button" onClick={() => void migrate()} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}Migrate {pending} record{pending === 1 ? "" : "s"}</Button>}
      </div>
      {message && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" />{message}</p>}
      {error && <p className="mt-3 flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" aria-hidden="true" />{error}</p>}
    </CardContent>
  </Card>
}
