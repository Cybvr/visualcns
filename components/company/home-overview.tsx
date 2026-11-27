"use client"

import { useEffect, useState } from "react"
import { Users } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { SectionBody, SectionHeader } from "@/components/dashboard/section-header"
import { onRoster, watchCompanyCampaignPeople, type CampaignPerson } from "@/lib/campaign-people"
import { CreatorThumbnail } from "@/components/dashboard/campaign-people"
import { tsToMillis } from "@/lib/tasks"

const PREVIEW_LIMIT = 4

const modified = (item: { updatedAt?: unknown; createdAt?: unknown }) => tsToMillis(item.updatedAt) || tsToMillis(item.createdAt)

/** Home body: the latest leads, opening the Leads tab. */
export function HomeOverview() {
  const { company, sectionHref } = useCompanyPage()
  const [creators, setCreators] = useState<CampaignPerson[]>([])

  useEffect(() => watchCompanyCampaignPeople(
    company.id,
    (rows) => setCreators(rows.filter(onRoster).sort((a, b) => modified(b) - modified(a))),
    () => setCreators([]),
  ), [company.id])

  if (creators.length === 0) {
    return null
  }

  return (
    <>
      {creators.length > 0 && (
        <section aria-labelledby="home-creators-heading">
          <SectionHeader id="home-creators-heading" title="Leads" href={sectionHref("leads")} />
          <SectionBody className="mt-4">
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
          </SectionBody>
        </section>
      )}
    </>
  )
}
