"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { AccountNav } from "@/components/account/account-nav"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { Button } from "@/components/ui/button"

type TenantRow = { id: string; name?: string; status?: string; plan?: string; updatedAt?: unknown; deletedAt?: unknown }

export default function TenantOperationsPage() {
  const { user, appUser, role, loading, isViewingAs } = useAuth()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  // appUser is the "view as" target while previewing; the real account's tenant is what matters here.
  const ownTenantId = isViewingAs ? null : appUser?.tenantId

  async function load() {
    if (!user || role !== "superadmin") return
    setBusy(true); setError(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/tenants", { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not load tenants")
      setTenants(data.tenants || [])
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load tenants") }
    finally { setBusy(false) }
  }

  useEffect(() => { void load() }, [user, role])

  async function setStatus(tenantId: string, status: string) {
    if (!user) return
    const token = await user.getIdToken()
    await fetch("/api/admin/tenants", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, status }) })
    await load()
  }

  async function deleteTenant(tenant: TenantRow) {
    if (!user || tenant.id === ownTenantId || isViewingAs) return
    const confirmation = window.prompt(
      `This permanently deletes "${tenant.name || tenant.id}" and all its data (people, projects, tasks, documents, invoices, emails). This cannot be undone.\n\nType DELETE ${tenant.id} to confirm.`,
    )
    if (confirmation === null) return
    if (confirmation.trim() !== `DELETE ${tenant.id}`) { setError("Confirmation text did not match. Nothing was deleted."); return }
    setDeleting(tenant.id); setError(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/tenant-data", { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ tenantId: tenant.id, confirmation: confirmation.trim() }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not delete organization")
      await load()
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Could not delete organization") }
    finally { setDeleting(null) }
  }

  if (loading || busy) return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6"><AccountNav /><div className="mt-7"><DashboardPageSkeleton rows={5} /></div></main>
  if (role !== "superadmin") return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6"><AccountNav /><p className="mt-6 text-sm text-muted-foreground">This area is restricted to platform operations.</p></main>

  return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
    <AccountNav />
    <h1 className="mt-7 text-xl font-semibold">Tenant operations</h1>
    {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-6 divide-y divide-border border border-border">
      {tenants.map((tenant) => <div key={tenant.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div><p className="font-medium">{tenant.name || tenant.id}</p><p className="text-xs text-muted-foreground">{tenant.id} · {tenant.plan || "trial"}</p></div>
        {tenant.deletedAt
          ? <span className="text-xs text-muted-foreground">Deleted</span>
          : <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{tenant.status || "unknown"}</span>
              <Button size="sm" variant="outline" disabled={deleting === tenant.id} onClick={() => void setStatus(tenant.id, tenant.status === "suspended" ? "active" : "suspended")}>{tenant.status === "suspended" ? "Reactivate" : "Suspend"}</Button>
              {tenant.id !== ownTenantId && !isViewingAs && <Button size="sm" variant="destructive" disabled={deleting !== null} onClick={() => void deleteTenant(tenant)}>{deleting === tenant.id ? "Deleting…" : "Delete"}</Button>}
            </div>}
      </div>)}
      {!tenants.length && <p className="p-4 text-sm text-muted-foreground">No tenants have been provisioned yet.</p>}
    </div>
  </main>
}
