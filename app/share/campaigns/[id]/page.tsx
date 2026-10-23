"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"

import { BrandLockup } from "@/components/brand-lockup"
import { CreatorBriefSummary, OpeningSummary } from "@/components/dashboard/creator-brief"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { TaskContent } from "@/components/dashboard/task-content"
import { ProjectCover } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { MediaLightbox, type MediaLightboxItem } from "@/components/ui/media-lightbox"
import { watchCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { getOrganization, type Organization } from "@/lib/organizations"
import { applicationsClosed, campaignSharePath, CREATORS_ROLE, formatBriefDate, hasBrief, hiresCreators, resolveBrief, resolveOpenings } from "@/lib/campaign-brief"
import { getProject, type Project } from "@/lib/projects"
import { tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

const LEGAL_LINKS = [
  { name: "Privacy", href: "/privacy" },
  { name: "Cookies", href: "/cookies" },
  { name: "Terms", href: "/terms" },
]

/**
 * No login required: a campaign page to hand to creators. The campaign, what
 * it's about, the brief, and up to five samples. Nothing private from
 * the client's page comes with it. With ?role=<opening id> it's one opening's
 * page: the same campaign on top, then only that job, and Apply for it.
 */
export default function SharedCampaignPage() {
  return <Suspense><SharedCampaign /></Suspense>
}

function SharedCampaign() {
  const { id = "" } = useParams<{ id: string }>()
  const roleId = useSearchParams().get("role") ?? ""
  const [project, setProject] = useState<Project | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [creatives, setCreatives] = useState<CampaignCreative[]>([])
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
        // The client's name and logo are nice-to-have; the campaign shows without them.
        if (!found?.companyId) return
        const org = await getOrganization(found.companyId).catch(() => null)
        if (active && org) setOrganization(org)
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
      <main className="dashboard-body min-h-screen bg-background px-4 py-10 font-sans sm:py-16" role="status" aria-label="Loading campaign">
        <div className="mx-auto max-w-4xl space-y-6"><Skeleton className="aspect-[3/1] w-full rounded-xs" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40 w-full" /></div>
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
  const previewItems: MediaLightboxItem[] = [
    ...samples.map((item) => ({
      id: `media:${item.id}`,
      title: item.title || (item.type === "video" ? "Video" : "Image"),
      url: item.url,
      type: item.type as "image" | "video",
    })),
  ]
  const clientName = organization?.name || project.client
  const brief = hasBrief(project.brief) ? resolveBrief(project.brief) : null
  const posted = tsToMillis(project.createdAt) > 0 ? new Date(tsToMillis(project.createdAt)) : null
  const openings = resolveOpenings(project.openings)
  const opening = openings.find((item) => item.id === roleId)
  const creatorsOpen = hiresCreators(project.brief)
  // The general link lists every job when there's more than posting; a job's own link shows only that job.
  const general = !opening && !(roleId === CREATORS_ROLE && creatorsOpen) && openings.length > 0
  const role = opening ?? (!general && creatorsOpen ? brief : null)
  const roleTitle = opening ? opening.title : "Creators"
  const jobs = general ? [...(creatorsOpen ? [{ id: CREATORS_ROLE, title: "Creators" }] : []), ...openings] : []
  const closed = role ? applicationsClosed(role) : true
  const sharePath = campaignSharePath(project.id, opening?.id ?? (roleId === CREATORS_ROLE && !general ? CREATORS_ROLE : undefined))

  return (
    <main className={cn("dashboard-body min-h-screen bg-background px-4 pt-4 font-sans sm:pt-6 [&_*]:font-sans", role ? "pb-32" : "pb-10 sm:pb-16")}>
      <div className="mx-auto max-w-4xl space-y-4">
        <section aria-labelledby="shared-campaign-title" className="overflow-hidden rounded-xs bg-card">
          {/* Kept short and darkened so the client's logo leads. */}
          <div className="relative h-28 overflow-hidden bg-muted sm:h-36">
            <ProjectCover project={project} />
            <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
          </div>
          <div className="relative -mt-12 px-5 sm:-mt-14 sm:px-6">
            <div className="grid size-24 place-items-center overflow-hidden rounded-xs bg-card text-3xl font-semibold text-foreground shadow-sm ring-4 ring-background sm:size-28">
              {organization?.logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={organization.logoUrl} alt={clientName || ""} className="size-full object-cover" />
                : (clientName || project.title).charAt(0).toUpperCase()}
            </div>
            {clientName && (
              <p className="mt-4 text-sm text-foreground">
                <span className="font-semibold">{clientName}</span>
                {organization?.slug && (
                  <Link href={`/${organization.slug}`} className="ml-2 text-muted-foreground hover:underline">@{organization.slug}</Link>
                )}
              </p>
            )}
          </div>
          <div className="space-y-5 px-5 pt-5 pb-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 id="shared-campaign-title" className="text-2xl font-semibold tracking-tight text-foreground">{project.title}</h1>
                {posted && (
                  // A <time>, not a <p>: dashboard-body sets every paragraph to body size.
                  <time dateTime={posted.toISOString()} className="mt-1 block text-xs text-muted-foreground">
                    {posted.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </time>
                )}
              </div>
              <ShareDialog
                path={sharePath}
                title={`Share ${opening ? `${opening.title} on ${project.title}` : project.title}`}
                shareText={opening ? `Apply for ${opening.title} on the ${project.title} campaign` : role ? `Apply for the ${project.title} campaign` : `See the ${project.title} campaign`}
                contentClassName="dashboard-body font-sans"
              />
            </div>
            {brief && <CreatorBriefSummary brief={brief} shared part="campaign" brand={{ accounts: socialAccounts, links: organization?.links, website: organization?.website }} />}
            {project.about?.trim() && (
              <div>
                <h2 id="shared-about-heading" className="text-sm font-semibold text-foreground">About</h2>
                <TaskContent value={project.about} className="mt-3 text-sm leading-6" />
              </div>
            )}
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

        {role && (
          <section aria-labelledby="shared-role-heading" className="space-y-4 rounded-xs bg-card p-5 sm:p-6">
            <div>
              <p className="text-xs text-muted-foreground">Your role</p>
              <h2 id="shared-role-heading" className="text-lg font-semibold text-foreground">{roleTitle}</h2>
            </div>
            {opening
              ? <OpeningSummary opening={opening} />
              : brief && <CreatorBriefSummary brief={brief} shared part="creators" hideOffer={!brief.showOffer} />}
          </section>
        )}

        {jobs.length > 0 && (
          <section aria-labelledby="shared-openings-heading" className="rounded-xs bg-card p-5 sm:p-6">
            <h2 id="shared-openings-heading" className="text-sm font-semibold text-foreground">Jobs on this campaign</h2>
            <ul className="mt-3 divide-y divide-border">
              {jobs.map((item) => (
                <li key={item.id}>
                  <Link href={campaignSharePath(project.id, item.id)} className="flex items-center justify-between gap-4 py-3 text-sm text-foreground hover:underline">
                    {item.title}
                    <span className="text-muted-foreground">See job</span>
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
      {role && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              {closed ? "Applications have closed" : role.registerBy ? `Apply by ${formatBriefDate(role.registerBy)}` : opening ? opening.title : project.title}
            </p>
            {closed
              ? <Button type="button" size="lg" className="h-12 px-12" disabled>Closed</Button>
              : <Button asChild size="lg" className="h-12 px-12"><Link href={`/share/campaigns/${encodeURIComponent(project.id)}/apply${opening ? `?role=${encodeURIComponent(opening.id)}` : ""}`}>Apply</Link></Button>}
          </div>
        </div>
      )}
      <MediaLightbox items={previewItems} activeId={previewId} onChange={setPreviewId} />
    </main>
  )
}
