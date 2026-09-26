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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getAgency } from "@/lib/agencies"
import { PAYMENT_TERM_OPTIONS } from "@/lib/billing"
import { DEFAULT_ESTIMATE_NOTES, DEFAULT_ESTIMATE_TERMS, getBusinessProfile, updateAgencyBusinessSettings } from "@/lib/business-profile"

const EMPTY = {
  name: "", logoUrl: "", primaryColor: "", accentColor: "", subdomain: "", senderEmail: "",
  address: "", email: "", phone: "", website: "", taxNumber: "",
  invoicePaymentTermsDays: "14", invoiceNotes: "", invoicePaymentInstructions: "",
  estimateTerms: DEFAULT_ESTIMATE_TERMS, estimatePaymentDetails: "", estimateNotes: DEFAULT_ESTIMATE_NOTES,
}

export default function AgencySettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (authLoading || !isAdmin) return
    let active = true
    Promise.all([getAgency(), getBusinessProfile()])
      .then(([agency, profile]) => {
        if (!active) return
        setForm({
          name: agency?.name || profile.name || "",
          logoUrl: agency?.logoUrl || profile.logoUrl || "",
          primaryColor: agency?.primaryColor || "",
          accentColor: agency?.accentColor || "",
          subdomain: agency?.subdomain || "",
          senderEmail: agency?.senderEmail || "",
          address: profile.address || "",
          email: profile.email || "",
          phone: profile.phone || "",
          website: profile.website || "",
          taxNumber: profile.taxNumber || "",
          invoicePaymentTermsDays: String(profile.invoicePaymentTermsDays ?? 14),
          invoiceNotes: profile.invoiceNotes || "",
          invoicePaymentInstructions: profile.invoicePaymentInstructions || "",
          estimateTerms: profile.estimateTerms ?? DEFAULT_ESTIMATE_TERMS,
          estimatePaymentDetails: profile.estimatePaymentDetails || "",
          estimateNotes: profile.estimateNotes ?? DEFAULT_ESTIMATE_NOTES,
        })
      })
      .catch((error) => {
        console.error("Could not load agency settings:", error)
        if (active) setMessage("Could not load agency settings.")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [authLoading, isAdmin])

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setMessage("")
  }

  async function save() {
    if (saving) return
    if (!form.name.trim()) { setMessage("Enter an agency name."); return }
    setSaving(true)
    setMessage("")
    const subdomain = form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    try {
      await updateAgencyBusinessSettings({
        name: form.name.trim(), logoUrl: form.logoUrl, primaryColor: form.primaryColor,
        accentColor: form.accentColor, subdomain, senderEmail: form.senderEmail.trim(),
      }, {
        name: form.name.trim(), logoUrl: form.logoUrl,
        address: form.address.trim(), email: form.email.trim(), phone: form.phone.trim(),
        website: form.website.trim(), taxNumber: form.taxNumber.trim(),
        invoicePaymentTermsDays: Number(form.invoicePaymentTermsDays),
        invoiceNotes: form.invoiceNotes.trim(),
        invoicePaymentInstructions: form.invoicePaymentInstructions.trim(),
        estimateTerms: form.estimateTerms.trim(),
        estimatePaymentDetails: form.estimatePaymentDetails.trim(),
        estimateNotes: form.estimateNotes.trim(),
      })
      setForm((current) => ({ ...current, subdomain }))
      setMessage("Agency settings saved.")
    } catch (error) {
      console.error("Could not save agency settings:", error)
      setMessage("Could not save agency settings.")
    } finally {
      setSaving(false)
    }
  }

  if (!authLoading && !isAdmin) return null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6">
      <AccountNav />
      <header className="mt-7"><h1 className="text-lg font-semibold">Agency settings</h1></header>
      {loading ? <DashboardPageSkeleton variant="form" rows={6} /> : (
        <div className="mt-6 space-y-8">
          <section className="space-y-5">
            <ImageDropzone compact label="Agency logo" value={form.logoUrl} onChange={(url) => set("logoUrl", url)} />
            <div className="space-y-1.5"><Label htmlFor="agency-name">Agency name</Label><Input id="agency-name" value={form.name} onChange={(event) => set("name", event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="agency-sender">Sender email</Label><Input id="agency-sender" type="email" value={form.senderEmail} onChange={(event) => set("senderEmail", event.target.value)} placeholder="hello@example.com" /></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5"><Label htmlFor="agency-primary">Primary color</Label><Input id="agency-primary" value={form.primaryColor} onChange={(event) => set("primaryColor", event.target.value)} placeholder="#111111" /></div>
              <div className="space-y-1.5"><Label htmlFor="agency-accent">Accent color</Label><Input id="agency-accent" value={form.accentColor} onChange={(event) => set("accentColor", event.target.value)} placeholder="#ff5a36" /></div>
              <div className="space-y-1.5"><Label htmlFor="agency-subdomain">Subdomain</Label><Input id="agency-subdomain" value={form.subdomain} onChange={(event) => set("subdomain", event.target.value)} placeholder="your-agency" /></div>
            </div>
          </section>

          <section className="space-y-5 border-t border-border pt-6">
            <div><h2 className="font-medium">Business details</h2><p className="text-sm text-muted-foreground">Shown on invoices, estimates, and contracts.</p></div>
            <div className="space-y-1.5"><Label htmlFor="agency-address">Company address</Label><Textarea id="agency-address" rows={2} value={form.address} onChange={(event) => set("address", event.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="agency-email">Business email</Label><Input id="agency-email" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="agency-phone">Phone</Label><Input id="agency-phone" type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="agency-website">Website</Label><Input id="agency-website" value={form.website} onChange={(event) => set("website", event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="agency-tax">Tax / registration number</Label><Input id="agency-tax" value={form.taxNumber} onChange={(event) => set("taxNumber", event.target.value)} /></div>
            </div>
          </section>

          <section className="space-y-5 border-t border-border pt-6">
            <div><h2 className="font-medium">Document defaults</h2><p className="text-sm text-muted-foreground">Applied to new documents. You can still edit each document separately.</p></div>
            <div className="space-y-1.5">
              <Label htmlFor="agency-invoice-terms">Invoice payment terms</Label>
              <Select value={form.invoicePaymentTermsDays} onValueChange={(value) => set("invoicePaymentTermsDays", value)}>
                <SelectTrigger id="agency-invoice-terms"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_TERM_OPTIONS.map((option) => <SelectItem key={option.days} value={String(option.days)}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="agency-invoice-notes">Invoice note</Label><Textarea id="agency-invoice-notes" rows={3} value={form.invoiceNotes} onChange={(event) => set("invoiceNotes", event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="agency-invoice-payment">Invoice payment instructions</Label><Textarea id="agency-invoice-payment" rows={3} value={form.invoicePaymentInstructions} onChange={(event) => set("invoicePaymentInstructions", event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="agency-estimate-terms">Estimate terms</Label><Textarea id="agency-estimate-terms" rows={5} value={form.estimateTerms} onChange={(event) => set("estimateTerms", event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="agency-estimate-payment">Estimate payment details</Label><Textarea id="agency-estimate-payment" rows={3} value={form.estimatePaymentDetails} onChange={(event) => set("estimatePaymentDetails", event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="agency-estimate-notes">Estimate disclaimer</Label><Textarea id="agency-estimate-notes" rows={3} value={form.estimateNotes} onChange={(event) => set("estimateNotes", event.target.value)} /></div>
          </section>

          <div className="flex items-center gap-3"><Button onClick={() => void save()} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Save</Button>{message && <span className="text-sm text-muted-foreground" role="status">{message}</span>}</div>
        </div>
      )}
    </main>
  )
}
