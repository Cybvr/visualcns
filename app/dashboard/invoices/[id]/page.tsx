"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { ContextualEmailButton } from "@/components/dashboard/contextual-email-button"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { getInvoice, type Invoice } from "@/lib/billing"
import { portalDocumentPath } from "@/lib/portal-model"

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  usePageTitle(invoice?.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : null, "/dashboard/invoices")

  useEffect(() => {
    if (!id || !user || !appUser) return
    let active = true
    setLoading(true)
    Promise.all([getInvoice(id), getBusinessProfile()])
      .then(([record, profile]) => {
        if (!active) return
        setIssuer(profile)
        if (!record) {
          setInvoice(null)
          return
        }
        const adminView = isAdmin && !isImpersonating
        const visible = adminView || (record.companyId === appUser.companyId && record.status !== "draft")
        setInvoice(visible ? record : null)
      })
      .catch((error) => {
        console.error("Error loading invoice:", error)
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [appUser, id, isAdmin, isImpersonating, user])

  if (!user) return null
  if (loading) return <DashboardPageSkeleton variant="detail" />

  if (failed || !invoice) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Link href="/dashboard/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to invoices</Link>
        <p className="mt-12 text-sm text-muted-foreground">This invoice couldn’t be found or you don’t have access to it.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <Link href="/dashboard/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" />Back to invoices</Link>
        <div className="flex items-center gap-2">
          {isAdmin && !isImpersonating && <ContextualEmailButton label="Send invoice" context={{ companyId: invoice.companyId, companyName: invoice.client, recipientEmail: invoice.billTo?.email, recipientName: invoice.billTo?.name, projectId: invoice.projectId, projectName: invoice.project, documentType: "invoice", documentId: invoice.id, documentTitle: invoice.invoiceNumber, subject: `Invoice ${invoice.invoiceNumber}`, ctaText: "View invoice", ctaUrl: portalDocumentPath(invoice.companyId, "invoice", invoice.id) }} />}
          <DocumentActions url={invoice.url} />
        </div>
      </div>

      <InvoiceDocument invoice={invoice} issuer={issuer ?? undefined} />
    </main>
  )
}
