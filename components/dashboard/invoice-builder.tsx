"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"

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
} from "@/lib/billing"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getProjects, type Project } from "@/lib/projects"
import { getUsers, type AppUser } from "@/lib/users"
import { ShareLinkField } from "@/components/dashboard/share-link-field"
import { cn } from "@/lib/utils"

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "NGN", symbol: "₦" },
  { code: "GBP", symbol: "£" },
] as const

/** Line items are held as strings while typing so a half-typed number survives. */
type DraftLine = {
  id: string
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
}

function makeLine(): DraftLine {
  return {
    id: Math.random().toString(36).slice(2, 10),
    description: "",
    quantity: "1",
    unitPrice: "",
    taxRate: "0",
  }
}

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function InvoiceBuilder({ invoice, initialCompanyId }: { invoice?: Invoice | null; initialCompanyId?: string }) {
  const router = useRouter()
  const isEdit = Boolean(invoice)

  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber ?? "")
  const [companyId, setCompanyId] = useState(invoice?.companyId ?? initialCompanyId ?? "")
  const [projectId, setProjectId] = useState(invoice?.projectId ?? "")
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? "draft")
  const [currency, setCurrency] = useState(invoice?.currency || "USD")

  const [billToName, setBillToName] = useState(invoice?.billTo?.name ?? "")
  const [billToEmail, setBillToEmail] = useState(invoice?.billTo?.email ?? "")
  const [billToAddress, setBillToAddress] = useState(invoice?.billTo?.address ?? "")
  const [billToTaxNumber, setBillToTaxNumber] = useState(invoice?.billTo?.taxNumber ?? "")
  const [poReference, setPoReference] = useState(invoice?.poReference ?? "")

  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (invoice?.lineItems?.length) {
      return invoice.lineItems.map((item) => ({
        id: item.id,
        description: item.description,
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
    return [makeLine()]
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

  const [issuedOn, setIssuedOn] = useState(invoice?.issuedOn || today())
  const [termsDays, setTermsDays] = useState(invoice?.paymentTermsDays ?? 14)
  const [notes, setNotes] = useState(invoice?.notes ?? "")
  const [paymentInstructions, setPaymentInstructions] = useState(invoice?.paymentInstructions ?? "")

  const [shareEnabled, setShareEnabled] = useState(invoice?.shareEnabled ?? false)

  const [clients, setClients] = useState<AppUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dueOn = dueDateFrom(issuedOn, termsDays)

  useEffect(() => {
    let active = true
    Promise.all([getUsers(), getProjects()])
      .then(([userList, projectList]) => {
        if (!active) return
        // Several people can share a workspace, so this is narrowed to one
        // entry per companyId - otherwise the same company lists twice (and
        // the duplicate companyId shows up as a duplicate React key).
        const seenWorkspaces = new Set<string>()
        setClients(
          userList.filter((user) => {
            if (!user.companyId || seenWorkspaces.has(user.companyId)) return false
            seenWorkspaces.add(user.companyId)
            return true
          }),
        )
        setProjects(projectList)
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
    const client = clients.find((entry) => entry.companyId === companyId)
    if (!client) return
    setBillToName(client.company || client.displayName || "")
    setBillToEmail((current) => current || client.email || "")
  }, [companyId, clients, billToName])

  const lineItems: InvoiceLineItem[] = useMemo(
    () =>
      lines.map((line) => ({
        id: line.id,
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
    const billable = linked ? [] : lineItems.filter((item) => item.description && item.quantity > 0)

    if (linked && !url.trim()) {
      setError("Paste the link to the invoice.")
      return
    }
    if (linked && Math.round(toNumber(linkedAmount) * 100) <= 0) {
      setError("Enter what this invoice is for, e.g. 1250.00")
      return
    }
    if (!linked && billable.length === 0) {
      setError("Add at least one line with a description and a quantity.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const number = invoiceNumber.trim() || (await nextInvoiceNumber())
      const client = clients.find((entry) => entry.companyId === companyId)
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
        companyId,
        client: client?.company || client?.displayName || "",
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

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/invoices"
          aria-label="Back to invoices"
          className="-ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-[-0.01em]">{invoiceNumber}</h1>
        <Button type="submit" size="sm" disabled={saving} className="shrink-0">
          {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          {isEdit ? "Save" : "Create"}
        </Button>
      </div>

      <ShareLinkField
        enabled={shareEnabled}
        onEnabledChange={setShareEnabled}
        path={invoice ? `/share/invoices/${invoice.id}` : undefined}
      />

      <div className="space-y-6">

      <section className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div>
            <Label htmlFor="client">Client</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger id="client" className="mt-1 w-full">
                <SelectValue placeholder={optionsLoading ? "Loading..." : "Choose a client"} />
              </SelectTrigger>
              <SelectContent>
                {[...clients].sort((a, b) => (a.company || a.displayName || a.email || "").localeCompare(b.company || b.displayName || b.email || "", undefined, { sensitivity: "base" })).map((client) => (
                  <SelectItem key={client.uid} value={client.companyId as string}>
                    {client.company || client.displayName || client.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bill-to">Bill to</Label>
            <Input
              id="bill-to"
              value={billToName}
              onChange={(event) => setBillToName(event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bill-email">Billing email</Label>
            <Input
              id="bill-email"
              type="email"
              value={billToEmail}
              onChange={(event) => setBillToEmail(event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bill-address">Billing address</Label>
            <Textarea
              id="bill-address"
              value={billToAddress}
              onChange={(event) => setBillToAddress(event.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tax-number">Tax / VAT number</Label>
            <Input
              id="tax-number"
              value={billToTaxNumber}
              onChange={(event) => setBillToTaxNumber(event.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="project">Project</Label>
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
            <Label htmlFor="po">PO reference</Label>
            <Input
              id="po"
              value={poReference}
              onChange={(event) => setPoReference(event.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="issued-on">Issued</Label>
              <Input
                id="issued-on"
                type="date"
                value={issuedOn}
                onChange={(event) => setIssuedOn(event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="terms">Payment terms</Label>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="currency">Currency</Label>
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
              <Label htmlFor="status">Status</Label>
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

      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        <h2 className="text-sm font-medium">Items</h2>
        <div className="inline-flex rounded-[8px] bg-muted p-0.5">
          {(
            [
              { value: "build", label: "Create" },
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
        <section className="grid gap-4 sm:grid-cols-3">
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
        </section>
      ) : (
      <section>
        {/* Phones get one stacked block per line instead of a six-column table. */}
        <div className="divide-y divide-border sm:hidden">
          {lines.map((line) => {
            const lineTotal = Math.round(toNumber(line.quantity) * toNumber(line.unitPrice) * 100)
            return (
              <div key={line.id} className="space-y-2 py-3 first:pt-0">
                <div className="flex items-center gap-2">
                  <Input
                    value={line.description}
                    onChange={(event) => updateLine(line.id, { description: event.target.value })}
                    placeholder="Description"
                    aria-label="Description"
                    className="flex-1"
                  />
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
        <div className="hidden overflow-x-auto sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
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
                      <Input
                        value={line.description}
                        onChange={(event) => updateLine(line.id, { description: event.target.value })}
                        placeholder="Brand identity design"
                        aria-label="Description"
                      />
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

      <div className="grid gap-6 border-t border-border pt-5 lg:grid-cols-2 lg:gap-8">
        <div className="space-y-3">
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

        <div className="space-y-3 lg:pl-8">
          {mode === "build" && (
            <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(totals.subtotal, currency)}</span>
            </div>
  
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Discount</span>
              <div className="flex items-center gap-2">
                <Select
                  value={discountType}
                  onValueChange={(value) => setDiscountType(value as "amount" | "percent")}
                >
                  <SelectTrigger className="h-8 w-20" aria-label="Discount type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">{currency}</SelectItem>
                    <SelectItem value="percent">%</SelectItem>
                  </SelectContent>
                </Select>
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

          <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
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

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {isEdit && invoice && (
        <DangerZone
          label="invoice"
          confirmTitle="Delete this invoice?"
          confirmDescription={`${invoice.invoiceNumber} will be removed for good. This cannot be undone.`}
          onDelete={handleDelete}
        />
      )}
    </form>
  )
}
