"use client"

import { useEffect, useMemo, useState } from "react"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { CampaignGroupHeader } from "@/components/company/sections/campaign-group-header"
import { CampaignCreatives } from "@/components/dashboard/campaign-creatives"
import { Skeleton } from "@/components/ui/skeleton"
import { watchCompanyCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { isProjectArchived } from "@/lib/projects"

/**
 * Content, at company level: every campaign's posts on one page, grouped by campaign,
 * with the same writing, picture picking and review the campaign used to have.
 */
export function ContentSection() {
  const { company, projects, admin } = useCompanyPage()
  const { appUser } = useAuth()
  const [creatives, setCreatives] = useState<CampaignCreative[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    return watchCompanyCampaignCreatives(
      company.id,
      (rows) => { setCreatives(rows); setLoaded(true) },
      () => { setCreatives([]); setLoaded(true) },
    )
  }, [company.id])

  // Live campaigns first; archived ones only if they have posts.
  const campaigns = useMemo(() => [...projects]
    .filter((project) => !isProjectArchived(project) || creatives.some((item) => item.projectId === project.id && item.type === "text"))
    .sort((a, b) => Number(isProjectArchived(a)) - Number(isProjectArchived(b))), [projects, creatives])

  const canEdit = Boolean(admin)
  const canReview = !admin && appUser?.companyId === company.id
  const companyRef = company.slug || company.id

  if (!loaded) {
    return (
      <div className="mt-5 space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Skeleton className="aspect-square rounded-xl" /><Skeleton className="aspect-square rounded-xl" /><Skeleton className="aspect-square rounded-xl" /></div>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return <p className="mt-8 text-sm text-muted-foreground">Posts are written for campaigns. Start a campaign to add content.</p>
  }

  return (
    <div className="mt-5 space-y-10">
      {campaigns.map((project) => {
        const own = creatives.filter((item) => item.projectId === project.id)
        return (
          <section key={project.id} aria-label={project.title} className="space-y-3">
            <CampaignGroupHeader project={project} />
            <CampaignCreatives
              kind="content"
              creatives={own.filter((item) => item.type === "text")}
              library={own.filter((item) => item.type !== "text" && item.type !== "folder")}
              agencyId={project.agencyId}
              companyId={project.companyId || company.id}
              projectId={project.id}
              canEdit={canEdit}
              canReview={canReview}
              sharePath={canEdit ? (post) => `/${encodeURIComponent(companyRef)}/content?post=${encodeURIComponent(post.id)}` : undefined}
            />
          </section>
        )
      })}
    </div>
  )
}
