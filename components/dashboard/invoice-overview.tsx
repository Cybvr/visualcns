"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { AlertCircle, Bell, Check, CheckCircle2, CircleDot, CreditCard, Download, Link2, Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"

import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDate, invoiceAmountDue, invoiceStatusMeta, updateInvoice, type Invoice } from "@/lib/billing"
import type { BusinessProfile } from "@/lib/business-profile"
import { invoiceEmailContext } from "@/lib/document-emails"
import { buildEmailComposeHref, siteUrl } from "@/lib/email-composer"
import { daysUntilDue, reminderBody, reminderSubject } from "@/lib/invoice-reminders"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

type TimelineStep = { key: string; label: string; detail: string; tone: "done" | "pending" | "late" }

function readableDate(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? formatDate(value) : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

function timelineFor(invoice: Invoice): TimelineStep[] {
  const steps: TimelineStep[] = []
  if (invoice.issuedOn) steps.push({ key: "issued", label: "Invoice issued", detail: formatDate(invoice.issuedOn), tone: "done" })
  if (invoice.lastEmailSentAt) steps.push({ key: "sent", label: "Invoice sent", detail: readableDate(invoice.lastEmailSentAt), tone: "done" })
  if (invoice.lastReminderAt) steps.push({ key: "reminder", label: invoice.reminderCount && invoice.reminderCount > 1 ? `Reminder sent (${invoice.reminderCount})` : "Reminder sent", detail: readableDate(invoice.lastReminderAt), tone: "done" })
  if ((invoice.amountPaid ?? 0) > 0 && invoice.status !== "paid") steps.push({ key: "part", label: "Part paid", detail: formatMoney(invoice.amountPaid ?? 0, invoice.currency), tone: "done" })
  if (invoice.dueOn) steps.push({ key: "due", label: "Due date", detail: formatDate(invoice.dueOn), tone: invoice.status === "paid" ? "done" : "pending" })
  if (invoice.status === "paid") {
    steps.push({ key: "paid", label: "Paid", detail: formatMoney(invoice.amount, invoice.currency), tone: "done" })
  } else if (invoice.status !== "void" && invoice.status !== "draft" && invoice.dueOn) {
    const days = daysUntilDue(invoice.dueOn)
    if (days !== null && days < 0) steps.push({ key: "late", label: `Overdue (${-days} ${-days === 1 ? "day" : "days"})`, detail: `Since ${formatDate(invoice.dueOn)}`, tone: "late" })
  }
  return steps
}

/**
 * An invoice opened on its own: number, status and dates on top with the main
 * actions, the invoice itself, and beside it what is still owed and how the
 * invoice has moved so far.
 */
export function InvoiceOverview({
  invoice,
  issuer,
  canEdit,
  editHref,
  actions,
  onChange,
}: {
  invoice: Invoice
  issuer?: BusinessProfile
  canEdit: boolean
  editHref: string
  /** Extra header buttons from the page. */
  actions?: ReactNode
  onChange: (invoice: Invoice) => void
}) {
  const [recording, setRecording] = useState(false)
  const [payment, setPayment] = useState("")
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const status = invoiceStatusMeta[invoice.status] ?? invoiceStatusMeta.draft
  const due = invoiceAmountDue(invoice)
  const open = invoice.status === "sent" || invoice.status === "overdue"
  const shareHref = `/share/invoices/${encodeURIComponent(invoice.id)}`
  const heading = invoice.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : invoice.title?.trim() || "Invoice"
  const reminderHref = buildEmailComposeHref({
    ...invoiceEmailContext(invoice, invoice.companyId),
    subject: reminderSubject(invoice),
    body: reminderBody(invoice, siteUrl(shareHref)),
    intent: "reminder",
  })

  async function save(patch: Partial<Invoice>, success: string) {
    setSaving(true)
    try {
      await updateInvoice(invoice.id, patch)
      onChange({ ...invoice, ...patch })
      toast.success(success)
      return true
    } catch (error) {
      console.error("Error updating invoice:", error)
      toast.error("The invoice couldn't be updated.")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function recordPayment() {
    const amount = Math.round(Number(payment.replace(/,/g, "")) * 100)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter the amount received, e.g. 1250.00")
      return
    }
    const amountPaid = Math.min(invoice.amount, (invoice.amountPaid ?? 0) + amount)
    const paidInFull = amountPaid >= invoice.amount
    const done = await save(paidInFull ? { amountPaid, status: "paid" } : { amountPaid }, paidInFull ? "Payment recorded. Invoice paid." : "Payment recorded.")
    if (done) { setRecording(false); setPayment("") }
  }

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

  const buttonClass = "max-sm:size-9 max-sm:px-0"

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
            <Button asChild variant="outline" className={buttonClass}>
              <Link href={editHref} aria-label="Edit invoice" title="Edit"><Pencil className="size-4" aria-hidden="true" /><span className="max-sm:sr-only">Edit</span></Link>
            </Button>
          )}
          {canEdit && open && (
            <Button asChild variant="outline" className={buttonClass}>
              <Link href={reminderHref} aria-label="Send reminder" title="Send reminder"><Bell className="size-4" aria-hidden="true" /><span className="max-sm:sr-only">Send reminder</span></Link>
            </Button>
          )}
          <Button type="button" variant="outline" className={buttonClass} onClick={() => void copyShareLink()} aria-label="Copy invoice link" title="Share">
            <Link2 className="size-4" aria-hidden="true" /><span className="max-sm:sr-only">Share</span>
          </Button>
          <Button type="button" variant="outline" className={buttonClass} onClick={() => void downloadPdf()} disabled={downloading} aria-label="Download PDF" title="Download PDF">
            {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
            <span className="max-sm:sr-only">Download PDF</span>
          </Button>
          {actions}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">
          <InvoiceDocument invoice={invoice} issuer={issuer} />
        </div>

        <aside className="space-y-4 print:hidden lg:sticky lg:top-[calc(var(--shell-header-h,0px)+1rem)]">
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{invoice.status === "paid" ? "Paid in full" : "Amount due"}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(invoice.status === "paid" ? invoice.amount : due, invoice.currency)}</p>
            {(invoice.amountPaid ?? 0) > 0 && invoice.status !== "paid" && (
              <p className="mt-1 text-xs text-muted-foreground">{formatMoney(invoice.amountPaid ?? 0, invoice.currency)} of {formatMoney(invoice.amount, invoice.currency)} paid</p>
            )}

            {open && due > 0 && (
              <div className="mt-4 space-y-2">
                {canEdit ? (
                  <>
                    {recording ? (
                      <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void recordPayment() }}>
                        <Input autoFocus inputMode="decimal" value={payment} onChange={(event) => setPayment(event.target.value)} placeholder={`Amount received (${invoice.currency})`} aria-label="Amount received" />
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving" : "Save payment"}</Button>
                          <Button type="button" variant="ghost" onClick={() => { setRecording(false); setPayment("") }}>Cancel</Button>
                        </div>
                      </form>
                    ) : (
                      <Button type="button" className="w-full" onClick={() => setRecording(true)}>
                        <CreditCard className="size-4" aria-hidden="true" />
                        Record payment
                      </Button>
                    )}
                    <Button type="button" variant="outline" className="w-full" disabled={saving} onClick={() => void save({ status: "paid", amountPaid: invoice.amount }, "Invoice marked as paid.")}>
                      <Check className="size-4" aria-hidden="true" />
                      Mark as paid
                    </Button>
                  </>
                ) : (
                  <Button asChild className="w-full">
                    <Link href={shareHref}><CreditCard className="size-4" aria-hidden="true" />Pay now</Link>
                  </Button>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Payment timeline</h2>
            <ol className="mt-4 space-y-4">
              {timelineFor(invoice).map((step, index, steps) => {
                const Icon = step.tone === "late" ? AlertCircle : step.tone === "done" ? CheckCircle2 : CircleDot
                return (
                  <li key={step.key} className="relative flex gap-3">
                    {index < steps.length - 1 && <span className="absolute left-[9px] top-6 h-[calc(100%-0.5rem)] w-px bg-border" aria-hidden="true" />}
                    <Icon className={cn("mt-0.5 size-[18px] shrink-0", step.tone === "late" ? "text-red-600" : step.tone === "done" ? "text-emerald-600" : "text-muted-foreground")} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className={cn("text-sm font-medium", step.tone === "late" && "text-red-600")}>{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.detail}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}
