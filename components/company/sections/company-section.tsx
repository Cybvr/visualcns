"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { Megaphone } from "lucide-react"

import { Pulse } from "@/components/company/pulse"
import { CompanyMessages } from "@/components/company/company-messages"
import { CompanyPlan, useSubscription } from "@/components/company/company-plan"
import { useCompanyPage, type CompanySectionKey } from "@/components/company/company-page-context"
import { CompanyVisitors } from "@/components/company/company-visitors"
import { AboutSection } from "@/components/company/sections/about-section"
import { ActivitySection } from "@/components/company/sections/activity-section"
import { AnalyticsSection } from "@/components/company/sections/analytics-section"
import { DocumentsSection } from "@/components/company/sections/documents-section"
import { ProjectsSection } from "@/components/company/sections/projects-section"
import { NotesSection } from "@/components/company/sections/notes-section"
import { NgaiSection } from "@/components/company/sections/ngai-section"
import { TeamSection } from "@/components/company/sections/team-section"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ProjectCover } from "@/components/project-card"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"

/** Documents and media in one grid. An open document takes the whole page. */
function DriveSection() {
  return <DocumentsSection />
}

/** Invoices, estimates and contracts. */
function FinanceSection() {
  return <DocumentsSection scope="finance" />
}

const HOME_CAMPAIGN_LIMIT = 4

/** The latest campaigns as cards, at the top of the dashboard Home tab. */
function HomeCampaigns() {
  const { projects, sectionHref } = useCompanyPage()
  const modified = (project: (typeof projects)[number]) => tsToMillis(project.updatedAt) || tsToMillis(project.createdAt)
  const recent = [...projects].sort((a, b) => modified(b) - modified(a)).slice(0, HOME_CAMPAIGN_LIMIT)

  return (
    <div className="mt-5 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="sidebar-nav-label text-muted-foreground">Campaigns</h2>
        {projects.length > 0 && (
          <Link href={sectionHref("projects")} className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            View all
          </Link>
        )}
      </div>
      {recent.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No campaigns yet.</p>
      ) : (
        <div className="mt-3">
          <GridCardList single>
            {recent.map((project) => (
              <GridCard
                key={project.id}
                href={sectionHref("projects", { campaign: project.id })}
                ariaLabel={`Open ${project.title}`}
                title={project.title}
                subtitle={modified(project) ? formatTimestamp(modified(project)) : undefined}
                icon={<Megaphone className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                preview={<ProjectCover project={project} />}
              />
            ))}
          </GridCardList>
        </div>
      )}
    </div>
  )
}

/** On the dashboard this tab is called Home: campaigns first, then the activity list. */
function HomeActivitySection() {
  const { mode } = useCompanyPage()
  if (mode !== "tabs") return <ActivitySection />
  return (
    <>
      <HomeCampaigns />
      <ActivitySection heading="Activity" />
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

/** About, called Settings on the dashboard, where the plan sits too. On the public page the plan lives behind Upgrade in the sidebar. */
function SettingsSection() {
  const { canManageTeam, mode } = useCompanyPage()
  return (
    <>
      {canManageTeam && mode !== "routes" && <PlanPanel />}
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
  notes: NotesSection,
  about: SettingsSection,
  team: TeamSection,
  activity: HomeActivitySection,
  pulse: PulseSection,
  drive: DriveSection,
  finance: FinanceSection,
  messages: CompanyMessages,
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
