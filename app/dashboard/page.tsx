"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { useAuth } from "@/components/auth-provider"
import { useCampaignShare } from "@/components/dashboard/campaign-grid-card"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { SectionHeader } from "@/components/dashboard/section-header"
import { ThumbnailListItem } from "@/components/dashboard/thumbnail-list-item"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { deleteInvoice, getInvoices, updateInvoice, type Invoice } from "@/lib/billing"
import { invoiceIsOpen } from "@/lib/invoice-reminders"
import { watchLeads, type Lead } from "@/lib/leads"
import { deleteProject, getProjects, projectSlug, renameProject, type Project } from "@/lib/projects"
import { ProjectCover } from "@/components/project-card"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { deleteCampaignCreative, getLatestCampaignPosts, updateCampaignCreative, type CampaignCreative } from "@/lib/campaign-creatives"
import { postMediaType } from "@/components/dashboard/campaign-creatives"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"

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


/** One of the home page's three columns: a heading, then thumbnail rows. */
function HomeColumn({ id, title, href, empty, children }: { id: string; title: string; href?: string; empty: string; children: ReactNode[] }) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <SectionHeader id={id} title={title} href={href} />
      {children.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">{empty}</CardContent>
        </Card>
      ) : (
        <div className="mt-4 space-y-2">{children}</div>
      )}
    </section>
  )
}

/** Agency home: the useful numbers first, then the latest campaigns, posts and invoices side by side. */
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

  /** Runs a menu change, then reloads the columns. */
  async function refreshAfter(change: Promise<void>) {
    await change
    await fetchData()
  }

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
    () => invoices.filter(invoiceIsOpen).sort((a, b) => invoiceDate(b) - invoiceDate(a)).slice(0, 4),
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

      <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-6">
        <HomeColumn id="latest-campaigns-heading" title="Latest campaigns" href="/dashboard/projects" empty="No campaigns yet.">
          {latestCampaigns.map((project) => {
            const href = `/dashboard/projects/${encodeURIComponent(projectSlug(project))}`
            const title = project.title || "Untitled campaign"
            return (
              <ThumbnailListItem
                key={project.id}
                size="sm"
                title={title}
                subtitle={formatTimestamp(project.updatedAt ?? project.createdAt)}
                preview={<ProjectCover project={project} />}
                href={href}
                ariaLabel={`Open ${title}`}
                menuLabel={`Options for ${title}`}
                actions={{
                  noun: "campaign",
                  name: title,
                  onRename: (next) => refreshAfter(renameProject(project.id, next)),
                  extra: share.shareItem(project),
                  onDelete: () => refreshAfter(deleteProject(project.id)),
                  deleteMessage: `This permanently deletes "${title}". Tasks under it are not deleted automatically. This cannot be undone.`,
                }}
              />
            )
          })}
        </HomeColumn>

        <HomeColumn id="latest-posts-heading" title="Latest posts" empty="No posts yet.">
          {latestPosts.map((post) => {
            const project = projects.find((item) => item.id === post.projectId)
            // Opens the post in its campaign's Content tab.
            const href = project ? `/dashboard/projects/${encodeURIComponent(projectSlug(project))}?view=content&post=${encodeURIComponent(post.id)}` : undefined
            const title = post.title || "Post"
            return (
              <ThumbnailListItem
                key={post.id}
                size="sm"
                title={title}
                subtitle={formatTimestamp(post.updatedAt ?? post.createdAt)}
                preview={post.mediaUrl ? (
                  postMediaType(post) === "video"
                    ? <VideoThumbnail src={post.mediaUrl} />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={post.mediaUrl} alt="" loading="lazy" className="size-full object-cover" />
                ) : undefined}
                href={href}
                ariaLabel={`Open ${title}`}
                menuLabel={`Options for ${title}`}
                actions={{
                  noun: "post",
                  name: title,
                  onRename: (next) => refreshAfter(updateCampaignCreative(post.id, { title: next })),
                  onDelete: () => refreshAfter(deleteCampaignCreative(post.id)),
                }}
              />
            )
          })}
        </HomeColumn>

        <HomeColumn id="outstanding-invoices-heading" title="Outstanding invoices" href="/dashboard/invoices" empty="No outstanding invoices.">
          {outstandingInvoices.map((invoice) => {
            const title = invoiceTitle(invoice)
            const href = `/dashboard/invoices?invoice=${encodeURIComponent(invoice.id)}`
            return (
              <ThumbnailListItem
                key={invoice.id}
                size="sm"
                title={title}
                subtitle={formatTimestamp(invoice.updatedAt ?? invoice.createdAt)}
                href={href}
                ariaLabel={`Open ${title}`}
                menuLabel={`Options for ${title}`}
                actions={{
                  noun: "invoice",
                  name: title,
                  onRename: (next) => refreshAfter(updateInvoice(invoice.id, { title: next })),
                  extra: <DropdownMenuItem onSelect={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}>Edit invoice</DropdownMenuItem>,
                  onDelete: () => refreshAfter(deleteInvoice(invoice.id)),
                  deleteMessage: `${invoice.invoiceNumber || "This invoice"} will be removed for good. This cannot be undone.`,
                }}
              />
            )
          })}
        </HomeColumn>
      </div>

      {!loading && !leadsLoading && !error && projects.length === 0 && invoices.length === 0 && !leads?.length && (
        <Card className="mt-8">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Add your first lead, campaign, or invoice to start filling this overview.</CardContent>
        </Card>
      )}
      {share.dialog}
    </main>
  )
}
