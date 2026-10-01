"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { isCompanySection, useCompanyPage } from "@/components/company/company-page-context"
import { AboutSection } from "@/components/company/sections/about-section"
import { ActivitySection } from "@/components/company/sections/activity-section"

export default function CompanyHomePage() {
  const { company, sectionHref } = useCompanyPage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirected = useRef(false)

  // Older links put the section in ?tab=, and shared task links were /{slug}?task={id}.
  const tab = searchParams.get("tab")
  const legacySection = isCompanySection(tab) && tab !== "about" ? tab : searchParams.get("task") ? "tasks" : null

  useEffect(() => {
    if (!legacySection || redirected.current) return
    redirected.current = true
    const query = Object.fromEntries(searchParams.entries())
    delete query.tab
    router.replace(sectionHref(legacySection, query))
  }, [legacySection, router, searchParams, sectionHref])

  if (legacySection) return null
  const coverUrl = company.media?.find((url) => url && url !== company.logoUrl)

  return (
    <>
      <div className="relative hidden h-44 overflow-hidden rounded-2xl border border-border bg-[linear-gradient(120deg,#FBEFE2_0%,#FBE6E9_50%,#E6F3E8_100%)] dark:bg-[linear-gradient(120deg,#2a211c_0%,#2b1f24_50%,#1c2a20_100%)] md:block">
        {coverUrl && (
          // Uploaded media can be hosted outside the configured image domains.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
        )}
      </div>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AboutSection singleColumn />
        <ActivitySection heading="Activity" prominent />
      </div>
    </>
  )
}
