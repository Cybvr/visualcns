"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BriefcaseBusiness, Receipt, Send, TrendingUp } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { CollectionView } from "@/components/dashboard/collection-view"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { formatMoney, getInvoices, invoiceStatusMeta, type Invoice } from "@/lib/billing"
import { invoiceIsOpen, invoiceIsOverdue } from "@/lib/invoice-reminders"
import { watchLeads, type Lead } from "@/lib/leads"
import { getProjects, type Project } from "@/lib/projects"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

function Metric({ label, value, href, icon: Icon }: { label: string; value: number; href: string; icon: typeof TrendingUp }) {
  return (
    <Link href={href} className="block rounded-xl border border-border bg-card p-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value.toLocaleString()}</p>
    </Link>
  )
}

function invoiceTitle(invoice: Invoice) {
  return invoice.title?.trim() || invoice.invoiceNumber || "Invoice"
}

function invoiceDate(invoice: Invoice) {
  return Math.max(tsToMillis(invoice.updatedAt), tsToMillis(invoice.createdAt))
}

function invoiceStatus(invoice: Invoice) {
  return invoiceIsOverdue(invoice) ? "overdue" : invoice.status
}

function invoiceCard(invoice: Invoice) {
  const status = invoiceStatus(invoice)
  const statusMeta = invoiceStatusMeta[status]
  const title = invoiceTitle(invoice)
  return {
    title,
    subtitle: invoice.client || invoice.companyId,
    icon: <Receipt className={cn("size-4", status === "overdue" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")} aria-hidden="true" />,
    preview: (
      <div className="flex size-full flex-col justify-between bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-2">
          <Receipt className="size-8 text-muted-foreground/60" aria-hidden="true" />
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusMeta.className)}>{statusMeta.label}</span>
        </div>
        <p className="truncate text-lg font-semibold text-foreground">{formatMoney(invoice.amount, invoice.currency)}</p>
      </div>
    ),
    href: `/dashboard/invoices?invoice=${encodeURIComponent(invoice.id)}`,
    ariaLabel: `Open ${title}`,
  }
}

/** Agency home: the useful numbers first, then the invoices that need attention. */
export default function DashboardPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const [nextProjects, nextInvoices] = await Promise.all([getProjects(), getInvoices()])
      setProjects(nextProjects)
      setInvoices(nextInvoices)
    } catch (caughtError) {
      console.error("Error loading dashboard data:", caughtError)
      setError("Couldn’t load the dashboard right now. Please try again shortly.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void fetchData()
  }, [fetchData, user])

  useEffect(() => {
    if (!user) return
    let active = true
    let stop = () => {}
    setLeadsLoading(true)

    getCurrentAgencyId()
      .then((agencyId) => {
        if (!active) return
        stop = watchLeads(
          agencyId,
          (rows) => {
            if (active) {
              setLeads(rows)
              setLeadsLoading(false)
            }
          },
          (reason) => {
            console.error("Leads subscription failed", reason)
            if (active) {
              setLeads([])
              setLeadsLoading(false)
            }
          },
        )
      })
      .catch((reason) => {
        console.error("Could not load leads", reason)
        if (active) {
          setLeads([])
          setLeadsLoading(false)
        }
      })

    return () => {
      active = false
      stop()
    }
  }, [user])

  const reachedOut = useMemo(
    () => (leads ?? []).filter((lead) => Boolean(lead.lastContacted.trim()) || lead.stage !== "new").length,
    [leads],
  )
  const outstandingInvoices = useMemo(
    () => invoices.filter(invoiceIsOpen).sort((a, b) => invoiceDate(b) - invoiceDate(a)).slice(0, 3),
    [invoices],
  )

  if (!user) return null
  if (loading && leadsLoading) return <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6"><DashboardPageSkeleton variant="home" rows={4} /></main>

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6">
      {error && <p className="mb-5 text-sm text-destructive" role="alert">{error}</p>}

      <section aria-labelledby="dashboard-overview-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 id="dashboard-overview-heading" className="text-xl font-semibold tracking-tight text-foreground">Overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your agency at a glance.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Leads" value={leads?.length ?? 0} href="/dashboard/leads" icon={TrendingUp} />
          <Metric label="Reached out" value={reachedOut} href="/dashboard/leads" icon={Send} />
          <Metric label="Client campaigns" value={projects.length} href="/dashboard/projects" icon={BriefcaseBusiness} />
          <Metric label="Outstanding invoices" value={invoices.filter(invoiceIsOpen).length} href="/dashboard/invoices" icon={Receipt} />
        </div>
      </section>

      <section aria-labelledby="outstanding-invoices-heading" className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="outstanding-invoices-heading" className="text-lg font-semibold tracking-tight text-foreground">Outstanding invoices</h2>
          </div>
          <Link href="/dashboard/invoices" className="shrink-0 text-sm font-medium text-foreground underline-offset-4 hover:underline">View all</Link>
        </div>

        <CollectionView
          items={outstandingInvoices}
          getKey={(invoice) => invoice.id}
          searchFields={(invoice) => [invoiceTitle(invoice), invoice.client, invoice.invoiceNumber, invoice.project, invoiceStatusMeta[invoiceStatus(invoice)]?.label]}
          searchPlaceholder="Search outstanding invoices"
          viewKey="dashboard-outstanding-invoices"
          initialView="card"
          className="mt-3"
          empty={{ icon: Receipt, title: "No outstanding invoices", description: "Invoices waiting for payment will appear here." }}
          card={invoiceCard}
          row={(invoice) => ({
            subtitle: invoice.client || invoice.companyId,
            description: `${invoiceStatusMeta[invoiceStatus(invoice)]?.label ?? invoice.status} · ${formatMoney(invoice.amount, invoice.currency)}`,
            trailing: formatTimestamp(invoice.updatedAt ?? invoice.createdAt),
          })}
        />
      </section>

      {!loading && !leadsLoading && !error && projects.length === 0 && invoices.length === 0 && !leads?.length && (
        <Card className="mt-8">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Add your first lead, campaign, or invoice to start filling this overview.</CardContent>
        </Card>
      )}
    </main>
  )
}
