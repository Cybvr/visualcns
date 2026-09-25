"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, Loader2, Plus, Printer, Save, Share2, Trash2 } from "lucide-react"

import { DangerZone } from "@/components/dashboard/danger-zone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PAYMENT_DETAILS,
  PAYMENT_TERM_OPTIONS,
  computeTotals,
  createInvoice,
  deleteInvoice,
  dueDateFrom,
  formatMoney,
  invoiceStatusMeta,
  nextInvoiceNumber,
  updateInvoice,
  type Invoice,
  type InvoiceLineItem,
  type InvoiceStatus,
  type Estimate,
} from "@/lib/billing"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getProjects, type Project } from "@/lib/projects"
import { getOrganizations, type Organization } from "@/lib/organizations"
import { ShareLinkField } from "@/components/dashboard/share-link-field"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { downloadInvoicePdf } from "@/components/dashboard/invoice-pdf"
import { DocumentPreviewFrame } from "@/components/dashboard/document-preview-frame"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "NGN", symbol: "₦" },
  { code: "GBP", symbol: "£" },
] as const

/** Line items are held as strings while typing so a half-typed number survives. */
type DraftLine = {
  id: string
  title: string
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
}

function makeLine(): DraftLine {
  return {
    id: Math.random().toString(36).slice(2, 10),
    title: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    taxRate: "0",
  }
}

