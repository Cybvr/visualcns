"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { isCompanySection, useCompanyPage } from "@/components/company/company-page-context"
import { CompanyProfileHeader } from "@/components/company/company-profile-header"
import { AboutSection } from "@/components/company/sections/about-section"
import { ActivitySection } from "@/components/company/sections/activity-section"

export default function CompanyHomePage() {
  const { company, people, sectionHref } = useCompanyPage()
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

  return (
    <>
      {/* The profile banner, logo and name, at every screen size, like a profile page on X. */}
      <CompanyProfileHeader
        name={company.name}
        handle={company.slug}
        description={company.description}
        categoryLabel={company.categoryLabel}
        logoUrl={company.logoUrl}
        coverUrl={company.media?.find((url) => url && url !== company.logoUrl)}
        location={company.location}
        website={company.website}
        linkedIn={company.linkedIn}
        contactCount={people.length}
      />
      {/* grid-cols-1 keeps the phone column at screen width; without it the column grows to fit the longest line. */}
      <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AboutSection singleColumn />
        <ActivitySection heading="Activity" prominent />
      </div>
    </>
  )
}
