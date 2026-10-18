"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Image as ImageIcon, Megaphone, Palette, Users } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { postMediaType } from "@/components/dashboard/campaign-creatives"
import { campaignGridCardProps } from "@/components/dashboard/campaign-grid-card"
import { CollectionView } from "@/components/dashboard/collection-view"
import { GridCard, GridCardList, thumbnailIcon } from "@/components/dashboard/grid-card"
import { deleteProjectWithTasks, duplicateProject, getProject, isProjectArchived, renameProject, setProjectArchived, type Project } from "@/lib/projects"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { watchCompanyCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { onRoster, watchCompanyCampaignPeople, type CampaignPerson } from "@/lib/campaign-people"
import { CreatorThumbnail } from "@/components/dashboard/campaign-people"
import { tsToMillis } from "@/lib/tasks"

const PREVIEW_LIMIT = 4

const modified = (item: { updatedAt?: unknown; createdAt?: unknown }) => tsToMillis(item.updatedAt) || tsToMillis(item.createdAt)

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-border bg-card p-5 max-sm:w-[78%] max-sm:shrink-0 max-sm:snap-start outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring sm:p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-6 text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-3xl">{value.toLocaleString()}</div>
    </Link>
  )
}

function SectionHeader({ id, title, href }: { id: string; title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {href && <Link href={href} className="shrink-0 text-sm font-medium text-foreground underline-offset-4 hover:underline">View all</Link>}
    </div>
  )
}

