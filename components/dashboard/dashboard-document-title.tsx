"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { usePageHeaderOverride } from "@/components/dashboard/page-title-context"
import { dashboardPageTitle } from "@/lib/page-titles"

const APP_NAME = "VisualCNS"

function documentTitle(page: string, record: string | null | undefined, appName: string): string {
  return record && record !== page ? `${record} · ${page} | ${appName}` : `${page} | ${appName}`
}

export function DashboardDocumentTitle() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { override, recordTitle } = usePageHeaderOverride()
  // The tab ends with the agency's own name once it has loaded.
  const { agency } = useAuth()
  const appName = agency?.name?.trim() || APP_NAME

  useEffect(() => {
    const routeTitle = dashboardPageTitle(pathname ?? "/dashboard", searchParams)
    const pageTitle = override?.homeHref ? routeTitle : override?.title ?? routeTitle
    const activeRecordTitle = recordTitle || (override?.homeHref ? override.title : null)
    document.title = documentTitle(pageTitle, activeRecordTitle, appName)
  }, [appName, override?.homeHref, override?.title, pathname, recordTitle, searchParams])

  return null
}
