"use client"

import type { ComponentType } from "react"

import { CompanySettingsLayout } from "@/components/company/company-settings-layout"
import { CompanyBillings } from "@/components/company/company-billings"
import { CustomersSection } from "@/components/company/sections/customers-section"
import { useCompanyPage, type CompanySectionKey } from "@/components/company/company-page-context"
import { CompanyVisitors } from "@/components/company/company-visitors"
import { HomeOverview } from "@/components/company/home-overview"
import { AboutSection, SettingsGroup } from "@/components/company/sections/about-section"
import { ActivitySection } from "@/components/company/sections/activity-section"
import { AnalyticsSection } from "@/components/company/sections/analytics-section"
import { DocumentsSection } from "@/components/company/sections/documents-section"
import { LeadsPage } from "@/components/company/sections/creators-section"
import { ContentSection } from "@/components/company/sections/content-section"
import { ProjectsSection } from "@/components/company/sections/projects-section"
import { SocialSection } from "@/components/company/sections/social-section"
import { NgaiSection } from "@/components/company/sections/ngai-section"
import { SitesSection } from "@/components/company/sections/sites-section"
import { DomainsSection } from "@/components/company/sections/domains-section"
import { TeamSection } from "@/components/company/sections/team-section"
import { AdsSection, AudiencesSection, CompetitorsSection, KeywordsSection, MarketingFlowSection, OutreachSection } from "@/components/company/sections/marketing-flow"
import { FinanceHomeSection, SecurityHomeSection, WebsitesHomeSection } from "@/components/company/sections/area-homes"

/** Documents and media in one grid. An open document takes the whole page. On the dashboard it's Artifacts, with assets in it too. */
function DriveSection() {
  const { mode } = useCompanyPage()
  return <DocumentsSection view={mode === "routes" ? "documents" : "artifacts"} />
}

/** Images and videos, uploaded or from campaigns. */
function AssetsSection() {
  return <DocumentsSection view="assets" />
}

/** The company's VisualCNS subscription and plan billing. */
function BillingsSection() {
  return <CompanyBillings />
}

/** On the dashboard this tab is called Home: the account card and details, the latest leads, then the team. */
function HomeActivitySection() {
  const { mode } = useCompanyPage()
  if (mode !== "tabs") return <ActivitySection />
  return (
    <div className="mx-auto mt-5 min-w-0 max-w-xl">
      <AboutSection singleColumn />
      <div className="mt-10 empty:hidden">
        <HomeOverview />
      </div>
      <div>
        <div className="relative mt-10">
          <SettingsGroup id="company-settings-team" title="Team">
            <TeamSection />
          </SettingsGroup>
        </div>
      </div>
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

/**
 * On the dashboard, Marketing: the campaigns, and under them the social media accounts.
 * One page, no switch. An open campaign takes the page on its own.
 */
function MarketingTabSection() {
  const { mode, canSeeVisitors, recordOpen } = useCompanyPage()
  if (mode === "routes") return <ProjectsSection />
  return (
    <>
      <ProjectsSection />
      {canSeeVisitors && !recordOpen && (
        <section aria-labelledby="marketing-social-heading" className="mt-10">
          <h2 id="marketing-social-heading" className="text-base font-semibold">Social media</h2>
          <SocialSection />
        </section>
      )}
    </>
  )
}

const SECTION_COMPONENTS: Record<CompanySectionKey, ComponentType> = {
  projects: MarketingTabSection,
  creators: LeadsPage,
  content: ContentSection,
  social: SocialSection,
  marketing: MarketingFlowSection,
  keywords: KeywordsSection,
  competitors: CompetitorsSection,
  audiences: AudiencesSection,
  leads: LeadsPage,
  outreach: OutreachSection,
  ads: AdsSection,
  "websites-home": WebsitesHomeSection,
  "finance-home": FinanceHomeSection,
  "security-home": SecurityHomeSection,
  ngai: NgaiSection,
  sites: SitesSection,
  domains: DomainsSection,
  analytics: AnalyticsSection,
  tasks: ProjectsSection,
  about: SettingsSection,
  team: TeamSection,
  activity: HomeActivitySection,
  documents: DriveSection,
  assets: AssetsSection,
  billings: BillingsSection,
  customers: CustomersSection,
  visitors: VisitorsSection,
}

/**
 * One company section's content. A section the viewer may not see (Visitors,
 * for someone outside the company) shows Projects instead.
 */
export function CompanySection({ section }: { section: CompanySectionKey }) {
  const { sections } = useCompanyPage()
  const Section = SECTION_COMPONENTS[sections.some((s) => s.key === section) ? section : (sections[0]?.key ?? "projects")]
  return <Section />
}
