"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { isCompanySection, useCompanyPage } from "@/components/company/company-page-context"
import { ActivitySection } from "@/components/company/sections/activity-section"
import { ProjectCover } from "@/components/project-card"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"

export default function CompanyHomePage() {
  const { company, sectionHref } = useCompanyPage()
  const { user, appUser } = useAuth()
  const firstName = (appUser?.displayName || user?.displayName || "").trim().split(/\s+/)[0]
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirected = useRef(false)

  // Older links put the section in ?tab=, and shared document links used /{slug}?doc=.
  // Task links intentionally stay on this page so TaskDetailSheet can open in place.
  const tab = searchParams.get("tab")
  const legacySettings = tab === "about"
  const legacySection = tab === "media" || tab === "documents" || tab === "finance" || tab === "drive" || tab === "notes"
    ? "documents"
    : isCompanySection(tab) && tab !== "about"
      ? tab
      : searchParams.get("doc")
        ? "documents"
        : null

  useEffect(() => {
    if ((!legacySection && !legacySettings) || redirected.current) return
    redirected.current = true
    const query = Object.fromEntries(searchParams.entries())
    delete query.tab
    if (legacySettings) {
      const homePath = sectionHref("about").split("?")[0]
      const nextSearch = new URLSearchParams(query).toString()
      router.replace(`${homePath}/settings${nextSearch ? `?${nextSearch}` : ""}`)
      return
    }
    router.replace(sectionHref(legacySection!, query))
  }, [legacySection, legacySettings, router, searchParams, sectionHref])

  if (legacySection || legacySettings) return null

  return (
    <>
      <HomeBanner coverUrl={company.media?.find((url) => url && url !== company.logoUrl)} />
      <h1 className="surface-record-title mt-2 mb-4 truncate">
        {firstName ? `Welcome back, ${firstName}` : `Welcome to ${company.name}`}
      </h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <CampaignColumn />
        <div className="min-w-0">
          <ActivitySection heading="Activity" prominent listLayout="rows" preview />
        </div>
      </div>
    </>
  )
}

/** The cover image across the top of the home page, or a soft gradient when there isn't one. */
function HomeBanner({ coverUrl }: { coverUrl?: string }) {
  return (
    <div className="relative mb-2 h-[104px] overflow-hidden rounded-[14px] border border-border bg-[linear-gradient(120deg,#FBEFE2_0%,#FBE6E9_50%,#E6F3E8_100%)] dark:bg-[linear-gradient(120deg,#2a211c_0%,#2b1f24_50%,#1c2a20_100%)] md:h-44 md:rounded-2xl">
      {coverUrl && (
        // Uploaded media is user-controlled, so keep this as a plain image rather than requiring host allowlisting.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
      )}
    </div>
  )
}

const CAMPAIGN_PREVIEW_LIMIT = 3

/** The company's campaigns as stacked horizontal cards, newest change first. */
function CampaignColumn() {
  const { projects, sectionHref } = useCompanyPage()
  const modified = (project: (typeof projects)[number]) => tsToMillis(project.updatedAt) || tsToMillis(project.createdAt)
  const sorted = [...projects].sort((a, b) => modified(b) - modified(a))

  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="surface-section-label py-2">Campaigns</h2>
        {sorted.length > 0 && (
          <Link href={sectionHref("projects")} className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            View all
          </Link>
        )}
      </div>
      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No campaigns yet.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          {sorted.slice(0, CAMPAIGN_PREVIEW_LIMIT).map((project) => (
            <Link
              key={project.id}
              href={sectionHref("projects", { campaign: project.id })}
              className="flex items-center gap-4 rounded-2xl bg-muted/60 p-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-background sm:w-36">
                <ProjectCover project={project} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-foreground">{project.title}</p>
                {project.service && <p className="mt-0.5 truncate text-sm text-muted-foreground">{project.service}</p>}
                {modified(project) > 0 && <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(modified(project))}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
