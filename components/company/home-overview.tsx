"use client"

import { useEffect, useState } from "react"
import { Image as ImageIcon, Palette, Users } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { postMediaType } from "@/components/dashboard/campaign-creatives"
import { GridCard, GridCardList, thumbnailIcon } from "@/components/dashboard/grid-card"
import { SectionHeader } from "@/components/dashboard/section-header"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { watchCompanyCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { onRoster, watchCompanyCampaignPeople, type CampaignPerson } from "@/lib/campaign-people"
import { CreatorThumbnail } from "@/components/dashboard/campaign-people"
import { tsToMillis } from "@/lib/tasks"

const PREVIEW_LIMIT = 4

const modified = (item: { updatedAt?: unknown; createdAt?: unknown }) => tsToMillis(item.updatedAt) || tsToMillis(item.createdAt)

/** Home body: the latest posts and creators, each opening its company tab. */
export function HomeOverview() {
  const { company, sectionHref } = useCompanyPage()
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

  if (posts.length === 0 && creators.length === 0) {
    return <p className="text-sm text-muted-foreground">Posts and creators from this company&apos;s campaigns will show here.</p>
  }

  return (
    <>
      {posts.length > 0 && (
        <section aria-labelledby="home-posts-heading">
          <SectionHeader id="home-posts-heading" title="Latest posts" href={sectionHref("content")} />
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
                    href={sectionHref("content", { post: post.id })}
                    ariaLabel={`Open ${title}`}
                  />
                )
              })}
            </GridCardList>
          </div>
        </section>
      )}

      {creators.length > 0 && (
        <section aria-labelledby="home-creators-heading" className={posts.length > 0 ? "mt-8" : undefined}>
          <SectionHeader id="home-creators-heading" title="Leads" href={sectionHref("leads")} />
          <div className="mt-4">
            <GridCardList>
              {creators.slice(0, PREVIEW_LIMIT).map((person) => (
                <GridCard
                  key={person.id}
                  title={person.handle}
                  icon={<Users className="size-4 text-muted-foreground" aria-hidden="true" />}
                  preview={<CreatorThumbnail person={person} showMeta={false} />}
                  href={sectionHref("leads")}
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
