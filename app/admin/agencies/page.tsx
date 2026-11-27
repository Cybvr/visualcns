"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { AccountNav } from "@/components/account/account-nav"
import { MobileCardsSkeleton } from "@/components/dashboard/collection-skeletons"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { InitialAvatar } from "@/components/dashboard/compact-list-row"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

type AgencyRow = { id: string; name?: string; status?: string; plan?: string; updatedAt?: unknown }

export default function AgencyOperationsPage() {
  const { user, role, loading } = useAuth()
  const [agencies, setAgencies] = useState<AgencyRow[]>([])
  const [ownAgencyId, setOwnAgencyId] = useState("")
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
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/admin/agencies", { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ agencyId, confirmation: `DELETE ${agencyId}` }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Agency deletion failed")
      await load()
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Agency deletion failed") }
  }

  if (loading || busy) return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6"><AccountNav /><h1 className="mt-7 text-xl font-semibold">Agency management</h1><div className="mt-6"><MobileCardsSkeleton rows={5} /></div></main>
  if (role !== "superadmin") return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6"><AccountNav /><p className="mt-6 text-sm text-muted-foreground">This area is restricted to platform operations.</p></main>

  return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
    <AccountNav />
    <h1 className="mt-7 text-xl font-semibold">Agency management</h1>
    {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-6 space-y-2">
      {agencies.map((agency) => <MobileDataCard
        key={agency.id}
        surface="muted"
        iconShape="circle"
        icon={<InitialAvatar text={agency.name || agency.id} className="size-11" />}
        title={agency.name || agency.id}
        subtitle={`${agency.id} · ${agency.plan || "trial"}`}
        trailing={agency.id === ownAgencyId ? "Current agency" : agency.status || "Unknown"}
        menuLabel={`Options for ${agency.name || agency.id}`}
        actions={agency.id !== ownAgencyId ? {
          noun: "agency",
          name: agency.name || agency.id,
          extra: <DropdownMenuItem onSelect={() => void setStatus(agency.id, agency.status === "suspended" ? "active" : "suspended")}>{agency.status === "suspended" ? "Reactivate" : "Suspend"}</DropdownMenuItem>,
          onDelete: () => deleteAgency(agency.id),
          deleteLabel: "Delete agency",
          deleteMessage: `${agency.name || agency.id} and all of its agency data will be permanently deleted. This cannot be undone.`,
        } : undefined}
      />)}
      {!agencies.length && <p className="py-4 text-sm text-muted-foreground">No agencies have been provisioned yet.</p>}
    </div>
  </main>
}
