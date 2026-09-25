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

type AgencyRow = { id: string; name?: string; status?: string; plan?: string; updatedAt?: unknown }

export default function AgencyOperationsPage() {
  const { user, role, loading } = useAuth()
  const [agencies, setAgencies] = useState<AgencyRow[]>([])
  const [ownAgencyId, setOwnAgencyId] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<AgencyRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!user || role !== "superadmin") return
    setBusy(true); setError(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/agencies", { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not load agencies")
      setAgencies(data.agencies || [])
      setOwnAgencyId(typeof data.ownAgencyId === "string" ? data.ownAgencyId : "")
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load agencies") }
    finally { setBusy(false) }
  }

  useEffect(() => { void load() }, [user, role])

  async function setStatus(agencyId: string, status: string) {
    if (!user || agencyId === ownAgencyId) return
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/agencies", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ agencyId, status }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Agency status update failed")
      await load()
    } catch (statusError) { setError(statusError instanceof Error ? statusError.message : "Agency status update failed") }
  }

  async function deleteAgency(agencyId: string) {
    if (!user || agencyId === ownAgencyId) return
    setDeleting(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/agencies", { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ agencyId, confirmation: `DELETE ${agencyId}` }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Agency deletion failed")
      setDeleteTarget(null)
      await load()
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Agency deletion failed") }
    finally { setDeleting(false) }
  }

  if (loading || busy) return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6"><AccountNav /><div className="mt-7"><DashboardPageSkeleton rows={5} /></div></main>
  if (role !== "superadmin") return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6"><AccountNav /><p className="mt-6 text-sm text-muted-foreground">This area is restricted to platform operations.</p></main>

  return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
    <AccountNav />
    <h1 className="mt-7 text-xl font-semibold">Agency operations</h1>
    {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-6 divide-y divide-border border border-border">
      {agencies.map((agency) => <div key={agency.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div><p className="font-medium">{agency.name || agency.id}</p><p className="text-xs text-muted-foreground">{agency.id} · {agency.plan || "trial"}</p></div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{agency.id === ownAgencyId ? "current workspace" : agency.status || "unknown"}</span>
          {agency.id !== ownAgencyId && <>
            <Button size="sm" variant="outline" onClick={() => void setStatus(agency.id, agency.status === "suspended" ? "active" : "suspended")}>{agency.status === "suspended" ? "Reactivate" : "Suspend"}</Button>
            <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(agency)}>Delete</Button>
          </>}
        </div>
      </div>)}
      {!agencies.length && <p className="p-4 text-sm text-muted-foreground">No agencies have been provisioned yet.</p>}
    </div>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this agency?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget?.name || deleteTarget?.id} and all of its workspace data will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={deleting} onClick={() => { if (deleteTarget) void deleteAgency(deleteTarget.id) }}>
            {deleting ? "Deleting…" : "Delete agency"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>
}
