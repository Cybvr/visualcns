"use client"

import { useEffect, useState } from "react"

import { AnalyticsSkeleton, AnalyticsView } from "@/components/company/analytics-view"
import { useCompanyPage } from "@/components/company/company-page-context"
import { watchCompanyCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { onRoster, watchCompanyCampaignPeople, type CampaignPerson } from "@/lib/campaign-people"

/** Client-wide analytics at /{companySlug}/analytics. */
export function AnalyticsSection() {
  const { company, projects, invoices } = useCompanyPage()
  const [people, setPeople] = useState<CampaignPerson[]>([])
  const [content, setContent] = useState<CampaignCreative[]>([])
  const [peopleLoaded, setPeopleLoaded] = useState(false)
  const [contentLoaded, setContentLoaded] = useState(false)

  useEffect(() => {
    setPeopleLoaded(false)
    return watchCompanyCampaignPeople(
      company.id,
      (rows) => { setPeople(rows.filter(onRoster)); setPeopleLoaded(true) },
      () => { setPeople([]); setPeopleLoaded(true) },
    )
  }, [company.id])

  useEffect(() => {
    setContentLoaded(false)
    return watchCompanyCampaignCreatives(
      company.id,
      (rows) => { setContent(rows.filter((item) => item.type === "text")); setContentLoaded(true) },
      () => { setContent([]); setContentLoaded(true) },
    )
  }, [company.id])

  if (!peopleLoaded || !contentLoaded) {
    return <div className="mt-5"><AnalyticsSkeleton scope="company" /></div>
  }

  return (
    <div className="mt-5">
      <AnalyticsView
        scope={{ type: "company", companyId: company.id }}
        people={people}
        content={content}
        invoices={invoices}
        campaigns={projects.map((project) => ({ id: project.id, title: project.title }))}
      />
    </div>
  )
}