/** Home body: post, campaign and creator counts, then the latest of each. */
export function HomeOverview() {
  const { company, projects, admin, sectionHref } = useCompanyPage()
  const { appUser } = useAuth()
  const router = useRouter()
  const canDeleteCampaigns = Boolean(admin)
    || appUser?.role === "superadmin"
    || (appUser?.role === "admin" && Boolean(appUser.agencyId) && appUser.agencyId === company.agencyId)
  const canManageCampaigns = canDeleteCampaigns || appUser?.companyId === company.id
  const [addedProjects, setAddedProjects] = useState<Project[]>([])
  const [removedProjectIds, setRemovedProjectIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [posts, setPosts] = useState<CampaignCreative[]>([])
  const [creators, setCreators] = useState<CampaignPerson[]>([])

  useEffect(() => watchCompanyCampaignCreatives(
    company.id,
    (rows) => setPosts(rows.filter((item) => item.type === "text").sort((a, b) => modified(b) - modified(a))),
    () => setPosts([]),
  ), [company.id])

  useEffect(() => watchCompanyCampaignPeople(
    company.id,
    (rows) => setCreators(rows.filter(onRoster).sort((a, b) => modified(b) - modified(a))),
    () => setCreators([]),
  ), [company.id])

  const campaigns = [
    ...addedProjects.filter((added) => !projects.some((project) => project.id === added.id)),
    ...projects.map((project) => addedProjects.find((added) => added.id === project.id) ?? project),
  ]
    .filter((project) => !removedProjectIds.includes(project.id))
    .sort((a, b) => modified(b) - modified(a))
  const campaignHref = (projectId: string, query: Record<string, string> = {}) => sectionHref("projects", { campaign: projectId, ...query })

  async function handleRenameCampaign(project: Project, title: string) {
    if (!canManageCampaigns || title === project.title) return
    try {
      await renameProject(project.id, title)
      if (admin) await admin.reload()
      else setAddedProjects((current) => [{ ...project, title }, ...current.filter((item) => item.id !== project.id)])
      toast.success("Campaign renamed")
    } catch (error) {
      console.error("Error renaming campaign:", error)
      toast.error("The campaign could not be renamed.")
    }
  }

  async function handleDuplicateCampaign(project: Project) {
    if (!canManageCampaigns || busy) return
    setBusy(true)
    try {
      const copyId = await duplicateProject(project)
      if (admin) await admin.reload()
      else {
        const copy = await getProject(copyId)
        if (copy) setAddedProjects((current) => [copy, ...current.filter((item) => item.id !== copy.id)])
      }
      toast.success("Campaign duplicated")
    } catch (error) {
      console.error("Error duplicating campaign:", error)
      toast.error("The campaign could not be duplicated.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteCampaign(project: Project) {
    if (!canDeleteCampaigns) return
    try {
      await deleteProjectWithTasks(project.id)
      if (admin) await admin.reload()
      else setRemovedProjectIds((current) => [...current, project.id])
      toast.success("Campaign deleted")
    } catch (error) {
      console.error("Error deleting campaign:", error)
      toast.error("The campaign could not be deleted.")
    }
  }

  async function handleArchiveCampaign(project: Project, isArchived: boolean) {
    if (!canManageCampaigns) return
    try {
      const updatedAt = await setProjectArchived(project.id, isArchived)
      if (admin) await admin.reload()
      else setAddedProjects((current) => [{ ...project, isArchived, updatedAt }, ...current.filter((item) => item.id !== project.id)])
      toast.success(isArchived ? "Campaign archived" : "Campaign restored")
    } catch (error) {
      console.error(`Error ${isArchived ? "archiving" : "restoring"} campaign:`, error)
      toast.error(`The campaign could not be ${isArchived ? "archived" : "restored"}.`)
    }
  }

  return (
    <>
      {/* Phones: one swipeable row of tiles, each snapping into place, with the next one peeking in. */}
      <div className="scrollbar-none grid gap-3 max-sm:-mx-4 max-sm:flex max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-4 max-sm:overflow-x-auto max-sm:px-4 sm:grid-cols-3">
        <Metric label="Posts" value={posts.length} href={sectionHref("analytics")} />
        <Metric label="Campaigns" value={campaigns.length} href={sectionHref("projects")} />
        <Metric label="Creators" value={creators.length} href={sectionHref("analytics")} />
      </div>

      <section aria-labelledby="home-campaigns-heading" className="mt-8">
        <SectionHeader id="home-campaigns-heading" title="Campaigns" href={campaigns.length > 0 ? sectionHref("projects") : undefined} />
        <CollectionView
          className=""
          items={campaigns.slice(0, PREVIEW_LIMIT)}
          getKey={(project) => project.id}
          searchFields={(project) => [project.title, project.service, project.status, project.dueDate]}
          searchPlaceholder="Search campaigns"
          viewKey="company-home-campaigns"
          fixedView="card"
          hideToolbar
          initialView="card"
          empty={{ icon: Megaphone, title: "No campaigns yet." }}
          itemActions={(project) => ({
            noun: "campaign",
            name: project.title || "Untitled campaign",
            onRename: canManageCampaigns ? (title) => handleRenameCampaign(project, title) : undefined,
            onDuplicate: canManageCampaigns ? () => handleDuplicateCampaign(project) : undefined,
            onArchive: canManageCampaigns && !isProjectArchived(project) ? () => handleArchiveCampaign(project, true) : undefined,
            onRestore: canManageCampaigns && isProjectArchived(project) ? () => handleArchiveCampaign(project, false) : undefined,
            onDelete: canDeleteCampaigns ? () => handleDeleteCampaign(project) : undefined,
          })}
          card={(project) => campaignGridCardProps(project, {
            href: campaignHref(project.id),
            onOpen: () => router.push(campaignHref(project.id)),
          })}
        />
      </section>

      {posts.length > 0 && (
        <section aria-labelledby="home-posts-heading" className="mt-8">
          <SectionHeader id="home-posts-heading" title="Latest posts" />
          <div className="mt-4">
            <GridCardList>
              {posts.slice(0, PREVIEW_LIMIT).map((post) => {
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
                    // Posts written on the Social page belong to no campaign.
                    href={post.projectId ? campaignHref(post.projectId, { view: "content", post: post.id }) : sectionHref("social")}
                    ariaLabel={`Open ${title}`}
                  />
                )
              })}
            </GridCardList>
          </div>
        </section>
      )}

      {creators.length > 0 && (
        <section aria-labelledby="home-creators-heading" className="mt-8">
          <SectionHeader id="home-creators-heading" title="Creators" />
          <div className="mt-4">
            <GridCardList>
              {creators.slice(0, PREVIEW_LIMIT).map((person) => (
                <GridCard
                  key={person.id}
                  title={person.handle}
                  icon={<Users className="size-4 text-muted-foreground" aria-hidden="true" />}
                  preview={<CreatorThumbnail person={person} showMeta={false} />}
                  href={campaignHref(person.projectId, { view: "creators" })}
                  ariaLabel={`Open ${person.handle}`}
                />
              ))}
            </GridCardList>
          </div>
        </section>
      )}

    </>
  )
}
