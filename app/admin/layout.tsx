import { Suspense, type ReactNode } from "react"
import type { Metadata } from "next"

import { DashboardDocumentTitle } from "@/components/dashboard/dashboard-document-title"
import { UnifiedDashboardLayout } from "@/components/unified-dashboard-layout"

// Static on purpose: reading the request here made every dashboard route render on the server,
// so each click waited on it. DashboardDocumentTitle names the tab in the browser instead.
export const metadata: Metadata = {
  title: { default: "Dashboard | VisualCNS", template: "%s | VisualCNS" },
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <UnifiedDashboardLayout>
      <Suspense fallback={null}><DashboardDocumentTitle /></Suspense>
      {children}
    </UnifiedDashboardLayout>
  )
}
