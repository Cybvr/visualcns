"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Database, Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type OrganizationMigration = { id: string; name: string; slug?: string }

export function OrganizationSlugMigration() {
  const { user, isAdmin, isImpersonating } = useAuth()
  const [pending, setPending] = useState<OrganizationMigration[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isAdmin || isImpersonating) return null

  async function call(method: "GET" | "POST") {
    if (!user || busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/organization-slug-migration", { method, headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json() as { error?: string; organizations?: OrganizationMigration[]; total?: number; organizationCount?: number }
      if (!response.ok) throw new Error(data.error || "Request failed")
      const organizations = data.organizations || []
      setPending(method === "GET" ? organizations : null)
      setMessage(method === "GET"
        ? organizations.length ? `Found ${organizations.length} of ${data.organizationCount || organizations.length} compan${data.organizationCount === 1 ? "y" : "ies"} without a URL.` : `All ${data.organizationCount || 0} company URLs are already set.`
        : `Generated ${data.total || 0} company URL${data.total === 1 ? "" : "s"}.`)
    } catch (migrationError) {
      setError(migrationError instanceof Error ? migrationError.message : "Company URL migration failed")
    } finally {
      setBusy(false)
    }
  }

  async function migrate() {
    if (!pending?.length || busy) return
    if (!window.confirm(`Generate readable URLs for ${pending.length} compan${pending.length === 1 ? "y" : "ies"}? Existing URLs will not change.`)) return
    await call("POST")
  }

  return (
    <Card className="mt-8 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Database className="size-4" aria-hidden="true" />Company URL migration</CardTitle>
        <CardDescription>Generate readable portal URLs from company names. Existing custom URLs are preserved.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => void call("GET")} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy ? "Scanning…" : "Scan company URLs"}
          </Button>
          {pending && pending.length > 0 && (
            <Button type="button" onClick={() => void migrate()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {busy ? "Generating…" : `Generate ${pending.length} URL${pending.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>
        {message && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" />{message}</p>}
        {error && <p className="mt-3 flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" aria-hidden="true" />{error}</p>}
      </CardContent>
    </Card>
  )
}
