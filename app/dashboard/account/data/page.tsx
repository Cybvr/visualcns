"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { AccountNav } from "@/components/account/account-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AgencyDataPage() {
  const { user, isAdmin, loading } = useAuth()
  const [confirmation, setConfirmation] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  async function token() { if (!user) throw new Error("Sign in required"); return user.getIdToken() }
  async function exportData() { setBusy(true); setMessage(""); try { const response = await fetch("/api/admin/tenant-data", { headers: { Authorization: `Bearer ${await token()}` } }); const data = await response.json(); if (!response.ok) throw new Error(data.error); const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${data.tenantId}-export.json`; link.click(); URL.revokeObjectURL(url); setMessage("Export downloaded.") } catch (error) { setMessage(error instanceof Error ? error.message : "Export failed.") } finally { setBusy(false) } }
  async function deleteData() { if (!window.confirm("This permanently removes this tenant's workspace data. Continue?")) return; setBusy(true); setMessage(""); try { const response = await fetch("/api/admin/tenant-data", { method: "DELETE", headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setMessage("Tenant data deletion completed.") } catch (error) { setMessage(error instanceof Error ? error.message : "Deletion failed.") } finally { setBusy(false) } }
  if (!loading && !isAdmin) return null
  return <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6"><AccountNav /><header className="mt-7"><h1 className="text-lg font-semibold">Workspace data</h1></header><div className="mt-6 space-y-8"><section className="border border-border p-5"><h2 className="font-medium">Export</h2><Button className="mt-4" variant="outline" disabled={busy} onClick={() => void exportData()}>Download export</Button></section><section className="border border-destructive/40 p-5"><h2 className="font-medium">Delete workspace data</h2><Label className="mt-4 block text-sm" htmlFor="delete-confirmation">Confirmation</Label><Input id="delete-confirmation" className="mt-1 max-w-sm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE your-tenant-id" /><Button className="mt-4" variant="destructive" disabled={busy || !confirmation} onClick={() => void deleteData()}>Delete tenant data</Button></section>{message && <p className="text-sm text-muted-foreground">{message}</p>}</div></main>
}
