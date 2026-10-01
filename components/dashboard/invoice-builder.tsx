"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, BellRing, Loader2, Plus, Printer, Share2, X } from "lucide-react"

import {
  EditorActionBar,
  EditorCard,
  EditorDeleteCard,
  EditorField,
  EditorHeader,
  EditorToggle,
  ExpandableTextRow,
} from "@/components/dashboard/billing-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PAYMENT_TERM_OPTIONS,
  computeTotals,
  createInvoice,
  deleteInvoice,
  dueDateFrom,
  formatMoney,
  invoiceNotes,
  invoiceStatusMeta,
  nextInvoiceNumber,
  updateInvoice,
  type Invoice,
  type InvoiceLineItem,
  type InvoiceStatus,
  type Estimate,
} from "@/lib/billing"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { getProjects, type Project } from "@/lib/projects"
import { getOrganizations, type Organization } from "@/lib/organizations"
import { ShareLinkField } from "@/components/dashboard/share-link-field"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { downloadInvoicePdf } from "@/components/dashboard/invoice-pdf"
import { DocumentPreviewFrame } from "@/components/dashboard/document-preview-frame"
import { buildEmailComposeHref, parseEmailList, type EmailComposeContext } from "@/lib/email-composer"
import { invoiceIsOpen, reminderBody, reminderSubject } from "@/lib/invoice-reminders"
import { companyDocumentPath } from "@/lib/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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

  const [billToEmail, setBillToEmail] = useState(invoice?.billTo?.email ?? initialEstimate?.preparedFor?.email ?? "")
  const [billToAddress, setBillToAddress] = useState(invoice?.billTo?.address ?? "")
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
  // An estimate's note says it "is not an invoice", so never carry it over.
  const [notes, setNotes] = useState(invoiceNotes(invoice?.notes))
  const [serviceCompletedOn, setServiceCompletedOn] = useState(invoice?.serviceCompletedOn ?? "")
  const [paymentInstructions, setPaymentInstructions] = useState(invoice?.paymentInstructions ?? initialEstimate?.paymentDetails ?? "")

  const [shareEnabled, setShareEnabled] = useState(invoice?.shareEnabled ?? initialEstimate?.shareEnabled ?? false)
  const [autoReminders, setAutoReminders] = useState(invoice?.autoReminders ?? false)
  const [reminderCc, setReminderCc] = useState((invoice?.reminderCc ?? []).join(", "))

  const [clients, setClients] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  // The due date is a plain, editable date. Payment terms are just a shortcut
  // that fills it in; changing the issue date never silently moves it.
  const [dueOn, setDueOn] = useState(invoice?.dueOn ?? dueDateFrom(issuedOn, termsDays))

  useEffect(() => {
    let active = true
    Promise.all([getOrganizations(), getProjects(), getBusinessProfile()])
      .then(([organizationList, projectList, profile]) => {
        if (!active) return
        setClients(organizationList)
        setProjects(projectList)
        setIssuer(profile)
        if (!isEdit) {
          const days = profile.invoicePaymentTermsDays ?? 14
          setTermsDays(days)
          setDueOn(dueDateFrom(issuedOn, days))
          setNotes(profile.invoiceNotes ?? "")
          setPaymentInstructions(initialEstimate?.paymentDetails ?? profile.invoicePaymentInstructions ?? "")
        }
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

  // Fill billing details from the chosen client unless they were already set.
  useEffect(() => {
    if (!companyId) return
    const client = clients.find((entry) => entry.id === companyId)
    if (!client) return
    setBillToEmail((current) => current || client.email || "")
    setBillToAddress((current) => current || client.address || "")
  }, [companyId, clients])

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
  const clientName = selectedClient?.name
    ?? (companyId === invoice?.companyId ? invoice.client : companyId === initialEstimate?.companyId ? initialEstimate.client : "")

  function selectClient(value: string) {
    setCompanyId(value)
    const client = clients.find((entry) => entry.id === value)
    setBillToEmail(client?.email ?? "")
    setBillToAddress(client?.address ?? "")
  }
  const draftInvoice: Invoice = {
    ...(invoice ?? {}),
    id: invoice?.id ?? "preview",
    companyId,
    client: clientName,
    invoiceNumber: invoiceNumber || "Invoice preview",
    title: invoiceTitle,
    projectId: projectId || "",
    project: selectedProject?.title || "",
    status,
    billTo: {
      name: clientName,
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
    serviceCompletedOn,
    notes,
    paymentInstructions,
    url,
    shareEnabled,
    autoReminders,
    reminderCc: parseEmailList(reminderCc).valid,
  }

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function removeLine(id: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)))
  }

  async function saveInvoice(destination: "list" | "email") {
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
          name: client?.name ?? "",
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
        dueOn,
        serviceCompletedOn,
        notes: notes.trim(),
        paymentInstructions: paymentInstructions.trim(),
        url: url.trim(),
        shareEnabled,
        autoReminders,
        reminderCc: parseEmailList(reminderCc).valid,
      }

      const savedId = invoice?.id ?? await createInvoice(payload)
      if (invoice) await updateInvoice(savedId, payload)

      if (destination === "email") {
        router.push(buildEmailComposeHref({
          companyId: payload.companyId,
          companyName: payload.client,
          recipientEmail: payload.billTo.email,
          recipientName: payload.billTo.name,
          projectId: payload.projectId,
          projectName: payload.project,
          documentType: "invoice",
          documentId: savedId,
          documentTitle: payload.invoiceNumber,
          subject: `Invoice ${payload.invoiceNumber}`,
          ctaText: "View invoice",
          ctaUrl: companyDocumentPath(payload.companyId, "invoice", savedId),
        }))
      } else {
        router.push("/dashboard/invoices")
      }
    } catch (err) {
      console.error("Error saving invoice:", err)
      setError("Couldn't save this invoice. Try again.")
      setSaving(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveInvoice("list")
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

  const statusMeta = invoiceStatusMeta[status]
  const reminderCcCheck = parseEmailList(reminderCc)

  // Remind uses the saved invoice; Send saves current changes before composing.
  const emailContext: EmailComposeContext | null = invoice ? {
    companyId: invoice.companyId,
    companyName: invoice.client,
    recipientEmail: invoice.billTo?.email,
    recipientName: invoice.billTo?.name,
    projectId: invoice.projectId,
    projectName: invoice.project,
    documentType: "invoice",
    documentId: invoice.id,
    documentTitle: invoice.invoiceNumber,
    subject: `Invoice ${invoice.invoiceNumber}`,
    ctaText: "View invoice",
    ctaUrl: companyDocumentPath(invoice.companyId, "invoice", invoice.id),
  } : null
  const reminderContext: EmailComposeContext | null = invoice && emailContext && invoiceIsOpen(invoice) ? {
    ...emailContext,
    subject: reminderSubject(invoice),
    body: reminderBody(invoice),
    cc: (invoice.reminderCc ?? []).join(", "),
    ctaText: "View and pay",
    intent: "reminder",
  } : null

  return (
    <>
    <form onSubmit={submit} className="billing-editor mx-auto max-w-2xl space-y-3 bg-card px-4 pt-3 print:hidden sm:rounded-2xl">
      <div className="flex items-center gap-1">
        <Link
          href="/dashboard/invoices"
          aria-label="Back to invoices"
          className="-ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <span className="flex-1" />
        {reminderContext && (
          <Button asChild variant="ghost" size="sm">
            <Link href={buildEmailComposeHref(reminderContext)}><BellRing className="size-4" aria-hidden="true" />Remind</Link>
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" title="Share invoice" aria-label="Share invoice" onClick={() => setShareOpen(true)}>
          <Share2 className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <EditorHeader issuer={issuer} kind="Invoice" onPrint={() => window.print()} onDownload={() => void handleDownloadPdf()} downloading={pdfDownloading} number={invoiceNumber} status={statusMeta} />

      <EditorCard>
        <EditorField label="Title" htmlFor="invoice-title">
          <Input
            id="invoice-title"
            value={invoiceTitle}
            onChange={(event) => setInvoiceTitle(event.target.value)}
            placeholder="Invoice title"
          />
        </EditorField>
      </EditorCard>

      <EditorCard title="Bill to">
        <div className="space-y-3">
          <EditorField label="Client" htmlFor="client">
            <Select value={companyId} onValueChange={selectClient}>
              <SelectTrigger id="client">
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
          </EditorField>
          <EditorField label="Email" htmlFor="bill-email">
            <Input
              id="bill-email"
              type="email"
              value={billToEmail}
              onChange={(event) => setBillToEmail(event.target.value)}
              placeholder="Billing email"
            />
          </EditorField>
          <EditorField label="Address" htmlFor="bill-address">
            <Textarea
              id="bill-address"
              value={billToAddress}
              onChange={(event) => setBillToAddress(event.target.value)}
              placeholder="Client billing address"
              rows={3}
            />
          </EditorField>
          <EditorField label="Tax / VAT number" htmlFor="tax-number">
            <Input
              id="tax-number"
              value={billToTaxNumber}
              onChange={(event) => setBillToTaxNumber(event.target.value)}
              placeholder="Optional"
            />
          </EditorField>
        </div>
      </EditorCard>

      <EditorCard title="Details">
        <div className="space-y-3">
          <EditorField label="Project" htmlFor="project">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="project">
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
          </EditorField>
          <EditorField label="PO reference" htmlFor="po">
            <Input id="po" value={poReference} onChange={(event) => setPoReference(event.target.value)} placeholder="Optional" />
          </EditorField>
          <div className="grid grid-cols-2 gap-3">
            <EditorField label="Issued" htmlFor="issued-on">
              <Input id="issued-on" type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} />
            </EditorField>
            <EditorField label="Due date" htmlFor="due-on">
              <Input id="due-on" type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} />
            </EditorField>
            <EditorField label="Payment terms" htmlFor="terms">
              <Select
                value={String(termsDays)}
                onValueChange={(value) => {
                  const days = Number.parseInt(value, 10)
                  setTermsDays(days)
                  setDueOn(dueDateFrom(issuedOn, days))
                }}
              >
                <SelectTrigger id="terms">
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
            </EditorField>
            <EditorField label="Service completed" htmlFor="service-completed-on">
              <Input id="service-completed-on" type="date" value={serviceCompletedOn} onChange={(event) => setServiceCompletedOn(event.target.value)} />
            </EditorField>
            <EditorField label="Currency" htmlFor="currency">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
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
            </EditorField>
            <EditorField label="Status" htmlFor="status">
              <Select value={status} onValueChange={(value) => setStatus(value as InvoiceStatus)}>
                <SelectTrigger id="status">
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
            </EditorField>
          </div>
          {!dueOn && <p className="text-muted-foreground">No due date — this invoice won&apos;t go overdue.</p>}
        </div>
      </EditorCard>

      <EditorCard title="Reminders">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="auto-reminders">Send reminders automatically</Label>
              <p className="mt-1 text-muted-foreground">3 days before the due date, on the due date, then 7 and 14 days late. Stops once it’s paid.</p>
            </div>
            <Switch id="auto-reminders" checked={autoReminders} onCheckedChange={setAutoReminders} />
          </div>
          <EditorField label="Copy on reminders" htmlFor="reminder-cc">
            <Input
              id="reminder-cc"
              type="text"
              inputMode="email"
              value={reminderCc}
              onChange={(event) => setReminderCc(event.target.value)}
              placeholder="Add emails, separated by commas"
            />
          </EditorField>
          {reminderCcCheck.invalid.length > 0 && <p className="text-destructive">Not an email: {reminderCcCheck.invalid.join(", ")}</p>}
          {invoice?.lastReminderAt && (
            <p className="text-muted-foreground">
              Last reminder {new Date(invoice.lastReminderAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              {invoice.reminderCount ? ` · ${invoice.reminderCount} sent` : ""}
            </p>
          )}
        </div>
      </EditorCard>

      <EditorCard
        title="Items"
        action={
          <EditorToggle
            value={mode}
            onChange={setMode}
            options={[
              { value: "build", label: "Internal" },
              { value: "link", label: "Link" },
            ] as const}
          />
        }
      >
        {mode === "link" ? (
          <div className="space-y-3">
            <EditorField label="Invoice link" htmlFor="invoice-url">
              <Input id="invoice-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />
            </EditorField>
            <EditorField label="Amount" htmlFor="linked-amount">
              <Input
                id="linked-amount"
                value={linkedAmount}
                onChange={(event) => setLinkedAmount(event.target.value)}
                inputMode="decimal"
                placeholder="1250.00"
              />
            </EditorField>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {lines.map((line) => {
              const lineTotal = Math.round(toNumber(line.quantity) * toNumber(line.unitPrice) * 100)
              return (
                <div key={line.id} className="space-y-2 py-3 first:pt-0">
                  <div className="flex items-center gap-2">
                    <Input
                      value={line.title}
                      onChange={(event) => updateLine(line.id, { title: event.target.value })}
                      placeholder="Item"
                      aria-label="Item title"
                      className="billing-editor-row-label flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                      aria-label="Remove line"
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <Input
                    value={line.description}
                    onChange={(event) => updateLine(line.id, { description: event.target.value })}
                    placeholder="Description (optional)"
                    aria-label="Description"
                  />
                  <div className="grid grid-cols-[1fr_2fr_1.15fr] gap-2">
                    <EditorField label="Qty" htmlFor={`qty-${line.id}`}>
                      <Input
                        id={`qty-${line.id}`}
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                        inputMode="decimal"
                      />
                    </EditorField>
                    <EditorField label="Price" htmlFor={`price-${line.id}`}>
                      <Input
                        id={`price-${line.id}`}
                        value={line.unitPrice}
                        onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })}
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </EditorField>
                    <EditorField label="Tax %" htmlFor={`tax-${line.id}`}>
                      <Input
                        id={`tax-${line.id}`}
                        value={line.taxRate}
                        onChange={(event) => updateLine(line.id, { taxRate: event.target.value })}
                        inputMode="decimal"
                      />
                    </EditorField>
                  </div>
                  <p className="billing-editor-row-label text-right">{formatMoney(lineTotal, currency)}</p>
                </div>
              )
            })}
            <div className="py-3">
              <button
                type="button"
                onClick={() => setLines((current) => [...current, makeLine()])}
                className="billing-editor-row-label inline-flex items-center gap-1 text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add line
              </button>
            </div>
          </div>
        )}

        <div className="mt-1 space-y-3 border-t border-border pt-4">
          {mode === "build" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(totals.subtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="discount" className="billing-editor-total-label">Discount</Label>
                <Input
                  id="discount"
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="max-w-40 text-right"
                />
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Discount applied</span>
                  <span>-{formatMoney(totals.discountTotal, currency)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatMoney(totals.taxTotal, currency)}</span>
              </div>
            </>
          )}
          <div className="billing-editor-strong flex items-center justify-between">
            <span>Total</span>
            <span>{formatMoney(totals.total, currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="paid" className="billing-editor-total-label">Amount paid</Label>
            <Input
              id="paid"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="max-w-40 text-right"
            />
          </div>
          <div className="billing-editor-strong flex items-center justify-between border-t border-border pt-3">
            <span>Balance due</span>
            <span>{formatMoney(balance, currency)}</span>
          </div>
        </div>
      </EditorCard>

      {mode === "build" && (
        <EditorCard>
          <ExpandableTextRow id="notes" label="Note to client" value={notes} onChange={setNotes} />
          <ExpandableTextRow
            id="payment"
            label="Payment instructions"
            value={paymentInstructions}
            onChange={setPaymentInstructions}
            placeholder="Add payment instructions"
          />
        </EditorCard>
      )}

      {isEdit && invoice && (
        <EditorDeleteCard
          label="invoice"
          confirmTitle="Delete this invoice?"
          confirmDescription={`${invoice.invoiceNumber} will be removed for good. This cannot be undone.`}
          onDelete={handleDelete}
        />
      )}

      {error && <p className="px-1 text-destructive">{error}</p>}

      <EditorActionBar onPreview={() => setPreviewOpen(true)} onSend={() => void saveInvoice("email")} saving={saving} saveLabel={isEdit ? "Save invoice" : "Create invoice"} />

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
