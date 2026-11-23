"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Bell, Download, Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"

import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate, invoiceStatusMeta, type Invoice } from "@/lib/billing"
import type { BusinessProfile } from "@/lib/business-profile"
import { invoiceEmailContext } from "@/lib/document-emails"
import { buildEmailComposeHref } from "@/lib/email-composer"
import { reminderBody, reminderSubject } from "@/lib/invoice-reminders"
import { cn } from "@/lib/utils"

/**
 * An invoice opened on its own, read-only (what a client sees): number, status
 * and dates on top with the main actions, then the invoice itself.
 */
export function InvoiceOverview({
  invoice,
  issuer,
  canEdit,
  editHref,
  actions,
}: {
  invoice: Invoice
  issuer?: BusinessProfile
  canEdit: boolean
  editHref: string
  /** Extra header buttons from the page. */
  actions?: ReactNode
  onChange?: (invoice: Invoice) => void
}) {
  const [downloading, setDownloading] = useState(false)

  const status = invoiceStatusMeta[invoice.status] ?? invoiceStatusMeta.draft
  const open = invoice.status === "sent" || invoice.status === "overdue"
  const shareHref = `/share/invoices/${encodeURIComponent(invoice.id)}`
  const heading = invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : invoice.title?.trim() || "Invoice"
  const reminderHref = buildEmailComposeHref({
    ...invoiceEmailContext(invoice, invoice.companyId),
    subject: reminderSubject(invoice),
    body: reminderBody(invoice),
    intent: "reminder",
  })

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${shareHref}`)
      toast.success("Invoice link copied")
    } catch {
      toast.error("The invoice link couldn't be copied.")
    }
  }

  async function downloadPdf() {
    setDownloading(true)
    try {
      const { downloadInvoicePdf } = await import("@/components/dashboard/invoice-pdf")
      await downloadInvoicePdf({ invoice, issuer })
    } catch (error) {
      console.error("Error downloading invoice PDF:", error)
      toast.error("The PDF couldn't be created.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-w-0">
      <header className="flex flex-col gap-4 pb-6 print:hidden lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{heading}</h1>
            <Badge variant="secondary" className={cn("rounded-full", status.className)}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[invoice.issuedOn && `Issued ${formatDate(invoice.issuedOn)}`, invoice.dueOn && `Due ${formatDate(invoice.dueOn)}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button asChild variant="outline" size="icon" className="size-9">
              <Link href={editHref} aria-label="Edit invoice" title="Edit"><Pencil className="size-4" aria-hidden="true" /></Link>
            </Button>
          )}
          {canEdit && open && (
            <Button asChild variant="outline" className="max-sm:size-9 max-sm:px-0">
              <Link href={reminderHref} aria-label="Send reminder" title="Send reminder"><Bell className="size-4" aria-hidden="true" /><span className="max-sm:sr-only">Send reminder</span></Link>
            </Button>
          )}
          <Button type="button" variant="outline" className="h-9" onClick={() => void copyShareLink()} title="Copy invoice link">
            Share
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-9" onClick={() => void downloadPdf()} disabled={downloading} aria-label="Download PDF" title="Download PDF">
            {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
          </Button>
          {actions}
        </div>
      </header>

      <div className="min-w-0">
        <InvoiceDocument invoice={invoice} issuer={issuer} />
      </div>
    </div>
  )
}
