"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Image as ImageIcon, Megaphone, Palette, Users } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { postMediaType } from "@/components/dashboard/campaign-creatives"
import { GridCard, GridCardList, thumbnailIcon } from "@/components/dashboard/grid-card"
import { ProjectCover } from "@/components/project-card"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { watchCompanyCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { onRoster, watchCompanyCampaignPeople, type CampaignPerson } from "@/lib/campaign-people"
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

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

/** Home body: post, campaign and creator counts, then the latest of each. */
export function HomeOverview() {
  const { company, projects, sectionHref } = useCompanyPage()
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

  const campaigns = [...projects].sort((a, b) => modified(b) - modified(a))
  const campaignHref = (projectId: string, query: Record<string, string> = {}) => sectionHref("projects", { campaign: projectId, ...query })

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
        {campaigns.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No campaigns yet.</p>
        ) : (
          <div className="mt-4">
            <GridCardList>
              {campaigns.slice(0, PREVIEW_LIMIT).map((project) => {
                const title = project.title || "Untitled campaign"
                return (
                  <GridCard
                    key={project.id}
                    title={title}
                    icon={<Megaphone className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                    preview={<ProjectCover project={project} />}
                    href={campaignHref(project.id)}
                    ariaLabel={`Open ${title}`}
                  />
                )
              })}
            </GridCardList>
          </div>
        )}
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
                  subtitle={[person.app, person.followers > 0 ? `${compactNumber(person.followers)} followers` : "", person.status].filter(Boolean).join(" · ")}
                  icon={<Users className="size-4 text-muted-foreground" aria-hidden="true" />}
                  placeholder={thumbnailIcon(Users)}
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
