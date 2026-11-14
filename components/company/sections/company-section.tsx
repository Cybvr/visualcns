"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Pulse } from "@/components/company/pulse"
import { CompanySettingsLayout } from "@/components/company/company-settings-layout"
import { CompanyBillings } from "@/components/company/company-billings"
import { useCompanyPage, type CompanySectionKey } from "@/components/company/company-page-context"
import { CompanyVisitors } from "@/components/company/company-visitors"
import { HomeOverview } from "@/components/company/home-overview"
import { AboutSection, SettingsGroup } from "@/components/company/sections/about-section"
import { ActivitySection } from "@/components/company/sections/activity-section"
import { AnalyticsSection } from "@/components/company/sections/analytics-section"
import { DocumentsSection } from "@/components/company/sections/documents-section"
import { ProjectsSection } from "@/components/company/sections/projects-section"
import { SocialSection } from "@/components/company/sections/social-section"
import { NgaiSection } from "@/components/company/sections/ngai-section"
import { SitesSection } from "@/components/company/sections/sites-section"
import { TeamSection } from "@/components/company/sections/team-section"
import { cn } from "@/lib/utils"

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

/** About, called Account on the dashboard, with the team under it. The plan lives on Billings. */
function SettingsSection() {
  const { mode } = useCompanyPage()
  if (mode === "tabs") {
    return (
      <CompanySettingsLayout includeTeam>
        <div className="min-w-0 max-w-xl">
          <AboutSection singleColumn />
          <div className="relative mt-10">
            <SettingsGroup id="company-settings-team" title="Team">
              <TeamSection />
            </SettingsGroup>
          </div>
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
  social: SocialSection,
  ngai: NgaiSection,
  sites: SitesSection,
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
  const shown = sections.some((s) => s.key === section) ? section : "projects"
  const Section = SECTION_COMPONENTS[shown]
  if (shown !== "projects" && shown !== "social") return <Section />
  return (
    <>
      <MarketingTabs active={shown} />
      <Section />
    </>
  )
}

/** Marketing holds Campaigns and Social Media as two tabs. Hidden while a campaign or task is open. */
function MarketingTabs({ active }: { active: "projects" | "social" }) {
  const { sections, sectionHref } = useCompanyPage()
  const searchParams = useSearchParams()
  if (!sections.some((s) => s.key === "social")) return null
  if (searchParams?.get("campaign") || searchParams?.get("task")) return null
  const tabs = [
    { key: "projects" as const, label: "Campaigns" },
    { key: "social" as const, label: "Social Media" },
  ]
  return (
    <nav aria-label="Marketing" className="mt-4 flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={sectionHref(tab.key)}
          scroll={false}
          aria-current={active === tab.key ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            active === tab.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
