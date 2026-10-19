"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Copy, Download, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

import { postMediaType } from "@/components/dashboard/campaign-creatives"
import { CreatorBriefSummary } from "@/components/dashboard/creator-brief"
import { ProjectCover } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { MediaLightbox, type MediaLightboxItem } from "@/components/ui/media-lightbox"
import { creativeStatus, watchCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { getOrganization, type Organization } from "@/lib/organizations"
import { hasBrief, resolveBrief } from "@/lib/campaign-brief"
import { getProject, type Project } from "@/lib/projects"

/** Approved posts only; drafts and posts still in review never leave the agency. */
function isReady(post: CampaignCreative) {
  return post.type === "text" && (creativeStatus(post) === "Approved" || Boolean(post.publish))
}

/**
 * No login required: a campaign page to hand to creators. The campaign, what
 * it's about, the approved posts with their captions to copy, and the media to
 * download. Nothing private from the client's page comes with it.
 */
export default function SharedCampaignPage() {
  const { id = "" } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [creatives, setCreatives] = useState<CampaignCreative[]>([])
  const [loading, setLoading] = useState(true)
  const [previewId, setPreviewId] = useState<string | null>(null)

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
    const stop = watchCampaignCreatives(id, (rows) => { if (active) setCreatives(rows) }, () => undefined)
    return () => {
      active = false
      stop()
    }
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16" role="status" aria-label="Loading campaign">
        <div className="mx-auto max-w-4xl space-y-6"><Skeleton className="aspect-[3/1] w-full rounded-2xl" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40 w-full" /></div>
      </main>
    )
  }

  if (!project || project.isArchived) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <p className="text-sm text-muted-foreground">This link is no longer available.</p>
      </main>
    )
  }

  const ready = creatives.filter(isReady)
  // When some posts are marked for creators, those are the ones to hand out.
  const forCreators = ready.filter((post) => post.postedBy === "Roster")
  const posts = forCreators.length ? forCreators : ready
  const media = creatives.filter((item) => (item.type === "image" || item.type === "video") && item.url)
  const previewItems: MediaLightboxItem[] = [
    ...posts.filter((post) => post.mediaUrl).map((post) => ({
      id: `post:${post.id}`,
      title: post.title || "Post",
      url: post.mediaUrl!,
      type: postMediaType(post),
    })),
    ...media.map((item) => ({
      id: `media:${item.id}`,
      title: item.title || (item.type === "video" ? "Video" : "Image"),
      url: item.url,
      type: item.type as "image" | "video",
    })),
  ]
  const clientName = organization?.name || project.client

  async function copyCaption(post: CampaignCreative) {
    try {
      await navigator.clipboard.writeText(post.body?.trim() || "")
      toast.success("Caption copied.")
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.")
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-5">
          <div className="aspect-[3/1] overflow-hidden rounded-2xl bg-muted">
            <ProjectCover project={project} />
          </div>
          <div>
            {clientName && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                {organization?.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={organization.logoUrl} alt="" className="size-6 rounded-full object-cover" />
                )}
                {clientName}
              </p>
            )}
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{project.title}</h1>
            {project.angle && <p className="mt-3 text-lg text-foreground">{project.angle}</p>}
            {project.about && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.about}</p>}
          </div>
        </header>

        {hasBrief(project.brief) && (
          <section aria-labelledby="shared-brief-heading" className="space-y-4 rounded-2xl bg-card p-5 sm:p-6">
            <h2 id="shared-brief-heading" className="text-lg font-semibold tracking-tight text-foreground">The brief</h2>
            <CreatorBriefSummary brief={resolveBrief(project.brief)} />
          </section>
        )}

        <section aria-labelledby="shared-posts-heading" className="space-y-4">
          <h2 id="shared-posts-heading" className="text-lg font-semibold tracking-tight text-foreground">Posts to share</h2>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts are ready yet. Check back soon.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {posts.map((post) => (
                <article key={post.id} className="flex flex-col overflow-hidden rounded-2xl bg-card">
                  {post.mediaUrl ? (
                    <button type="button" onClick={() => setPreviewId(`post:${post.id}`)} aria-label={`Preview ${post.title || "post"}`} className="flex aspect-square items-center justify-center overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                      {postMediaType(post) === "video"
                        ? <VideoThumbnail src={post.mediaUrl} />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={post.mediaUrl} alt="" loading="lazy" className="size-full object-cover" />}
                    </button>
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-muted">
                      <ImageIcon className="size-10 text-muted-foreground/45" aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <p className="text-sm font-medium text-foreground">{post.title || "Post"}</p>
                    {post.body?.trim() && <p className="flex-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{post.body.trim()}</p>}
                    <div className="flex flex-wrap gap-2">
                      {post.body?.trim() && (
                        <Button type="button" variant="outline" size="sm" onClick={() => void copyCaption(post)}>
                          <Copy className="size-4" aria-hidden="true" />
                          Copy caption
                        </Button>
                      )}
                      {post.mediaUrl && (
                        <Button asChild variant="outline" size="sm">
                          <a href={post.mediaUrl} target="_blank" rel="noreferrer" download>
                            <Download className="size-4" aria-hidden="true" />
                            Download {postMediaType(post) === "video" ? "video" : "image"}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {media.length > 0 && (
          <section aria-labelledby="shared-media-heading" className="space-y-4">
            <h2 id="shared-media-heading" className="text-lg font-semibold tracking-tight text-foreground">Media</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {media.map((item) => (
                <div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <button type="button" onClick={() => setPreviewId(`media:${item.id}`)} aria-label={`Preview ${item.title || item.type}`} className="size-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                    {item.type === "video"
                      ? <VideoThumbnail src={item.url} />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />}
                  </button>
                  <a href={item.url} target="_blank" rel="noreferrer" download aria-label={`Download ${item.title || item.type}`} className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-full bg-black/60 text-white outline-none transition-opacity hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white">
                    <Download className="size-4" aria-hidden="true" />
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-muted-foreground">Shared by VisualHQ</p>
      </div>
      <MediaLightbox items={previewItems} activeId={previewId} onChange={setPreviewId} />
    </main>
  )
}