function estimateDraftLines(estimate?: Estimate): DraftLine[] {
  if (!estimate?.lineItems?.length) return [makeLine()]
  const billable = estimate.lineItems.filter((item) => !item.optional)
  return (billable.length ? billable : estimate.lineItems).map((item) => ({
    id: item.id,
    title: item.description,
    description: item.details ?? "",
    quantity: "1",
    unitPrice: ((item.amount ?? 0) / 100).toFixed(2),
    taxRate: "0",
  }))
}

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function InvoiceBuilder({ invoice, initialCompanyId, initialEstimate }: { invoice?: Invoice | null; initialCompanyId?: string; initialEstimate?: Estimate }) {
  const router = useRouter()
  const isEdit = Boolean(invoice)

  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber ?? "")
  const [invoiceTitle, setInvoiceTitle] = useState(invoice?.title ?? initialEstimate?.title ?? "")
  const [companyId, setCompanyId] = useState(invoice?.companyId ?? initialEstimate?.companyId ?? initialCompanyId ?? "")
  const [projectId, setProjectId] = useState(invoice?.projectId ?? initialEstimate?.projectId ?? "")
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? "draft")
  const [currency, setCurrency] = useState(invoice?.currency || initialEstimate?.currency || "USD")

  const [billToName, setBillToName] = useState(invoice?.billTo?.name ?? initialEstimate?.preparedFor?.name ?? "")
  const [billToEmail, setBillToEmail] = useState(invoice?.billTo?.email ?? initialEstimate?.preparedFor?.email ?? "")
  const [billToAddress, setBillToAddress] = useState(invoice?.billTo?.address ?? initialEstimate?.preparedFor?.address ?? "")
  const [billToTaxNumber, setBillToTaxNumber] = useState(invoice?.billTo?.taxNumber ?? "")
  const [poReference, setPoReference] = useState(invoice?.poReference ?? "")

  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (invoice?.lineItems?.length) {
      return invoice.lineItems.map((item) => ({
        id: item.id,
        title: item.title ?? item.description,
        description: item.title ? item.description : "",
        quantity: String(item.quantity ?? 1),
        unitPrice: ((item.unitPrice ?? 0) / 100).toFixed(2),
        taxRate: String(item.taxRate ?? 0),
      }))
    }
    // An invoice raised before line items existed carries a single total, so
    // open it as one line rather than losing the amount.
    if (invoice?.amount && !invoice.url) {
      return [
        {
          ...makeLine(),
          description: invoice.project || "Services",
          unitPrice: (invoice.amount / 100).toFixed(2),
        },
      ]
    }
    return estimateDraftLines(initialEstimate)
  })

  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    invoice?.discount?.type ?? "amount",
  )
  const [discountValue, setDiscountValue] = useState(
    invoice?.discount
      ? invoice.discount.type === "percent"
        ? String(invoice.discount.value)
        : (invoice.discount.value / 100).toFixed(2)
      : "",
  )
  const [amountPaid, setAmountPaid] = useState(
    invoice?.amountPaid ? (invoice.amountPaid / 100).toFixed(2) : "",
  )

  // Either the invoice is built here from line items, or it lives somewhere
  // else and this row is just a pointer to it.
  const [mode, setMode] = useState<"build" | "link">(
    invoice && !invoice.lineItems?.length && invoice.url ? "link" : "build",
  )
  const [url, setUrl] = useState(invoice?.url ?? "")
  const [linkedAmount, setLinkedAmount] = useState(
    invoice && !invoice.lineItems?.length && invoice.amount
      ? (invoice.amount / 100).toFixed(2)
      : "",
  )

  const [issuedOn, setIssuedOn] = useState(invoice?.issuedOn || initialEstimate?.issuedOn || today())
  const [termsDays, setTermsDays] = useState(invoice?.paymentTermsDays ?? 14)
  const [notes, setNotes] = useState(invoice?.notes ?? initialEstimate?.notes ?? "")
  const [paymentInstructions, setPaymentInstructions] = useState(invoice?.paymentInstructions ?? initialEstimate?.paymentDetails ?? "")

  const [shareEnabled, setShareEnabled] = useState(invoice?.shareEnabled ?? initialEstimate?.shareEnabled ?? false)

  const [clients, setClients] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const dueOn = dueDateFrom(issuedOn, termsDays)

  useEffect(() => {
    let active = true
    Promise.all([getOrganizations(), getProjects(), getBusinessProfile()])
      .then(([organizationList, projectList, profile]) => {
        if (!active) return
        setClients(organizationList)
        setProjects(projectList)
        setIssuer(profile)
      })
      .catch(() => {
        if (active) setError("Couldn't load clients and projects.")
      })
      .finally(() => {
        if (active) setOptionsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (isEdit) return
    let active = true
    nextInvoiceNumber()
      .then((next) => {
        if (active) setInvoiceNumber(next)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isEdit])

  // Addressing details follow the chosen client until they are edited by hand.
  useEffect(() => {
    if (!companyId || billToName) return
    const client = clients.find((entry) => entry.id === companyId)
    if (!client) return
    setBillToName(client.name)
    setBillToEmail((current) => current || client.email || "")
  }, [companyId, clients, billToName])

  useEffect(() => {
    if (optionsLoading || !projectId) return
    if (!projects.some((project) => project.id === projectId)) setProjectId("")
  }, [optionsLoading, projectId, projects])

  useEffect(() => {
    if (optionsLoading || !companyId || !clients.length) return
    if (!clients.some((client) => client.id === companyId)) setCompanyId("")
  }, [clients, companyId, optionsLoading])

  const lineItems: InvoiceLineItem[] = useMemo(
    () =>
      lines.map((line) => ({
        id: line.id,
        title: line.title.trim(),
        description: line.description.trim(),
        quantity: toNumber(line.quantity),
        unitPrice: Math.round(toNumber(line.unitPrice) * 100),
        taxRate: toNumber(line.taxRate),
      })),
    [lines],
  )

  const discount = useMemo(
    () => ({
      type: discountType,
      value:
        discountType === "percent" ? toNumber(discountValue) : Math.round(toNumber(discountValue) * 100),
    }),
    [discountType, discountValue],
  )

  const computed = useMemo(() => computeTotals(lineItems, discount), [lineItems, discount])
  const totals =
    mode === "link"
      ? {
          subtotal: Math.round(toNumber(linkedAmount) * 100),
          discountTotal: 0,
          taxTotal: 0,
          total: Math.round(toNumber(linkedAmount) * 100),
        }
      : computed
  const paid = Math.round(toNumber(amountPaid) * 100)
  const balance = Math.max(0, totals.total - paid)

  const selectedClient = clients.find((entry) => entry.id === companyId)
  const selectedProject = projects.find((entry) => entry.id === projectId)
  const draftInvoice: Invoice = {
    ...(invoice ?? {}),
    id: invoice?.id ?? "preview",
    companyId,
    client: selectedClient?.name ?? "",
    invoiceNumber: invoiceNumber || "Invoice preview",
    title: invoiceTitle,
    projectId: projectId || "",
    project: selectedProject?.title || "",
    status,
    billTo: {
      name: billToName,
      email: billToEmail,
      address: billToAddress,
      taxNumber: billToTaxNumber,
    },
    poReference,
    lineItems: mode === "link" ? [] : lineItems.filter((item) => item.title?.trim() || item.description.trim()),
    discount,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxTotal: totals.taxTotal,
    amountPaid: paid,
    amount: totals.total,
    currency,
    issuedOn,
    paymentTermsDays: termsDays,
    dueOn,
    notes,
    paymentInstructions,
    url,
    shareEnabled,
  }

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function removeLine(id: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    if (!companyId) {
      setError("Choose which client this invoice is for.")
      return
    }

    const linked = mode === "link"
    const billable = linked ? [] : lineItems.filter((item) => (item.title || item.description) && item.quantity > 0)

    if (linked && !url.trim()) {
      setError("Paste the link to the invoice.")
      return
    }
    if (linked && Math.round(toNumber(linkedAmount) * 100) <= 0) {
      setError("Enter what this invoice is for, e.g. 1250.00")
      return
    }
    if (!linked && billable.length === 0) {
      setError("Add at least one line with a title or description and a quantity.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const number = invoiceNumber.trim() || (await nextInvoiceNumber())
      const client = clients.find((entry) => entry.id === companyId)
      const project = projects.find((entry) => entry.id === projectId)
      const finalTotals = linked
        ? {
            subtotal: Math.round(toNumber(linkedAmount) * 100),
            discountTotal: 0,
            taxTotal: 0,
            total: Math.round(toNumber(linkedAmount) * 100),
          }
        : computeTotals(billable, discount)

      const payload = {
        invoiceNumber: number,
        title: invoiceTitle.trim(),
        companyId,
        client: client?.name ?? "",
        projectId: projectId || "",
        project: project?.title || "",
        status,
        billTo: {
          name: billToName.trim(),
          email: billToEmail.trim(),
          address: billToAddress.trim(),
          taxNumber: billToTaxNumber.trim(),
        },
        poReference: poReference.trim(),
        lineItems: billable,
        discount: linked ? { type: "amount" as const, value: 0 } : discount,
        subtotal: finalTotals.subtotal,
        discountTotal: finalTotals.discountTotal,
        taxTotal: finalTotals.taxTotal,
        amount: finalTotals.total,
        amountPaid: paid,
        currency,
        issuedOn,
        paymentTermsDays: termsDays,
        dueOn: dueDateFrom(issuedOn, termsDays),
        notes: notes.trim(),
        paymentInstructions: paymentInstructions.trim() || PAYMENT_DETAILS[currency] || "",
        url: url.trim(),
        shareEnabled,
      }

      if (invoice) await updateInvoice(invoice.id, payload)
      else await createInvoice(payload)

      router.push("/dashboard/invoices")
    } catch (err) {
      console.error("Error saving invoice:", err)
      setError("Couldn't save this invoice. Try again.")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!invoice) return
    await deleteInvoice(invoice.id)
    router.push("/dashboard/invoices")
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return
    setPdfDownloading(true)
    setError(null)
    try {
      await downloadInvoicePdf({ invoice: draftInvoice, issuer: issuer ?? undefined })
    } catch (err) {
      console.error("Error creating invoice PDF:", err)
      setError("Couldn't create the PDF. Try again.")
    } finally {
      setPdfDownloading(false)
    }
  }

  return (
    <>
    <form onSubmit={submit} className="invoice-editor space-y-5 text-[0.8125rem] print:hidden">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/invoices"
          aria-label="Back to invoices"
          className="-ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.01em]">{invoiceNumber}</h1>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Preview invoice"
          aria-label="Preview invoice"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="size-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" size="icon" title="Download PDF" aria-label="Download PDF" onClick={() => void handleDownloadPdf()} disabled={pdfDownloading}>
          {pdfDownloading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Printer className="size-4" aria-hidden="true" />}
        </Button>
        <Button type="button" variant="outline" size="icon" title="Share invoice" aria-label="Share invoice" onClick={() => setShareOpen(true)}>
          <Share2 className="size-4" aria-hidden="true" />
        </Button>
        <Button type="submit" size="icon" title={isEdit ? "Save invoice" : "Create invoice"} aria-label={isEdit ? "Save invoice" : "Create invoice"} disabled={saving} className="shrink-0">
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
        </Button>
        {isEdit && invoice && (
          <DangerZone
            label="invoice"
            confirmTitle="Delete this invoice?"
            confirmDescription={`${invoice.invoiceNumber} will be removed for good. This cannot be undone.`}
            onDelete={handleDelete}
            compact
            iconOnly
          />
        )}
      </div>

      <div className="mx-auto min-w-0 max-w-[52rem] space-y-3 rounded-md border border-border bg-background p-3 sm:p-8">
        <header className="invoice-editor-header flex items-start justify-between gap-8 border-b border-border pb-6">
          <div className="flex min-w-0 items-center gap-3">
            {issuer?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={issuer.logoUrl} alt="" width={52} height={52} className="size-[52px] shrink-0 rounded object-cover" />
            ) : (
              <Image src="/visualhqlogo.svg" alt="" width={52} height={52} className="size-[52px]" />
            )}
            <div className="min-w-0">
              <p className="invoice-brand-name truncate">{issuer?.name || "Your company"}</p>
              {issuer?.website && <p className="truncate text-muted-foreground">{issuer.website}</p>}
            </div>
          </div>
          <div className="min-w-0 shrink-0 text-right">
            <p className="font-medium">Invoice</p>
            <p className="text-muted-foreground">{invoiceNumber}</p>
          </div>
        </header>

        <div className="rounded-md bg-card/50 p-5">
        <div className="mb-4 border-b border-border pb-4">
          <Label htmlFor="invoice-title">Title</Label>
          <Input
            id="invoice-title"
            value={invoiceTitle}
            onChange={(event) => setInvoiceTitle(event.target.value)}
            placeholder="Invoice title"
            className="mt-1"
          />
        </div>
        <section className="grid gap-4 pb-4 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="client" className="sr-only">Client</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger id="client" className="mt-1 w-full">
                <SelectValue placeholder={optionsLoading ? "Loading..." : "Choose a client"} />
              </SelectTrigger>
              <SelectContent>
                {[...clients].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bill-to" className="sr-only">Bill to</Label>
            <Input
              id="bill-to"
              value={billToName}
              onChange={(event) => setBillToName(event.target.value)}
              placeholder="Bill to"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bill-email" className="sr-only">Billing email</Label>
            <Input
              id="bill-email"
              type="email"
              value={billToEmail}
              onChange={(event) => setBillToEmail(event.target.value)}
              placeholder="Billing email"
              className="mt-1"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="bill-address" className="sr-only">Billing address</Label>
            <Textarea
              id="bill-address"
              value={billToAddress}
              onChange={(event) => setBillToAddress(event.target.value)}
              placeholder="Billing address"
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tax-number" className="sr-only">Tax / VAT number</Label>
            <Input
              id="tax-number"
              value={billToTaxNumber}
              onChange={(event) => setBillToTaxNumber(event.target.value)}
              placeholder="Tax / VAT number"
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-b border-border pb-4 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="project" className="sr-only">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="project" className="mt-1 w-full">
                <SelectValue placeholder="Not tied to a project" />
              </SelectTrigger>
              <SelectContent>
                {projects
                  .filter((project) => !companyId || project.companyId === companyId)
                  .sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }))
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="po" className="sr-only">PO reference</Label>
            <Input
              id="po"
              value={poReference}
              onChange={(event) => setPoReference(event.target.value)}
              placeholder="PO reference"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="issued-on" className="sr-only">Issued</Label>
            <Input
              id="issued-on"
              type="date"
              value={issuedOn}
              onChange={(event) => setIssuedOn(event.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="terms" className="sr-only">Payment terms</Label>
            <Select
              value={String(termsDays)}
              onValueChange={(value) => setTermsDays(Number.parseInt(value, 10))}
            >
              <SelectTrigger id="terms" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERM_OPTIONS.map((option) => (
                  <SelectItem key={option.days} value={String(option.days)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="currency" className="sr-only">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency" className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((entry) => (
                    <SelectItem key={entry.code} value={entry.code}>
                      {entry.code} {entry.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status" className="sr-only">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as InvoiceStatus)}>
                <SelectTrigger id="status" className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(invoiceStatusMeta).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Due {dueOn || "—"}</p>
        </div>
      </section>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-sm font-medium">Invoice type</span>
        <div className="inline-flex rounded-[8px] bg-muted p-0.5">
          {(
            [
              { value: "build", label: "Internal" },
              { value: "link", label: "Link" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              aria-pressed={mode === option.value}
              className={cn(
                "rounded-[6px] px-3 py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                mode === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "link" ? (
        <section className="space-y-4 border-t border-border pt-5">
          <h2 className="text-sm font-medium">Linked invoice</h2>
          <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="invoice-url">Invoice link</Label>
            <Input
              id="invoice-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="linked-amount">Amount</Label>
            <Input
              id="linked-amount"
              value={linkedAmount}
              onChange={(event) => setLinkedAmount(event.target.value)}
              inputMode="decimal"
              placeholder="1250.00"
              className="mt-1"
            />
          </div>
          </div>
        </section>
      ) : (
      <section>
        {/* Phones get one stacked block per line instead of a six-column table. */}
        <div className="divide-y divide-border xl:hidden">
          {lines.map((line) => {
            const lineTotal = Math.round(toNumber(line.quantity) * toNumber(line.unitPrice) * 100)
            return (
              <div key={line.id} className="space-y-2 py-3 first:pt-0">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={line.title}
                      onChange={(event) => updateLine(line.id, { title: event.target.value })}
                      placeholder="Item title"
                      aria-label="Item title"
                    />
                    <Textarea
                      value={line.description}
                      onChange={(event) => updateLine(line.id, { description: event.target.value })}
                      placeholder="Description"
                      aria-label="Description"
                      rows={2}
                      className="min-h-12 resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                    aria-label="Remove line"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2">
                  <Input
                    value={line.quantity}
                    onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                    inputMode="decimal"
                    placeholder="Qty"
                    aria-label="Quantity"
                  />
                  <Input
                    value={line.unitPrice}
                    onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })}
                    inputMode="decimal"
                    placeholder="Price"
                    aria-label="Unit price"
                  />
                  <Input
                    value={line.taxRate}
                    onChange={(event) => updateLine(line.id, { taxRate: event.target.value })}
                    inputMode="decimal"
                    placeholder="Tax %"
                    aria-label="Tax rate"
                  />
                </div>
                <div className="text-right text-sm font-medium">{formatMoney(lineTotal, currency)}</div>
              </div>
            )
          })}
        </div>
        <div className="hidden overflow-x-auto xl:block">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead>Item</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-32">Unit price</TableHead>
                <TableHead className="w-24">Tax %</TableHead>
                <TableHead className="w-32 text-right">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const lineTotal = Math.round(toNumber(line.quantity) * toNumber(line.unitPrice) * 100)
                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div className="space-y-2">
                        <Input
                          value={line.title}
                          onChange={(event) => updateLine(line.id, { title: event.target.value })}
                          placeholder="Item title"
                          aria-label="Item title"
                        />
                        <Textarea
                          value={line.description}
                          onChange={(event) => updateLine(line.id, { description: event.target.value })}
                          placeholder="Description"
                          aria-label="Description"
                          rows={2}
                          className="min-h-12 resize-none"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                        inputMode="decimal"
                        aria-label="Quantity"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.unitPrice}
                        onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })}
                        inputMode="decimal"
                        placeholder="0.00"
                        aria-label="Unit price"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.taxRate}
                        onChange={(event) => updateLine(line.id, { taxRate: event.target.value })}
                        inputMode="decimal"
                        aria-label="Tax rate"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(lineTotal, currency)}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1}
                        aria-label="Remove line"
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border pt-2 sm:p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLines((current) => [...current, makeLine()])}
          >
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            Add line
          </Button>
        </div>
      </section>
      )}

      {mode === "build" && (
      <div className="flex flex-col gap-6 border-t border-border pt-5">
        <div className="order-2 grid w-full max-w-2xl gap-4 border-t border-border pt-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="notes">Note to client</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="payment">Payment instructions</Label>
            <Textarea
              id="payment"
              value={paymentInstructions}
              onChange={(event) => setPaymentInstructions(event.target.value)}
              rows={3}
              placeholder={PAYMENT_DETAILS[currency] ?? ""}
              className="mt-1"
            />
          </div>
        </div>

        <div className="order-1 ml-auto w-full max-w-md space-y-3">
          {mode === "build" && (
            <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(totals.subtotal, currency)}</span>
            </div>
  
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Discount</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{discountType === "percent" ? "%" : currency}</span>
                <Input
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="Discount"
                  className="h-8 w-24 text-right"
                />
              </div>
            </div>
            {totals.discountTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount applied</span>
                <span>-{formatMoney(totals.discountTotal, currency)}</span>
              </div>
            )}
  
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatMoney(totals.taxTotal, currency)}</span>
            </div>
  
            </>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>Total</span>
            <span>{formatMoney(totals.total, currency)}</span>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <Label htmlFor="paid" className="text-muted-foreground">
              Amount paid
            </Label>
            <Input
              id="paid"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="h-8 w-28 text-right"
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>Balance due</span>
            <span>{formatMoney(balance, currency)}</span>
          </div>
        </div>
      </div>
      )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[calc(100vw-0.5rem)] max-h-[calc(100vh-0.5rem)] max-w-5xl overflow-hidden p-2 print:hidden sm:p-6">
          <DialogHeader>
            <DialogTitle>Invoice preview</DialogTitle>
            <DialogDescription>Preview the complete invoice with your current edits before saving or downloading.</DialogDescription>
          </DialogHeader>
          <DocumentPreviewFrame>
            <InvoiceDocument invoice={draftInvoice} issuer={issuer ?? undefined} />
          </DocumentPreviewFrame>
          <DialogFooter>
            <Button type="button" onClick={() => void handleDownloadPdf()} disabled={pdfDownloading}>
              {pdfDownloading ? <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" /> : <Printer className="mr-1.5 size-4" aria-hidden="true" />}
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share invoice</DialogTitle>
            <DialogDescription>Control access to this invoice with a public link.</DialogDescription>
          </DialogHeader>
          <ShareLinkField
            enabled={shareEnabled}
            onEnabledChange={setShareEnabled}
            path={invoice ? `/share/invoices/${invoice.id}` : undefined}
          />
          {!invoice && <p className="text-sm text-muted-foreground">Save the invoice first to generate its public link.</p>}
        </DialogContent>
      </Dialog>

    </form>

    <div className="hidden print:block print:bg-white print:p-0">
      <InvoiceDocument invoice={draftInvoice} issuer={issuer ?? undefined} />
    </div>
    </>
  )
}
