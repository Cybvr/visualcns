"use client"

import type { ComponentType } from "react"

import { BusinessHealth } from "@/components/company/business-health"
import { CompanyMedia } from "@/components/company/company-media"
import { useCompanyPage, type CompanySectionKey } from "@/components/company/company-page-context"
import { CompanyVisitors } from "@/components/company/company-visitors"
import { AboutSection } from "@/components/company/sections/about-section"
import { ActivitySection } from "@/components/company/sections/activity-section"
import { DocumentsSection } from "@/components/company/sections/documents-section"
import { ProjectsSection } from "@/components/company/sections/projects-section"
import { TasksSection } from "@/components/company/sections/tasks-section"
import { TeamSection } from "@/components/company/sections/team-section"

function MediaSection() {
  const { company, projects, admin, mediaAddOpen, setMediaAddOpen } = useCompanyPage()
  return (
    <div className="mt-5">
      <CompanyMedia
        logoUrl={company.logoUrl}
        projects={projects}
        uploaded={company.media ?? []}
        onUploadedChange={admin?.onMediaChange ? (urls) => void admin.onMediaChange?.(urls) : undefined}
        openAdd={mediaAddOpen}
        onOpenAddChange={setMediaAddOpen}
      />
    </div>
  )
}

function VisitorsSection() {
  const { company, visitorAgencyId } = useCompanyPage()
  return <CompanyVisitors agencyId={visitorAgencyId} companyId={company.id} slug={company.slug || company.id} />
}

function BusinessHealthSection() {
  const { company, admin } = useCompanyPage()
  return (
    <BusinessHealth
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
  )
}

const SECTION_COMPONENTS: Record<CompanySectionKey, ComponentType> = {
  projects: ProjectsSection,
  tasks: TasksSection,
  about: AboutSection,
  team: TeamSection,
  activity: ActivitySection,
  media: MediaSection,
  "brand-health": BusinessHealthSection,
  documents: DocumentsSection,
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
