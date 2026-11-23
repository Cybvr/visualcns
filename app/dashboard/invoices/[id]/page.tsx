"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Ngai } from "@/components/agent/ngai"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { InvoiceBuilder } from "@/components/dashboard/invoice-builder"
import { InvoiceOverview } from "@/components/dashboard/invoice-overview"
import { useHideHeader, usePageTitle } from "@/components/dashboard/page-title-context"
import { Button } from "@/components/ui/button"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { watchInvoice, type Invoice } from "@/lib/billing"

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const adminView = isAdmin && !isImpersonating
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  // The editor keeps its own draft, so it is rebuilt from the saved invoice only when
  // someone else (like Ngai) changes it, not right after this page's own save.
  const [editorKey, setEditorKey] = useState(0)
  const ownSaveUntil = useRef(0)
  const loaded = useRef(false)

  usePageTitle(invoice?.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : null, "/dashboard/artifacts")
  // The agency sees Ngai beside the invoice, like an open document, so the dashboard header steps aside.
  const withNgai = adminView && Boolean(invoice)
  useHideHeader(withNgai)

  useEffect(() => {
    getBusinessProfile().then(setIssuer).catch((error) => console.error("Error loading business profile:", error))
  }, [])

  // Followed live, so changes Ngai makes show at once.
  useEffect(() => {
    if (!id || !user || !appUser) return
    setLoading(true)
    return watchInvoice(
      id,
      (record, { local }) => {
        const visible = record && (adminView || (record.companyId === appUser.companyId && record.status !== "draft"))
        setInvoice(visible ? record : null)
        // A write from this page shows first as local, then confirmed a moment later: skip both.
        if (local) ownSaveUntil.current = Date.now() + 5000
        else if (loaded.current && Date.now() > ownSaveUntil.current) setEditorKey((key) => key + 1)
        loaded.current = true
        setLoading(false)
      },
      (error) => {
        console.error("Error loading invoice:", error)
        setFailed(true)
        setLoading(false)
      },
    )
  }, [adminView, appUser, id, user])

  if (!user) return null
  if (loading) return <DashboardPageSkeleton variant="detail" />

  if (failed || !invoice) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Link href="/dashboard/artifacts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to Artifacts</Link>
        <p className="mt-12 text-sm text-muted-foreground">This invoice couldn’t be found or you don’t have access to it.</p>
      </main>
    )
  }

  const title = invoice.title?.trim() || (invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : "Invoice")
  const overview = (
    <InvoiceOverview
      invoice={invoice}
      issuer={issuer ?? undefined}
      canEdit={adminView}
      editHref={`/dashboard/invoices/${encodeURIComponent(invoice.id)}/edit`}
      actions={invoice.url ? <DocumentActions url={invoice.url} /> : undefined}
      onChange={setInvoice}
    />
  )

  if (!withNgai) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-9">{overview}</main>
  }

  return (
    // Ngai first, the invoice beside it, filling the dashboard card; each side scrolls on its own.
    <main className="w-full lg:grid lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
      <aside className="hidden min-h-0 overflow-hidden border-r border-border lg:flex lg:flex-col">
        <Ngai
          scope={{ kind: "invoice", invoice: { id: invoice.id, title } }}
          layout="panel"
          className="bg-transparent"
          heading={<>
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => router.push("/dashboard/artifacts")} aria-label="Back to Artifacts"><ArrowLeft className="size-4" aria-hidden="true" /></Button>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
          </>}
        />
      </aside>
      {/* The invoice itself, editable in place, like an open document. */}
      <section className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
        <div className="min-h-full w-full">
          <InvoiceBuilder
            key={editorKey}
            invoice={invoice}
            hideBack
            flush
            onSaved={(saved) => setInvoice(saved)}
            onDeleted={() => router.push("/dashboard/artifacts")}
          />
        </div>
      </section>
    </main>
  )
}
