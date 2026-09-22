"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { AccountNav } from "@/components/account/account-nav"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { ImageDropzone } from "@/components/image-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getTenant, updateCurrentTenant } from "@/lib/tenants"

const EMPTY = { name: "", logoUrl: "", primaryColor: "", accentColor: "", subdomain: "", senderEmail: "" }

export default function AgencySettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  useEffect(() => { if (!authLoading && isAdmin) void getTenant().then((tenant) => { if (tenant) setForm({ name: tenant.name || "", logoUrl: tenant.logoUrl || "", primaryColor: tenant.primaryColor || "", accentColor: tenant.accentColor || "", subdomain: tenant.subdomain || "", senderEmail: tenant.senderEmail || "" }); setLoading(false) }) }, [authLoading, isAdmin])
  function set(field: keyof typeof EMPTY, value: string) { setForm((current) => ({ ...current, [field]: value })); setMessage("") }
  async function save() { setSaving(true); setMessage(""); try { await updateCurrentTenant({ ...form, subdomain: form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || undefined }); setMessage("Agency settings saved.") } catch { setMessage("Could not save agency settings.") } finally { setSaving(false) } }
  if (!authLoading && !isAdmin) return null
  return <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6"><AccountNav /><header className="mt-7"><h1 className="text-lg font-semibold">Agency settings</h1><p className="mt-1 text-sm leading-6 text-muted-foreground">Branding and delivery defaults for this tenant. These settings never cross into another agency.</p></header>{loading ? <DashboardPageSkeleton variant="form" rows={6} /> : <div className="mt-6 space-y-5"><ImageDropzone compact label="Agency logo" value={form.logoUrl} onChange={(url) => set("logoUrl", url)} /><div className="space-y-1.5"><Label htmlFor="agency-name">Agency name</Label><Input id="agency-name" value={form.name} onChange={(event) => set("name", event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="agency-sender">Sender email</Label><Input id="agency-sender" type="email" value={form.senderEmail} onChange={(event) => set("senderEmail", event.target.value)} placeholder="hello@example.com" /></div><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-1.5"><Label htmlFor="agency-primary">Primary color</Label><Input id="agency-primary" value={form.primaryColor} onChange={(event) => set("primaryColor", event.target.value)} placeholder="#111111" /></div><div className="space-y-1.5"><Label htmlFor="agency-accent">Accent color</Label><Input id="agency-accent" value={form.accentColor} onChange={(event) => set("accentColor", event.target.value)} placeholder="#ff5a36" /></div><div className="space-y-1.5"><Label htmlFor="agency-subdomain">Subdomain</Label><Input id="agency-subdomain" value={form.subdomain} onChange={(event) => set("subdomain", event.target.value)} placeholder="your-agency" /></div></div><div className="flex items-center gap-3"><Button onClick={() => void save()} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Save</Button>{message && <span className="text-sm text-muted-foreground">{message}</span>}</div></div>}</main>
}
