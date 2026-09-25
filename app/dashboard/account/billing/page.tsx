"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { AccountNav } from "@/components/account/account-nav"
import { Button } from "@/components/ui/button"
import { getAgency, type Agency } from "@/lib/agencies"

export default function AgencyBillingPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [agency, setAgency] = useState<Agency | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!authLoading && isAdmin) void getAgency().then(setAgency) }, [authLoading, isAdmin])
  async function open(path: string) { if (!user) return; setBusy(true); try { const token = await user.getIdToken(); const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Billing action failed"); window.location.assign(data.url) } finally { setBusy(false) } }
  if (!authLoading && !isAdmin) return null
  return <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6"><AccountNav /><header className="mt-7"><h1 className="text-lg font-semibold">Agency billing</h1></header><div className="mt-6 border border-border p-5"><p className="font-medium">{agency?.plan || "Trial"}</p><p className="mt-1 text-sm text-muted-foreground">Status: {agency?.status || "trial"}</p><div className="mt-5 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void open("/api/billing/checkout")}>{busy && <Loader2 className="mr-2 size-4 animate-spin" />}Start subscription</Button><Button variant="outline" disabled={busy} onClick={() => void open("/api/billing/portal")}>Manage billing</Button></div></div></main>
}
