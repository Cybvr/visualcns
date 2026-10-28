"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, RefreshCw } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"

import { ChartContainer } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatMoney, getInvoices, type Invoice } from "@/lib/billing"
import { daysUntilDue, invoiceIsOverdue, todayIso } from "@/lib/invoice-reminders"

type Range = "6m" | "12m" | "all"
type AgingKey = "notDue" | "upTo30" | "upTo60" | "over60" | "noDate"

const RANGE_OPTIONS: { value: Range; label: string; months: number | null }[] = [
  { value: "6m", label: "Last 6 months", months: 6 },
  { value: "12m", label: "Last 12 months", months: 12 },
  { value: "all", label: "All time", months: null },
]

const AGING_LABELS: { key: AgingKey; label: string }[] = [
  { key: "notDue", label: "Not due" },
  { key: "upTo30", label: "1–30 days late" },
  { key: "upTo60", label: "31–60 days late" },
  { key: "over60", label: "61+ days late" },
  { key: "noDate", label: "No due date" },
]

function positiveAmount(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value ?? 0)) : 0
}

/** Paid status is authoritative for older invoices with no amountPaid field. */
function collectedAmount(invoice: Invoice) {
  const total = positiveAmount(invoice.amount)
  return invoice.status === "paid" ? total : Math.min(total, positiveAmount(invoice.amountPaid))
}

function outstandingAmount(invoice: Invoice) {
  if (invoice.status !== "sent" && invoice.status !== "overdue") return 0
  return Math.max(0, positiveAmount(invoice.amount) - collectedAmount(invoice))
}

function issuedDate(invoice: Invoice): Date | null {
  const issued = invoice.issuedOn ? new Date(`${invoice.issuedOn}T00:00:00Z`) : null
  if (issued && !Number.isNaN(issued.getTime())) return issued
  const created = invoice.createdAt?.toMillis?.()
  return created ? new Date(created) : null
}

function compactMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount / 100)
  } catch {
    return formatMoney(amount, currency)
  }
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function monthStart(date: Date, offset = 0) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1))
}

function agingKey(invoice: Invoice, today: string): AgingKey {
  if (!invoice.dueOn) return "noDate"
  const days = daysUntilDue(invoice.dueOn, today)
  if (days === null) return "noDate"
  if (days >= 0) return "notDue"
  if (days >= -30) return "upTo30"
  if (days >= -60) return "upTo60"
  return "over60"
}

