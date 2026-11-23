"use client"

import type { ComponentType } from "react"
import { useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

import { Pulse } from "@/components/company/pulse"
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
import { CreatorsSection } from "@/components/company/sections/creators-section"
import { ContentSection } from "@/components/company/sections/content-section"
import { ProjectsSection } from "@/components/company/sections/projects-section"
import { SocialSection } from "@/components/company/sections/social-section"
import { NgaiSection } from "@/components/company/sections/ngai-section"
import { SitesSection } from "@/components/company/sections/sites-section"
import { DomainsSection } from "@/components/company/sections/domains-section"
import { TeamSection } from "@/components/company/sections/team-section"
import { MarketingSettingsSection } from "@/components/company/sections/marketing-pages"
import { BusinessProfilePage, GoogleAdsPage, InsightsPage, ReviewsPage, SeoPage } from "@/components/company/sections/marketing-area"
import { MarketingOverviewSection } from "@/components/company/sections/marketing-home"
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

/**
 * On the dashboard, Marketing: Campaigns and Social Media as two views of one tab,
 * chosen by ?view=social. Old ?tab=social links land on the Social Media view.
 */
function MarketingTabSection() {
  const { mode, canSeeVisitors, updateParams, recordOpen } = useCompanyPage()
  const searchParams = useSearchParams()
  if (mode === "routes") return <ProjectsSection />
  const social = canSeeVisitors && (searchParams.get("view") === "social" || searchParams.get("tab") === "social")
  const views = [
    { key: "campaigns", label: "Campaigns", active: !social, onSelect: () => updateParams({ view: null, tab: "projects" }) },
    ...(canSeeVisitors ? [{ key: "social", label: "Social Media", active: social, onSelect: () => updateParams({ view: "social", tab: "projects", campaign: null, task: null }) }] : []),
  ]
  return (
    <>
      {/* An open campaign has its own header, so the switch steps aside. */}
      {!recordOpen && views.length > 1 && (
        <div role="tablist" aria-label="Marketing" className="mt-5 inline-flex rounded-full bg-muted p-1">
          {views.map((view) => (
            <button
              key={view.key}
              type="button"
              role="tab"
              aria-selected={view.active}
              onClick={view.onSelect}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                view.active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {view.label}
            </button>
          ))}
        </div>
      )}
      {social ? <SocialSection /> : <ProjectsSection />}
    </>
  )
}

const SECTION_COMPONENTS: Record<CompanySectionKey, ComponentType> = {
  projects: MarketingTabSection,
  creators: CreatorsSection,
  content: ContentSection,
  social: SocialSection,
  marketing: MarketingOverviewSection,
  "websites-home": WebsitesHomeSection,
  "finance-home": FinanceHomeSection,
  "security-home": SecurityHomeSection,
  "marketing-settings": MarketingSettingsSection,
  reviews: ReviewsPage,
  insights: InsightsPage,
  seo: SeoPage,
  "google-ads": GoogleAdsPage,
  "business-profile": BusinessProfilePage,
  ngai: NgaiSection,
  sites: SitesSection,
  domains: DomainsSection,
  analytics: AnalyticsSection,
  tasks: ProjectsSection,
  about: SettingsSection,
  team: TeamSection,
  activity: HomeActivitySection,
  pulse: PulseSection,
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
  const Section = SECTION_COMPONENTS[sections.some((s) => s.key === section) ? section : "projects"]
  return <Section />
}
