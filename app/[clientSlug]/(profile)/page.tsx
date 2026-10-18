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
      <HomeBanner coverUrl={company.media?.find((url) => url && url !== company.logoUrl)} />
      <h1 className="surface-record-title mt-2 mb-4 truncate">
        {firstName ? `Welcome back, ${firstName}` : `Welcome to ${company.name}`}
      </h1>
      <HomeOverview />
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
