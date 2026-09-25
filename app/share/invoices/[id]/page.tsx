"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CompanyBanner } from "@/components/company/company-banner"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { Skeleton } from "@/components/ui/skeleton"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { getInvoice, type Invoice } from "@/lib/billing"
import { getOrganization, type Organization } from "@/lib/organizations"
import type { Project } from "@/lib/projects"

/** No login required: issued company invoices are public; drafts stay private. */
export default function SharedInvoicePage() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let active = true
    getInvoice(id)
      .then(async (record) => {
        if (!active) return
        const visible = record && record.status !== "draft" ? record : null
        setInvoice(visible)
        setLoading(false)
        // Issuer/org headers are nice-to-have on top of the invoice itself,
        // so a failure here never blocks the document from showing.
        const [profileResult, orgResult] = await Promise.allSettled([
          getBusinessProfile(),
          visible ? getOrganization(visible.companyId) : Promise.resolve(null),
        ])
        if (!active) return
        if (profileResult.status === "fulfilled") setIssuer(profileResult.value)
        if (orgResult.status === "fulfilled") setOrganization(orgResult.value)
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
  }, [id])

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

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex justify-end print:hidden">
          <DocumentActions url={invoice.url} title={`${companyName} Invoice ${invoice.invoiceNumber}`} />
        </div>
        <div className="mb-6 print:hidden">
          <CompanyBanner name={companyName} categoryLabel={organization?.industry ?? ""} coverProject={coverProject} />
        </div>
        <InvoiceDocument invoice={invoice} issuer={issuer ?? undefined} />
        <p className="mt-6 text-center text-xs text-muted-foreground print:hidden">
          Shared by {issuer?.name ?? "VisualCNS"} · {issuer?.website ?? "visualcns.com"}
        </p>
      </div>
    </main>
  )
}
