"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Image as ImageIcon, Megaphone, Palette, Users } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { isCompanySection, useCompanyPage } from "@/components/company/company-page-context"
import { postMediaType } from "@/components/dashboard/campaign-creatives"
import { GridCard, GridCardList, thumbnailIcon } from "@/components/dashboard/grid-card"
import { ProjectCover } from "@/components/project-card"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { watchCompanyCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { onRoster, watchCompanyCampaignPeople, type CampaignPerson } from "@/lib/campaign-people"
import { tsToMillis } from "@/lib/tasks"

export default function CompanyHomePage() {
  const { company, sectionHref } = useCompanyPage()
  const { user, appUser } = useAuth()
  const firstName = (appUser?.displayName || user?.displayName || "").trim().split(/\s+/)[0]
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirected = useRef(false)

  // Older links put the section in ?tab=, and shared document links used /{slug}?doc=.
  // Task links intentionally stay on this page so TaskDetailSheet can open in place.
  const tab = searchParams.get("tab")
  const legacySettings = tab === "about"
  const legacySection = tab === "media" || tab === "documents" || tab === "finance" || tab === "drive" || tab === "notes"
    ? "documents"
    : isCompanySection(tab) && tab !== "about"
      ? tab
      : searchParams.get("doc")
        ? "documents"
        : null

  useEffect(() => {
    if ((!legacySection && !legacySettings) || redirected.current) return
    redirected.current = true
    const query = Object.fromEntries(searchParams.entries())
    delete query.tab
    if (legacySettings) {
      const homePath = sectionHref("about").split("?")[0]
      const nextSearch = new URLSearchParams(query).toString()
      router.replace(`${homePath}/settings${nextSearch ? `?${nextSearch}` : ""}`)
      return
    }
    router.replace(sectionHref(legacySection!, query))
  }, [legacySection, legacySettings, router, searchParams, sectionHref])

  if (legacySection || legacySettings) return null

  return (
    <>
      <HomeBanner coverUrl={company.media?.find((url) => url && url !== company.logoUrl)} />
      <h1 className="surface-record-title mt-2 mb-4 truncate">
        {firstName ? `Welcome back, ${firstName}` : `Welcome to ${company.name}`}
      </h1>
      <HomeOverview />
    </>
  )
}

/** The cover image across the top of the home page, or a soft gradient when there isn't one. */
function HomeBanner({ coverUrl }: { coverUrl?: string }) {
  return (
    <div className="relative mb-2 h-[104px] overflow-hidden rounded-[14px] border border-border bg-[linear-gradient(120deg,#FBEFE2_0%,#FBE6E9_50%,#E6F3E8_100%)] dark:bg-[linear-gradient(120deg,#2a211c_0%,#2b1f24_50%,#1c2a20_100%)] md:h-44 md:rounded-2xl">
      {coverUrl && (
        // Uploaded media is user-controlled, so keep this as a plain image rather than requiring host allowlisting.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
      )}
    </div>
  )
}

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
function HomeOverview() {
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
                    href={campaignHref(post.projectId, { view: "content", post: post.id })}
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
