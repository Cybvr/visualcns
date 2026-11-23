"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Ngai } from "@/components/agent/ngai"
import { ArtifactTitleMenu } from "@/components/agent/artifact-title-menu"
import { ArtifactWindowControls } from "@/components/agent/artifact-window-controls"
import { cn } from "@/lib/utils"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { InvoiceBuilder } from "@/components/dashboard/invoice-builder"
import { InvoiceOverview } from "@/components/dashboard/invoice-overview"
import { useHideHeader, usePageTitle } from "@/components/dashboard/page-title-context"
import { Button } from "@/components/ui/button"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { deleteInvoice, updateInvoice, watchInvoice, type Invoice } from "@/lib/billing"

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
  const [sharing, setSharing] = useState(false)
  // Expand gives the invoice the whole width; Close puts it away and leaves the chat.
  const [expanded, setExpanded] = useState(false)
  const [closed, setClosed] = useState(false)

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
    <main className={cn("w-full lg:grid lg:h-full lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden", expanded || closed ? "lg:grid-cols-[minmax(0,1fr)]" : "lg:grid-cols-[20rem_minmax(0,1fr)]")}>
      {/* Expanded: the invoice takes the whole width. Closed: Ngai does. */}
      <aside className={cn("hidden min-h-0 overflow-hidden lg:flex lg:flex-col", !closed && "border-r border-border", expanded && "lg:hidden")}>
        <Ngai
          scope={{ kind: "invoice", invoice: { id: invoice.id, title } }}
          layout="panel"
          className="bg-transparent"
          heading={<>
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => router.push("/dashboard/artifacts")} aria-label="Back to Artifacts"><ArrowLeft className="size-4" aria-hidden="true" /></Button>
            <ArtifactTitleMenu
              title={title}
              noun="invoice"
              // The editor holds its own copy of the title, so it reloads to show the new one.
              onRename={async (next) => { await updateInvoice(invoice.id, { title: next }); setEditorKey((key) => key + 1) }}
              onShare={() => setSharing(true)}
              onDelete={async () => { await deleteInvoice(invoice.id); router.push("/dashboard/artifacts") }}
              deleteDescription={`${invoice.invoiceNumber || "This invoice"} will be removed for good. This cannot be undone.`}
              onOpen={closed ? () => setClosed(false) : undefined}
            />
          </>}
        />
        <ShareDialog
          showTrigger={false}
          open={sharing}
          onOpenChange={setSharing}
          path={`/share/invoices/${encodeURIComponent(invoice.id)}`}
          title={title}
          access={{ enabled: invoice.shareEnabled ?? false, onEnabledChange: (enabled) => { void updateInvoice(invoice.id, { shareEnabled: enabled }).then(() => setEditorKey((key) => key + 1)) } }}
        />
      </aside>
      {/* The invoice itself, editable in place, like an open document. */}
      <section className={cn("min-w-0 lg:min-h-0 lg:overflow-y-auto", closed && "lg:hidden")}>
        <div className="min-h-full w-full">
          <InvoiceBuilder
            key={editorKey}
            invoice={invoice}
            hideBack
            flush
            autosave
            trailing={<ArtifactWindowControls expanded={expanded} onToggleExpand={() => setExpanded((current) => !current)} onClose={() => { setExpanded(false); setClosed(true) }} />}
            onSaved={(saved) => setInvoice(saved)}
            onDeleted={() => router.push("/dashboard/artifacts")}
          />
        </div>
      </section>
    </main>
  )
}
