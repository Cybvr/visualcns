"use client"

import { Suspense, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { CreditCard } from "lucide-react"
import { toast } from "sonner"
import { CompanyBanner } from "@/components/company/company-banner"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { getInvoice, INVOICE_ISSUER, type Invoice } from "@/lib/billing"
import { formatMoney } from "@/lib/money"
import { getOrganization, type Organization } from "@/lib/organizations"
import type { Project } from "@/lib/projects"

/** No login required: issued links remain available; drafts need link sharing enabled. */
export default function SharedInvoicePage() {
  return <Suspense><SharedInvoice /></Suspense>
}

function SharedInvoice() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [payEmail, setPayEmail] = useState("")
  // Bumped after a confirmed payment so the invoice reloads as paid.
  const [reloadKey, setReloadKey] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnedReference = searchParams.get("reference") || searchParams.get("trxref") || ""

  // Paystack sends the payer back here with the payment reference; confirm it, then drop it from the address.
  useEffect(() => {
    if (!id || !returnedReference) return
    let active = true
    fetch(`/api/invoices/${encodeURIComponent(id)}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", reference: returnedReference }),
    })
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as { error?: string }
        if (!active) return
        if (response.ok) {
          toast.success("Payment received. Thank you.")
          setReloadKey((key) => key + 1)
        } else {
          toast.error(result.error || "We couldn't confirm the payment.")
        }
      })
      .catch(() => { if (active) toast.error("We couldn't confirm the payment.") })
      .finally(() => { if (active) router.replace(`/share/invoices/${encodeURIComponent(id)}`) })
    return () => { active = false }
  }, [id, returnedReference, router])

  async function payInvoice() {
    if (!invoice || paying) return
    setPaying(true)
    try {
      const response = await fetch(`/api/invoices/${encodeURIComponent(invoice.id)}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", email: payEmail }),
      })
      const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error || "Payment couldn't start. Please try again.")
      window.location.assign(result.url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment couldn't start. Please try again.")
      setPaying(false)
    }
  }

  useEffect(() => {
    if (!id) return
    let active = true
    getInvoice(id)
      .then(async (record) => {
        if (!active) return
        const visible = record && (record.status !== "draft" || record.shareEnabled) ? record : null
        setInvoice(visible)
        setLoading(false)
        if (!visible) return
        // Issuer/org headers are nice-to-have on top of the invoice itself,
        // so a failure here never blocks the document from showing.
        const organization = await getOrganization(visible.companyId).catch(() => null)
        const profile = await getBusinessProfile(visible.agencyId || organization?.agencyId)
        if (!active) return
        setIssuer(profile)
        if (organization) setOrganization(organization)
      })
      .catch(() => {
        if (active) {
          setInvoice(null)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [id, reloadKey])

  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16" role="status" aria-label="Loading shared invoice">
        <div className="mx-auto max-w-5xl space-y-6"><Skeleton className="h-10 w-28" /><Skeleton className="h-32 w-full" /><Skeleton className="h-[32rem] w-full rounded-xl" /></div>
      </main>
    )
  }

  if (!invoice) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <p className="text-sm text-muted-foreground">This link is no longer available.</p>
      </main>
    )
  }

  const companyName = organization?.name || invoice.client
  const coverProject: Project = {
    id: invoice.companyId,
    companyId: invoice.companyId,
    client: companyName,
    title: companyName,
    service: "",
    status: "in-progress",
    progress: 0,
    dueDate: "",
    thumbnailUrl: organization?.logoUrl,
  }

  const balance = Math.max(0, invoice.amount - (invoice.amountPaid ?? 0))
  const canPay = (invoice.status === "sent" || invoice.status === "overdue") && balance > 0
  const needsEmail = !invoice.billTo?.email

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex justify-end print:hidden">
          <DocumentActions url={invoice.url} title={`${companyName} Invoice ${invoice.invoiceNumber}`} />
        </div>
        <div className="mb-6 print:hidden">
          <CompanyBanner name={companyName} categoryLabel={organization?.industry ?? ""} coverProject={coverProject} />
        </div>
        {canPay && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center print:hidden">
            <p className="text-sm sm:mr-auto">
              <span className="text-muted-foreground">Amount due </span>
              <span className="font-semibold">{formatMoney(balance, invoice.currency)}</span>
            </p>
            {needsEmail && (
              <Input type="email" value={payEmail} onChange={(event) => setPayEmail(event.target.value)} placeholder="Your email" aria-label="Your email" autoComplete="email" className="sm:w-56" />
            )}
            <Button type="button" onClick={() => void payInvoice()} disabled={paying || (needsEmail && !payEmail.trim())}>
              <CreditCard className="size-4" aria-hidden="true" />
              {paying ? "Opening Paystack" : "Pay now"}
            </Button>
          </div>
        )}
        {invoice.status === "paid" && (
          <p className="mb-6 rounded-xl border border-border bg-background p-4 text-sm font-medium print:hidden">This invoice is paid. Thank you.</p>
        )}
        <InvoiceDocument invoice={invoice} issuer={issuer ?? undefined} />
        <p className="mt-6 text-center text-xs text-muted-foreground print:hidden">
          Shared by {INVOICE_ISSUER.name} · {INVOICE_ISSUER.website}
        </p>
      </div>
    </main>
  )
}
