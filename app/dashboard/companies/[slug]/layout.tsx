"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { CompanyBanner } from "@/components/company/company-banner"
import { CompanyProvider, useCompanyState } from "@/components/dashboard/company-context"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import type { Project } from "@/lib/projects"

function CompanyLayoutBody({ children }: { children: ReactNode }) {
  const { loading, error, client, organization, workspaceId, name, categoryLabel } = useCompanyState()
  const pathname = usePathname()
  const isEditRoute = pathname?.endsWith("/edit") ?? false

  usePageTitle(!loading && client ? name : null, "/dashboard/clients")

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <DashboardPageSkeleton variant="detail" />
      </main>
    )
  }

  if (error || !client) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Link>
        <p className="mt-8 text-sm text-muted-foreground">{error ?? "This client could not be loaded."}</p>
      </main>
    )
  }

  if (!isEditRoute) return <>{children}</>

  const coverProject: Project = {
    id: client.uid,
    companyId: workspaceId,
    client: name,
    title: name,
    service: "",
    status: "in-progress",
    progress: 0,
    dueDate: "",
    thumbnailUrl: organization?.logoUrl || client.photoURL,
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <CompanyBanner name={name} categoryLabel={categoryLabel} coverProject={coverProject} />
      <div className="mt-6">{children}</div>
    </main>
  )
}

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <CompanyProvider>
      <CompanyLayoutBody>{children}</CompanyLayoutBody>
    </CompanyProvider>
  )
}
