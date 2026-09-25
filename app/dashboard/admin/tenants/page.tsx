"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { AccountNav } from "@/components/account/account-nav"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type TenantRow = { id: string; name?: string; status?: string; plan?: string; updatedAt?: unknown }

export default function TenantOperationsPage() {
  const { user, role, loading } = useAuth()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [ownTenantId, setOwnTenantId] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!user || role !== "superadmin") return
    setBusy(true); setError(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/tenants", { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not load tenants")
      setTenants(data.tenants || [])
      setOwnTenantId(typeof data.ownTenantId === "string" ? data.ownTenantId : "")
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load tenants") }
    finally { setBusy(false) }
  }

  useEffect(() => { void load() }, [user, role])

  async function setStatus(tenantId: string, status: string) {
    if (!user || tenantId === ownTenantId) return
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/tenants", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, status }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Tenant status update failed")
      await load()
    } catch (statusError) { setError(statusError instanceof Error ? statusError.message : "Tenant status update failed") }
  }

  async function deleteTenant(tenantId: string) {
    if (!user || tenantId === ownTenantId) return
    setDeleting(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/tenants", { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, confirmation: `DELETE ${tenantId}` }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Tenant deletion failed")
      setDeleteTarget(null)
      await load()
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Tenant deletion failed") }
    finally { setDeleting(false) }
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{tenant.id === ownTenantId ? "current workspace" : tenant.status || "unknown"}</span>
          {tenant.id !== ownTenantId && <>
            <Button size="sm" variant="outline" onClick={() => void setStatus(tenant.id, tenant.status === "suspended" ? "active" : "suspended")}>{tenant.status === "suspended" ? "Reactivate" : "Suspend"}</Button>
            <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(tenant)}>Delete</Button>
          </>}
        </div>
      </div>)}
      {!tenants.length && <p className="p-4 text-sm text-muted-foreground">No tenants have been provisioned yet.</p>}
    </div>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this tenant?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget?.name || deleteTarget?.id} and all of its workspace data will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={deleting} onClick={() => { if (deleteTarget) void deleteTenant(deleteTarget.id) }}>
            {deleting ? "Deleting…" : "Delete tenant"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>
}
