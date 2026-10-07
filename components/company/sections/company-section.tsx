"use client"

import type { ComponentType } from "react"
import { useSearchParams } from "next/navigation"

import { Pulse } from "@/components/company/pulse"
import { CompanyMedia } from "@/components/company/company-media"
import { CompanyPlan, useSubscription } from "@/components/company/company-plan"
import { useCompanyPage, type CompanySectionKey } from "@/components/company/company-page-context"
import { CompanyVisitors } from "@/components/company/company-visitors"
import { AboutSection } from "@/components/company/sections/about-section"
import { ActivitySection } from "@/components/company/sections/activity-section"
import { DocumentsSection } from "@/components/company/sections/documents-section"
import { ProjectsSection } from "@/components/company/sections/projects-section"
import { TasksSection } from "@/components/company/sections/tasks-section"
import { TeamSection } from "@/components/company/sections/team-section"

function MediaSection() {
  const { company, projects, admin } = useCompanyPage()
  return (
    <div className="mt-5">
      <CompanyMedia
        logoUrl={company.logoUrl}
        projects={projects}
        uploaded={company.media ?? []}
        onUploadedChange={admin?.onMediaChange ? (urls) => void admin.onMediaChange?.(urls) : undefined}
      />
    </div>
  )
}

/** Documents and media together. An open document takes the whole page. */
function DriveSection() {
  const searchParams = useSearchParams()
  return (
    <>
      <DocumentsSection />
      {!searchParams.get("doc") && <MediaSection />}
    </>
  )
}

function VisitorsSection() {
  const { company, visitorAgencyId } = useCompanyPage()
  return <CompanyVisitors agencyId={visitorAgencyId} companyId={company.id} slug={company.slug || company.id} />
}

/** Shown to the company's own people and the agency, so they can see and change their plan. */
function PlanPanel() {
  const { company } = useCompanyPage()
  const billing = useSubscription(company.id)
  return <CompanyPlan companyId={company.id} billing={billing} className="mt-5" />
}

function PulseSection() {
  const { company, admin, canManageTeam } = useCompanyPage()
  return (
    <>
      {canManageTeam && <PlanPanel />}
      <Pulse
        companyId={company.id}
        details={{
          name: company.name,
          logoUrl: company.logoUrl,
          website: company.website,
          industry: company.industry,
          description: company.description,
          targetCustomers: company.targetCustomers,
          location: company.location,
        }}
        onSave={admin?.onUpdateCompany}
      />
    </>
  )
}

const SECTION_COMPONENTS: Record<CompanySectionKey, ComponentType> = {
  projects: ProjectsSection,
  tasks: TasksSection,
  about: AboutSection,
  team: TeamSection,
  activity: ActivitySection,
  pulse: PulseSection,
  drive: DriveSection,
  visitors: VisitorsSection,
}

/**
 * One company section's content. A section the viewer may not see (Visitors,
 * for someone outside the company) shows Projects instead.
 */
export function CompanySection({ section }: { section: CompanySectionKey }) {
  const { sections } = useCompanyPage()
  const Section = SECTION_COMPONENTS[sections.some((s) => s.key === section) ? section : "projects"]
  return <Section />
}
