"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { isCompanySection, useCompanyPage } from "@/components/company/company-page-context"
import { HomeOverview } from "@/components/company/home-overview"

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
      <h1 className="surface-record-title mt-2 mb-4 truncate">
        {firstName ? `Welcome back, ${firstName}` : `Welcome to ${company.name}`}
      </h1>
      <HomeOverview />
    </>
  )
}
