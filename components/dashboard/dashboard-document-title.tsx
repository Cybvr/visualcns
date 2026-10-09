"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { usePageHeaderOverride } from "@/components/dashboard/page-title-context"
import { dashboardPageTitle } from "@/lib/page-titles"

const APP_NAME = "VisualCNS"

function documentTitle(page: string, record?: string | null): string {
  return record && record !== page ? `${record} · ${page} | ${APP_NAME}` : `${page} | ${APP_NAME}`
}

export function DashboardDocumentTitle() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { override, recordTitle } = usePageHeaderOverride()

  useEffect(() => {
    const routeTitle = dashboardPageTitle(pathname ?? "/dashboard", searchParams)
    const pageTitle = override?.homeHref ? routeTitle : override?.title ?? routeTitle
    const activeRecordTitle = recordTitle || (override?.homeHref ? override.title : null)
    document.title = documentTitle(pageTitle, activeRecordTitle)
  }, [override?.homeHref, override?.title, pathname, recordTitle, searchParams])

  return null
}
