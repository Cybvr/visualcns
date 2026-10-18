"use client"

import type { ComponentType } from "react"

import { Pulse } from "@/components/company/pulse"
import { CompanySettingsLayout } from "@/components/company/company-settings-layout"
import { CompanyBillings } from "@/components/company/company-billings"
import { useCompanyPage, type CompanySectionKey } from "@/components/company/company-page-context"
import { CompanyVisitors } from "@/components/company/company-visitors"
import { HomeOverview } from "@/components/company/home-overview"
import { AboutSection } from "@/components/company/sections/about-section"
import { ActivitySection } from "@/components/company/sections/activity-section"
import { AnalyticsSection } from "@/components/company/sections/analytics-section"
import { DocumentsSection } from "@/components/company/sections/documents-section"
import { ProjectsSection } from "@/components/company/sections/projects-section"
import { NgaiSection } from "@/components/company/sections/ngai-section"
import { TeamSection } from "@/components/company/sections/team-section"

/** Documents and media in one grid. An open document takes the whole page. */
function DriveSection() {
  return <DocumentsSection />
}

/** The company's VisualCNS subscription and plan billing. */
function BillingsSection() {
  return <CompanyBillings />
}

/** On the dashboard this tab is called Home: post, campaign and creator counts with the latest of each. */
function HomeActivitySection() {
  const { mode } = useCompanyPage()
  if (mode !== "tabs") return <ActivitySection />
  return (
    <div className="mt-5">
      <HomeOverview />
    </div>
  )
}

function VisitorsSection() {
  const { company, visitorAgencyId } = useCompanyPage()
  return <CompanyVisitors agencyId={visitorAgencyId} companyId={company.id} slug={company.slug || company.id} />
}

/** About, called Settings on the dashboard. The plan lives on Billings. */
function SettingsSection() {
  const { mode } = useCompanyPage()
  if (mode === "tabs") {
    return (
      <CompanySettingsLayout>
        <div className="min-w-0 max-w-xl">
          <AboutSection singleColumn />
        </div>
      </CompanySettingsLayout>
    )
  }
  return (
    <>
      <AboutSection />
    </>
  )
}

function PulseSection() {
  const { company, admin } = useCompanyPage()
  return (
    <>
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
  ngai: NgaiSection,
  analytics: AnalyticsSection,
  tasks: ProjectsSection,
  about: SettingsSection,
  team: TeamSection,
  activity: HomeActivitySection,
  pulse: PulseSection,
  documents: DriveSection,
  billings: BillingsSection,
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
