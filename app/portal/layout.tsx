import { Suspense, type ReactNode } from "react"
import type { Metadata } from "next"
import { PortalShell, PortalLoading } from "@/components/portal/portal-shell"

export const metadata: Metadata = { title: "Company page | VisualCNS", robots: { index: false, follow: false } }
export default function PortalLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PortalLoading />}><PortalShell>{children}</PortalShell></Suspense>
}
