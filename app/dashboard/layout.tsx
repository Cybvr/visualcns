import { Suspense, type ReactNode } from "react"
import type { Metadata } from "next"
import { headers } from "next/headers"

import { DashboardDocumentTitle } from "@/components/dashboard/dashboard-document-title"
import { UnifiedDashboardLayout } from "@/components/unified-dashboard-layout"
import { dashboardRequestMetadata } from "@/lib/server/page-metadata"

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers()
  return dashboardRequestMetadata(
    requestHeaders.get("x-visualcns-pathname") || "/dashboard",
    requestHeaders.get("x-visualcns-search") || "",
    requestHeaders.get("x-agency-subdomain") || "",
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <UnifiedDashboardLayout>
      <Suspense fallback={null}><DashboardDocumentTitle /></Suspense>
      {children}
    </UnifiedDashboardLayout>
  )
}
