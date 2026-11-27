"use client"

import { useEffect, useMemo, useState } from "react"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { MarketingLeads } from "@/components/company/sections/marketing-flow"
import { CampaignGroupHeader } from "@/components/company/sections/campaign-group-header"
import { CampaignPeople } from "@/components/dashboard/campaign-people"
import { Skeleton } from "@/components/ui/skeleton"
import { watchCompanyCampaignPeople, type CampaignPerson } from "@/lib/campaign-people"
import { isProjectArchived } from "@/lib/projects"

/**
 * Leads, at company level: the Marketing run's companies and decision makers,
 * then every campaign's people grouped by campaign, with adding, matching and reviewing.
 */
export function LeadsPage() {
  const { company, projects, admin } = useCompanyPage()
  const { appUser } = useAuth()
  const [people, setPeople] = useState<CampaignPerson[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    return watchCompanyCampaignPeople(
      company.id,
      (rows) => { setPeople(rows); setLoaded(true) },
      () => { setPeople([]); setLoaded(true) },
    )
  }, [company.id])

  // Live campaigns first, newest first; archived ones only if they have creators.
  const campaigns = useMemo(() => [...projects]
    .filter((project) => !isProjectArchived(project) || people.some((person) => person.projectId === project.id))
    .sort((a, b) => Number(isProjectArchived(a)) - Number(isProjectArchived(b))), [projects, people])

  const canEdit = Boolean(admin)
  const canReview = !admin && appUser?.companyId === company.id

  if (!loaded) {
    return (
      <div className="mt-5 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-10">
      <section aria-label="Marketing" className="space-y-3">
        <h2 className="min-w-0 truncate text-base font-semibold">Marketing</h2>
        <MarketingLeads />
      </section>
      {campaigns.map((project) => (
        <section key={project.id} aria-label={project.title} className="space-y-3">
          <CampaignGroupHeader project={project} />
          <CampaignPeople
            people={people.filter((person) => person.projectId === project.id)}
            agencyId={project.agencyId}
            companyId={project.companyId || company.id}
            projectId={project.id}
            projectName={project.title}
            canEdit={canEdit}
            canReview={canReview}
          />
        </section>
      ))}
    </div>
  )
}
