"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Image as ImageIcon, Megaphone, Palette, Receipt } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useCampaignShare } from "@/components/dashboard/campaign-grid-card"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { GridCard, GridCardList, thumbnailIcon } from "@/components/dashboard/grid-card"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { useViewMode, ViewToggle } from "@/components/dashboard/view-toggle"
import { Card, CardContent } from "@/components/ui/card"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { formatMoney, getInvoices, invoiceStatusMeta, type Invoice } from "@/lib/billing"
import { invoiceIsOpen, invoiceIsOverdue } from "@/lib/invoice-reminders"
import { watchLeads, type Lead } from "@/lib/leads"
import { getProjects, projectSlug, type Project } from "@/lib/projects"
import { ProjectCover } from "@/components/project-card"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { getLatestCampaignPosts, type CampaignCreative } from "@/lib/campaign-creatives"
import { postMediaType } from "@/components/dashboard/campaign-creatives"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-border bg-card p-5 max-sm:w-[78%] max-sm:shrink-0 max-sm:snap-start outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring sm:p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      {/* div, not p: the dashboard-body rule forces p to inherit its font size. Same size as the greeting. */}
      <div className="mt-6 text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-3xl">{value.toLocaleString()}</div>
    </Link>
  )
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
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

function invoiceCard(invoice: Invoice, open: (href: string) => void) {
  const status = invoiceStatus(invoice)
  const title = invoiceTitle(invoice)
  const href = `/dashboard/invoices?invoice=${encodeURIComponent(invoice.id)}`
  // The same card as every other list. With no picture, the thumbnail is just the icon; amount and status are in the list row.
  return {
    title,
    icon: <Receipt className={cn("size-4", status === "overdue" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")} aria-hidden="true" />,
    placeholder: thumbnailIcon(Receipt),
    menuLabel: `Options for ${title}`,
    actions: { noun: "invoice", name: title, onOpen: () => open(href) },
    href,
    ariaLabel: `Open ${title}`,
  }
}

/** Agency home: the useful numbers first, then the invoices that need attention. */
export default function DashboardPage() {
  const router = useRouter()
  const share = useCampaignShare()
  const { user, appUser } = useAuth()
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [latestPosts, setLatestPosts] = useState<CampaignCreative[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [greeting, setGreeting] = useState("Good morning")
  const [invoiceView, setInvoiceView] = useViewMode("dashboard-outstanding-invoices", "grid")

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const [nextProjects, nextInvoices, nextPosts] = await Promise.all([getProjects(), getInvoices(), getLatestCampaignPosts(4).catch(() => [])])
      setProjects(nextProjects)
      setInvoices(nextInvoices)
      setLatestPosts(nextPosts)
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
    setGreeting(greetingForHour(new Date().getHours()))
  }, [])

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
  const outstandingInvoiceCount = useMemo(() => invoices.filter(invoiceIsOpen).length, [invoices])
  // The four campaigns changed most recently.
  const latestCampaigns = useMemo(
    () => [...projects].sort((a, b) => (tsToMillis(b.updatedAt) || tsToMillis(b.createdAt)) - (tsToMillis(a.updatedAt) || tsToMillis(a.createdAt))).slice(0, 4),
    [projects],
  )
  const firstName = (appUser?.displayName || user?.displayName || user?.email?.split("@")[0] || "there").trim().split(/\s+/)[0]

  if (!user) return null
  if (loading && leadsLoading) return <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6"><DashboardPageSkeleton variant="home" rows={4} /></main>

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6">
      {error && <p className="mb-5 text-sm text-destructive" role="alert">{error}</p>}

      <section aria-labelledby="dashboard-greeting-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 id="dashboard-greeting-heading" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{greeting}, {firstName}</h1>
          </div>
        </div>

        {/* Phones: one swipeable row of tiles, each snapping into place, with the next one peeking in. */}
        <div className="scrollbar-none mt-5 grid gap-3 max-sm:-mx-4 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-4 max-sm:overflow-x-auto max-sm:px-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Leads" value={leads?.length ?? 0} href="/dashboard/leads" />
          <Metric label="Reached out" value={reachedOut} href="/dashboard/leads" />
          <Metric label="Client campaigns" value={projects.length} href="/dashboard/projects" />
          <Metric label="Outstanding invoices" value={outstandingInvoiceCount} href="/dashboard/invoices" />
        </div>
      </section>

      {latestCampaigns.length > 0 && (
        <section aria-labelledby="latest-campaigns-heading" className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 id="latest-campaigns-heading" className="text-lg font-semibold tracking-tight text-foreground">Latest campaigns</h2>
            <Link href="/dashboard/projects" className="shrink-0 text-sm font-medium text-foreground underline-offset-4 hover:underline">View all</Link>
          </div>
          <div className="mt-4">
            <GridCardList>
              {latestCampaigns.map((project) => {
                const href = `/dashboard/projects/${encodeURIComponent(projectSlug(project))}`
                return (
                  <GridCard
                    key={project.id}
                    title={project.title || "Untitled campaign"}
                    icon={<Megaphone className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                    preview={<ProjectCover project={project} />}
                    href={href}
                    ariaLabel={`Open ${project.title || "campaign"}`}
                    menuLabel={`Options for ${project.title || "campaign"}`}
                    actions={{ noun: "campaign", name: project.title || "Untitled campaign", onOpen: () => router.push(href), extra: share.shareItem(project) }}
                  />
                )
              })}
            </GridCardList>
          </div>
        </section>
      )}

      {latestPosts.length > 0 && (
        <section aria-labelledby="latest-posts-heading" className="mt-8">
          <h2 id="latest-posts-heading" className="text-lg font-semibold tracking-tight text-foreground">Latest posts</h2>
          <div className="mt-4">
            <GridCardList>
              {latestPosts.map((post) => {
                const project = projects.find((item) => item.id === post.projectId)
                // Opens the post in its campaign's Content tab.
                const href = project ? `/dashboard/projects/${encodeURIComponent(projectSlug(project))}?view=content&post=${encodeURIComponent(post.id)}` : undefined
                const title = post.title || "Post"
                return (
                  <GridCard
                    key={post.id}
                    title={title}
                    icon={<Palette className="size-4 text-muted-foreground" aria-hidden="true" />}
                    preview={post.mediaUrl ? (
                      postMediaType(post) === "video"
                        ? <VideoThumbnail src={post.mediaUrl} />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={post.mediaUrl} alt="" loading="lazy" className="size-full object-cover" />
                    ) : undefined}
                    placeholder={thumbnailIcon(ImageIcon)}
                    href={href}
                    ariaLabel={`Open ${title}`}
                    menuLabel={href ? `Options for ${title}` : undefined}
                    actions={href ? { noun: "post", name: title, onOpen: () => router.push(href) } : undefined}
                  />
                )
              })}
            </GridCardList>
          </div>
        </section>
      )}

      <section aria-labelledby="outstanding-invoices-heading" className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="outstanding-invoices-heading" className="text-lg font-semibold tracking-tight text-foreground">Outstanding invoices</h2>
          <ViewToggle view={invoiceView} onChange={setInvoiceView} />
          <Link href="/dashboard/invoices" className="shrink-0 text-sm font-medium text-foreground underline-offset-4 hover:underline">View all</Link>
        </div>

        {outstandingInvoices.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">No outstanding invoices.</CardContent>
          </Card>
        ) : invoiceView === "grid" ? (
          <div className="mt-4">
            <GridCardList>
              {outstandingInvoices.map((invoice) => <GridCard key={invoice.id} {...invoiceCard(invoice, (href) => router.push(href))} />)}
            </GridCardList>
          </div>
        ) : (
          <div className="mt-4">
            {outstandingInvoices.map((invoice) => {
              const card = invoiceCard(invoice, (href) => router.push(href))
              const status = invoiceStatus(invoice)
              return (
                <MobileDataCard
                  key={invoice.id}
                  surface="list"
                  variant="inline"
                  iconShape="circle"
                  icon={card.icon}
                  title={card.title}
                  subtitle={invoice.client || invoice.companyId}
                  description={`${invoiceStatusMeta[status]?.label ?? invoice.status} · ${formatMoney(invoice.amount, invoice.currency)}`}
                  trailing={formatTimestamp(invoice.updatedAt ?? invoice.createdAt)}
                  href={card.href}
                  ariaLabel={card.ariaLabel}
                  actions={card.actions}
                  menuLabel={card.menuLabel}
                />
              )
            })}
          </div>
        )}
      </section>

      {!loading && !leadsLoading && !error && projects.length === 0 && invoices.length === 0 && !leads?.length && (
        <Card className="mt-8">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Add your first lead, campaign, or invoice to start filling this overview.</CardContent>
        </Card>
      )}
      {share.dialog}
    </main>
  )
}