function AnalyticsLoading() {
  return (
    <div role="status" aria-label="Loading agency analytics" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-8 w-52" /><Skeleton className="h-4 w-72 max-w-full" /></div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  )
}

export default function AgencyAnalyticsPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [currency, setCurrency] = useState("")
  const [range, setRange] = useState<Range>("all")
  const [today, setToday] = useState(() => todayIso())
  const [now, setNow] = useState(() => new Date())

  const load = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const nextInvoices = await getInvoices()
      setInvoices(nextInvoices)
      setToday(todayIso())
      setNow(new Date())
    } catch (loadError) {
      console.error("Error loading agency analytics:", loadError)
      setError("Couldn't load invoice analytics. Try again.")
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const currencyOptions = useMemo(() => {
    const codes = new Set<string>()
    for (const invoice of invoices ?? []) {
      if (invoice.status === "void") continue
      codes.add((invoice.currency || "USD").toUpperCase())
    }
    return [...codes].sort((a, b) => a === "NGN" ? -1 : b === "NGN" ? 1 : a.localeCompare(b))
  }, [invoices])
  const selectedCurrency = currencyOptions.includes(currency) ? currency : currencyOptions[0] || "NGN"
  const selectedRange = RANGE_OPTIONS.find((option) => option.value === range) ?? RANGE_OPTIONS[2]
  const startDate = useMemo(() => selectedRange.months === null ? null : monthStart(now, 1 - selectedRange.months), [now, selectedRange.months])

  const scopedInvoices = useMemo(() => (invoices ?? []).filter((invoice) => {
    if (invoice.status === "draft" || invoice.status === "void") return false
    if ((invoice.currency || "USD").toUpperCase() !== selectedCurrency) return false
    const date = issuedDate(invoice)
    return !startDate || (date !== null && date >= startDate)
  }), [invoices, selectedCurrency, startDate])

  const summary = useMemo(() => scopedInvoices.reduce((totals, invoice) => {
    totals.invoiced += positiveAmount(invoice.amount)
    totals.collected += collectedAmount(invoice)
    totals.outstanding += outstandingAmount(invoice)
    if (invoiceIsOverdue(invoice, today)) totals.overdue += outstandingAmount(invoice)
    return totals
  }, { invoiced: 0, collected: 0, outstanding: 0, overdue: 0 }), [scopedInvoices, today])

  const chartData = useMemo(() => {
    if (!scopedInvoices.length) return []
    const dates = scopedInvoices.map(issuedDate).filter((date): date is Date => date !== null)
    if (!dates.length) return []
    const earliest = dates.reduce((first, date) => date < first ? date : first, dates[0])
    const monthSpan = (now.getUTCFullYear() - earliest.getUTCFullYear()) * 12 + now.getUTCMonth() - earliest.getUTCMonth()
    const byYear = range === "all" && monthSpan > 23
    const buckets = new Map<string, { label: string; collected: number; outstanding: number }>()
    if (byYear) {
      for (let year = earliest.getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
        buckets.set(String(year), { label: String(year), collected: 0, outstanding: 0 })
      }
    } else {
      const first = startDate ?? monthStart(earliest)
      for (let date = first; date <= now; date = monthStart(date, 1)) {
        const key = monthKey(date)
        buckets.set(key, { label: new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date), collected: 0, outstanding: 0 })
      }
    }
    for (const invoice of scopedInvoices) {
      const date = issuedDate(invoice)
      if (!date) continue
      const bucket = buckets.get(byYear ? String(date.getUTCFullYear()) : monthKey(date))
      if (!bucket) continue
      bucket.collected += collectedAmount(invoice)
      bucket.outstanding += outstandingAmount(invoice)
    }
    return [...buckets.values()]
  }, [now, range, scopedInvoices, startDate])

  const aging = useMemo(() => {
    const totals: Record<AgingKey, number> = { notDue: 0, upTo30: 0, upTo60: 0, over60: 0, noDate: 0 }
    for (const invoice of scopedInvoices) {
      const balance = outstandingAmount(invoice)
      if (balance) totals[agingKey(invoice, today)] += balance
    }
    return totals
  }, [scopedInvoices, today])

  const largestBalances = useMemo(() => scopedInvoices
    .filter((invoice) => outstandingAmount(invoice) > 0)
    .sort((a, b) => outstandingAmount(b) - outstandingAmount(a))
    .slice(0, 6), [scopedInvoices])

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-6 sm:pt-7">
      {invoices === null ? (error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 px-4 py-3 text-sm text-destructive"><span>{error}</span><Button type="button" variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>
      ) : <AnalyticsLoading />) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Agency analytics</h1>
              <p className="mt-1 text-sm text-muted-foreground">Keep track of billed, collected, and unpaid invoice amounts.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedCurrency} onValueChange={setCurrency}>
                <SelectTrigger aria-label="Currency" className="min-w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{(currencyOptions.length ? currencyOptions : [selectedCurrency]).map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={range} onValueChange={(value) => setRange(value as Range)}>
                <SelectTrigger aria-label="Invoice issue date range" className="min-w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{RANGE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" aria-label="Refresh analytics" title="Refresh analytics" onClick={() => void load()} disabled={refreshing}><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /></Button>
            </div>
          </div>

          {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 px-4 py-3 text-sm text-destructive"><span>{error}</span><Button type="button" variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>}

          {invoices && invoices.length === 0 ? (
            <section className="rounded-2xl border border-border px-6 py-14 text-center">
              <h2 className="text-lg font-semibold">No invoices yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Create an invoice to start tracking what the agency has billed and collected.</p>
              <Button asChild className="mt-5"><Link href="/dashboard/invoices/new">Create invoice <ArrowRight className="size-4" /></Link></Button>
            </section>
          ) : (
            <>
              <section aria-label="Financial summary" className="grid overflow-hidden rounded-2xl border border-border bg-border gap-px sm:grid-cols-2 xl:grid-cols-4">
                {([
                  ["Invoiced", summary.invoiced, "Issued invoices"],
                  ["Collected to date", summary.collected, "Recorded payments and paid invoices"],
                  ["Outstanding", summary.outstanding, "Still owed on sent invoices"],
                  ["Overdue", summary.overdue, "Past due and still owed"],
                ] as const).map(([label, amount, detail]) => (
                  <div key={label} className="min-w-0 bg-card px-5 py-5 sm:px-6">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={`mt-3 min-w-0 truncate text-2xl font-semibold tabular-nums tracking-tight sm:text-[clamp(1.4rem,2vw,2rem)] ${label === "Overdue" && amount > 0 ? "text-destructive" : "text-foreground"}`} title={formatMoney(amount, selectedCurrency)}>{formatMoney(amount, selectedCurrency)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                  </div>
                ))}
              </section>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
                <section aria-labelledby="invoice-trend-heading" className="min-w-0 rounded-2xl border border-border p-5 sm:p-6">
                  <h2 id="invoice-trend-heading" className="text-lg font-semibold">Invoicing over time</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Current paid and unpaid amounts, grouped by invoice issue date.</p>
                  {chartData.length ? (
                    <>
                      <div className="mt-6 overflow-x-auto">
                        <ChartContainer config={{ collected: { label: "Collected", color: "var(--chart-1)" }, outstanding: { label: "Outstanding", color: "var(--chart-3)" } }} className="h-64 aspect-auto w-full" style={{ minWidth: Math.max(520, chartData.length * 54) }}>
                          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} interval={chartData.length > 12 ? Math.ceil(chartData.length / 12) - 1 : 0} />
                            <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(value: number) => compactMoney(value, selectedCurrency)} />
                            <Tooltip cursor={{ fill: "var(--muted)" }} content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm"><p className="mb-1 font-medium">{label}</p>{payload.map((item) => <p key={String(item.dataKey)} className="flex justify-between gap-4"><span>{item.dataKey === "collected" ? "Collected" : "Outstanding"}</span><strong className="tabular-nums">{formatMoney(Number(item.value) || 0, selectedCurrency)}</strong></p>)}</div> : null} />
                            <Bar dataKey="collected" stackId="invoice" fill="var(--chart-1)" maxBarSize={36} />
                            <Bar dataKey="outstanding" stackId="invoice" fill="var(--chart-3)" maxBarSize={36} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-[var(--chart-1)]" />Collected</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-[var(--chart-3)]" />Outstanding</span></div>
                      <p className="mt-3 text-xs text-muted-foreground">Payments are shown against the month the invoice was issued; payment dates are not recorded.</p>
                    </>
                  ) : <div className="mt-6 flex h-64 items-center justify-center rounded-xl bg-muted/40 px-6 text-center text-sm text-muted-foreground">No issued invoices in this selection.</div>}
                </section>

                <section aria-labelledby="aging-heading" className="rounded-2xl border border-border p-5 sm:p-6">
                  <h2 id="aging-heading" className="text-lg font-semibold">When payment is due</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Aging of the outstanding balance.</p>
                  <div className="mt-6 space-y-5">
                    {AGING_LABELS.map(({ key, label }) => {
                      const amount = aging[key]
                      const width = summary.outstanding ? Math.max(0, amount / summary.outstanding * 100) : 0
                      return <div key={key}>
                        <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium tabular-nums" title={formatMoney(amount, selectedCurrency)}>{compactMoney(amount, selectedCurrency)}</span></div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${key === "notDue" ? "bg-[var(--chart-1)]" : "bg-[var(--chart-3)]"}`} style={{ width: `${width}%` }} /></div>
                      </div>
                    })}
                  </div>
                </section>
              </div>

              <section aria-labelledby="unpaid-heading" className="rounded-2xl border border-border p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 id="unpaid-heading" className="text-lg font-semibold">Largest unpaid invoices</h2><p className="mt-1 text-sm text-muted-foreground">Start with the balances that have the biggest impact.</p></div>
                  <Link href="/dashboard/drive?type=invoice" className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline">View all invoices <ArrowRight className="size-4" /></Link>
                </div>
                {largestBalances.length ? <div className="mt-5 divide-y divide-border border-t border-border">
                  {largestBalances.map((invoice) => {
                    const overdue = invoiceIsOverdue(invoice, today)
                    return <Link key={invoice.id} href={`/dashboard/invoices/${encodeURIComponent(invoice.id)}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.55fr)_auto] sm:px-2">
                      <span className="min-w-0"><span className="block truncate text-sm font-medium text-foreground">{invoice.client || invoice.billTo?.name || "Unknown company"}</span><span className="block truncate text-xs text-muted-foreground">{invoice.invoiceNumber || "Invoice"}{invoice.title ? ` · ${invoice.title}` : ""}</span></span>
                      <span className={`hidden text-sm sm:block ${overdue ? "text-destructive" : "text-muted-foreground"}`}>{invoice.dueOn ? `${overdue ? "Overdue" : "Due"} ${formatDate(invoice.dueOn)}` : "No due date"}</span>
                      <span className="min-w-0 text-right"><span className="block max-w-36 truncate text-sm font-semibold tabular-nums text-foreground sm:max-w-none" title={formatMoney(outstandingAmount(invoice), selectedCurrency)}>{formatMoney(outstandingAmount(invoice), selectedCurrency)}</span><span className={`block text-xs sm:hidden ${overdue ? "text-destructive" : "text-muted-foreground"}`}>{overdue ? "Overdue" : invoice.dueOn ? `Due ${formatDate(invoice.dueOn)}` : "No due date"}</span></span>
                    </Link>
                  })}
                </div> : <p className="mt-5 border-t border-border pt-5 text-sm text-muted-foreground">No unpaid invoices in this selection.</p>}
              </section>

              <p className="text-xs text-muted-foreground">Draft and void invoices are excluded. A paid invoice counts as fully collected even when its older record has no paid amount.</p>
            </>
          )}
        </div>
      )}
    </main>
  )
}
