"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { BrandLockup } from "@/components/brand-lockup"
import { SocialIcon } from "@/components/company/social-icon"
import { brandAccount, CreatorBriefSummary, OpeningSummary, websiteHref } from "@/components/dashboard/creator-brief"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { TaskContent } from "@/components/dashboard/task-content"
import { ProjectCover } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { MediaLightbox, type MediaLightboxItem } from "@/components/ui/media-lightbox"
import { watchCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { getOrganization, type Organization } from "@/lib/organizations"
import {
  applicationsClosed,
  campaignSharePath,
  CREATORS_ROLE,
  formatBriefDate,
  hasBrief,
  hiresCreators,
  resolveBrief,
  resolveOpenings,
} from "@/lib/campaign-brief"
import { getProject, getPublicProjectsByCompanyId, type Project } from "@/lib/projects"
import { tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

const LEGAL_LINKS = [
  { name: "Privacy", href: "/privacy" },
  { name: "Cookies", href: "/cookies" },
  { name: "Terms", href: "/terms" },
]

const SOCIAL_PLATFORMS = ["instagram", "tiktok", "youtube", "facebook"]

type OtherJob = { href: string; title: string; campaign: string; registerBy: string }

/**
 * No login required: the page handed to people who might work on a campaign.
 * A job's page (jobId set) leads with that job and its details, then the
 * campaign, then the client, then the client's other open jobs. The campaign's
 * own page lists every job instead, when there's more than posting.
 * Nothing private from the client's page comes with it.
 */
export function SharedCampaignView({ id, jobId = "" }: { id: string; jobId?: string }) {
  const [project, setProject] = useState<Project | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [creatives, setCreatives] = useState<CampaignCreative[]>([])
  const [clientProjects, setClientProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [socialAccounts, setSocialAccounts] = useState<{ platform: string; username: string }[]>([])

  useEffect(() => {
    if (!id) return
    let active = true
    getProject(id)
      .then(async (found) => {
        if (!active) return
        setProject(found)
        setLoading(false)
        // The client's name, logo and other jobs are nice-to-have; the job shows without them.
        if (!found?.companyId) return
        const [org, projects] = await Promise.all([
          getOrganization(found.companyId).catch(() => null),
          getPublicProjectsByCompanyId(found.companyId).catch(() => []),
        ])
        if (!active) return
        if (org) setOrganization(org)
        setClientProjects(projects)
      })
      .catch(() => {
        if (active) {
          setProject(null)
          setLoading(false)
        }
      })
    fetch(`/api/campaigns/socials?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { accounts?: { platform: string; username: string }[] }) => { if (active) setSocialAccounts(result.accounts ?? []) })
      .catch(() => undefined)
    const stop = watchCampaignCreatives(id, (rows) => { if (active) setCreatives(rows) }, () => undefined)
    return () => {
      active = false
      stop()
    }
  }, [id])

  if (loading) {
    return (
      <main className="dashboard-body min-h-screen bg-background px-4 py-10 font-sans sm:py-16" role="status" aria-label="Loading">
        <div className="mx-auto max-w-4xl space-y-6"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40 w-full" /><Skeleton className="aspect-[3/1] w-full rounded-xs" /></div>
      </main>
    )
  }

  if (!project || project.isArchived) {
    return (
      <main className="dashboard-body flex min-h-screen items-center justify-center bg-background px-4 font-sans">
        <p className="text-sm text-muted-foreground">This link is no longer available.</p>
      </main>
    )
  }

  const samples = creatives.filter((item) => (item.type === "image" || item.type === "video") && item.url).slice(0, 5)
  const previewItems: MediaLightboxItem[] = samples.map((item) => ({
    id: `media:${item.id}`,
    title: item.title || (item.type === "video" ? "Video" : "Image"),
    url: item.url,
    type: item.type as "image" | "video",
  }))
  const clientName = organization?.name || project.client
  const brand = { accounts: socialAccounts, links: organization?.links, website: organization?.website }
  const brief = hasBrief(project.brief) ? resolveBrief(project.brief) : null
  const posted = tsToMillis(project.createdAt) > 0 ? new Date(tsToMillis(project.createdAt)) : null
  const openings = resolveOpenings(project.openings)
  const creatorsOpen = hiresCreators(project.brief)
  const opening = openings.find((item) => item.id === jobId)
  // Posting is a job too: its own link, or the campaign's link when it's the only job.
  const creatorsJob = creatorsOpen && (jobId === CREATORS_ROLE || (!jobId && openings.length === 0))
  const job = opening ?? (creatorsJob ? brief : null)
  const jobTitle = opening ? opening.title : "Creators"
  const description = opening ? opening.details.trim() : brief?.contentDetails.trim() ?? ""
  const jobs = !job ? [...(creatorsOpen ? [{ id: CREATORS_ROLE, title: "Creators" }] : []), ...openings] : []
  const closed = job ? applicationsClosed(job) : true
  const ownPath = job && jobId ? campaignSharePath(project.id, jobId) : campaignSharePath(project.id)
  const applyHref = `${ownPath}/apply`

  // Open jobs from this client's campaigns, other than the one on this page. This campaign's are listed above when there's no job.
  const otherJobs: OtherJob[] = clientProjects
    .filter((item) => !item.isArchived && (job ? true : item.id !== project.id))
    .flatMap((item) => resolveOpenings(item.openings)
      .filter((other) => !(item.id === project.id && other.id === opening?.id) && !applicationsClosed(other))
      .map((other) => ({ href: campaignSharePath(item.id, other.id), title: other.title, campaign: item.title, registerBy: other.registerBy })))
    .slice(0, 8)

  const clientAccounts = SOCIAL_PLATFORMS
    .map((platform) => ({ platform, account: brandAccount(platform, brand) }))
    .filter((item) => item.account?.handle)

  return (
    <main className={cn("dashboard-body min-h-screen bg-background px-4 pt-4 font-sans sm:pt-6 [&_*]:font-sans", job ? "pb-32" : "pb-10 sm:pb-16")}>
      <div className="mx-auto max-w-4xl space-y-4">
        {/* The job first: what it is and its details. On the campaign's own page, every job on it. */}
        <section aria-labelledby="shared-job-title" className="space-y-5 rounded-xs bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {clientName && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClientLogo organization={organization} name={clientName} className="size-6 text-xs" />
                  {clientName}
                </p>
              )}
              <h1 id="shared-job-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{job ? jobTitle : project.title}</h1>
              {job && <p className="mt-1 text-sm text-muted-foreground">{project.title}</p>}
            </div>
            <ShareDialog
              path={ownPath}
              title={`Share ${job ? `${jobTitle} · ${project.title}` : project.title}`}
              shareText={job ? `Apply for ${jobTitle} on the ${project.title} campaign` : `See the jobs on the ${project.title} campaign`}
              contentClassName="dashboard-body font-sans"
            />
          </div>
          {job && description && <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{description}</p>}
          {job && (opening
            ? <OpeningSummary opening={opening} hideDetails />
            : brief && <CreatorBriefSummary brief={brief} shared part="creators" hideOffer={!brief.showOffer} hideDetails />)}
          {!job && jobs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground">Jobs on this campaign</h2>
              <ul className="mt-2 divide-y divide-border">
                {jobs.map((item) => (
                  <li key={item.id}>
                    <Link href={campaignSharePath(project.id, item.id)} className="flex items-center justify-between gap-4 py-3 text-sm text-foreground hover:underline">
                      {item.title}
                      <span className="text-muted-foreground">See job</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!job && jobs.length === 0 && <p className="text-sm text-muted-foreground">This campaign isn&apos;t taking applications.</p>}
        </section>

        {/* The campaign. */}
        <section aria-labelledby="shared-campaign-title" className="overflow-hidden rounded-xs bg-card">
          <div className="relative h-24 overflow-hidden bg-muted sm:h-32">
            <ProjectCover project={project} />
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <p className="text-xs text-muted-foreground">The campaign</p>
              <h2 id="shared-campaign-title" className="text-lg font-semibold text-foreground">{project.title}</h2>
              {posted && (
                // A <time>, not a <p>: dashboard-body sets every paragraph to body size.
                <time dateTime={posted.toISOString()} className="mt-1 block text-xs text-muted-foreground">
                  Posted {posted.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </time>
              )}
            </div>
            {brief && <CreatorBriefSummary brief={brief} shared part="campaign" brand={{ ...brand, website: undefined }} />}
            {project.about?.trim() && <TaskContent value={project.about} className="text-sm leading-6" />}
            {samples.length > 0 && (
              <div className="flex gap-2">
                {samples.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreviewId(`media:${item.id}`)}
                    aria-label={`Preview ${item.title || item.type}`}
                    className="size-16 shrink-0 overflow-hidden rounded-xs bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.type === "video"
                      ? <VideoThumbnail src={item.url} />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* The client. */}
        {clientName && (
          <section aria-labelledby="shared-client-heading" className="space-y-4 rounded-xs bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <ClientLogo organization={organization} name={clientName} className="size-14 text-xl" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">About the client</p>
                <h2 id="shared-client-heading" className="text-lg font-semibold text-foreground">{clientName}</h2>
                {organization?.slug && <Link href={`/${organization.slug}`} className="text-sm text-muted-foreground hover:underline">@{organization.slug}</Link>}
              </div>
            </div>
            {organization?.description?.trim() && <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{organization.description}</p>}
            {(organization?.website || clientAccounts.length > 0) && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground">
                {organization?.website && (
                  <a href={websiteHref(organization.website)} target="_blank" rel="noreferrer" className="break-all hover:underline">
                    {organization.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
                  </a>
                )}
                {clientAccounts.map(({ platform, account }) => (
                  <a key={platform} href={account?.url || undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                    <SocialIcon platform={platform} />
                    {account?.handle}
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* The client's other open jobs. */}
        {otherJobs.length > 0 && (
          <section aria-labelledby="shared-more-heading" className="rounded-xs bg-card p-5 sm:p-6">
            <h2 id="shared-more-heading" className="text-sm font-semibold text-foreground">More jobs from {clientName || "this client"}</h2>
            <ul className="mt-2 divide-y divide-border">
              {otherJobs.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="flex items-center justify-between gap-4 py-3 text-sm hover:underline">
                    <span className="min-w-0">
                      <span className="block truncate text-foreground">{item.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{item.campaign}</span>
                    </span>
                    {item.registerBy && <span className="shrink-0 text-xs text-muted-foreground">Apply by {formatBriefDate(item.registerBy)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="!mt-10 flex flex-col gap-4 border-t border-border pt-6 text-xs text-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="VisualCNS home"><BrandLockup logoSize={24} /></Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>© {new Date().getFullYear()} Visual Core Nine Systems</span>
            {LEGAL_LINKS.map((item) => (
              <span key={item.href} className="flex items-center gap-x-3">
                <span aria-hidden="true">·</span>
                <Link href={item.href} className="text-foreground/70 underline decoration-foreground/25 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary">{item.name}</Link>
              </span>
            ))}
          </div>
        </footer>
      </div>
      {job && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              {closed ? "Applications have closed" : job.registerBy ? `Apply by ${formatBriefDate(job.registerBy)}` : jobTitle}
            </p>
            {closed
              ? <Button type="button" size="lg" className="h-12 px-12" disabled>Closed</Button>
              : <Button asChild size="lg" className="h-12 px-12"><Link href={applyHref}>Apply</Link></Button>}
          </div>
        </div>
      )}
      <MediaLightbox items={previewItems} activeId={previewId} onChange={setPreviewId} />
    </main>
  )
}

function ClientLogo({ organization, name, className }: { organization: Organization | null; name: string; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-xs bg-muted font-semibold text-foreground", className)}>
      {organization?.logoUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={organization.logoUrl} alt="" className="size-full object-cover" />
        : name.charAt(0).toUpperCase()}
    </span>
  )
}
