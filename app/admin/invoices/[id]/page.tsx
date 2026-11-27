"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { NgaiWorkspace } from "@/components/agent/ngai-workspace"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { InvoiceOverview } from "@/components/dashboard/invoice-overview"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { watchInvoice, type Invoice } from "@/lib/billing"

/** The read-only invoice a client sees, followed live. */
function ClientInvoice({ id }: { id: string }) {
  const { user, appUser } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  usePageTitle(invoice?.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : null, "/admin/artifacts")

  useEffect(() => {
    getBusinessProfile().then(setIssuer).catch((error) => console.error("Error loading business profile:", error))
  }, [])

  useEffect(() => {
    if (!id || !user || !appUser) return
    setLoading(true)
    return watchInvoice(
      id,
      (record) => {
        const visible = record && record.companyId === appUser.companyId && record.status !== "draft"
        setInvoice(visible ? record : null)
        setLoading(false)
      },
      (error) => {
        console.error("Error loading invoice:", error)
        setFailed(true)
        setLoading(false)
      },
    )
  }, [appUser, id, user])

  if (!user) return null
  if (loading) return <DashboardPageSkeleton variant="detail" />

  if (failed || !invoice) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Link href="/admin/artifacts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to Artifacts</Link>
        <p className="mt-12 text-sm text-muted-foreground">This invoice couldn’t be found or you don’t have access to it.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
      <InvoiceOverview
        invoice={invoice}
        issuer={issuer ?? undefined}
        canEdit={false}
        editHref={`/admin/invoices/${encodeURIComponent(invoice.id)}/edit`}
        actions={invoice.url ? <DocumentActions url={invoice.url} /> : undefined}
      />
    </main>
  )
}

/** The agency gets the invoice open in the one Ngai UI; a client gets the read-only invoice. */
export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  // The workspace updates the address as items open and close; the page keeps what it started with.
  const [id] = useState(params?.id ?? "")
  const { user, isAdmin, isImpersonating } = useAuth()

  if (!user || !id) return null
  if (isAdmin && !isImpersonating) return <NgaiWorkspace initial={{ kind: "invoice", id }} />
  return <ClientInvoice id={id} />
}
