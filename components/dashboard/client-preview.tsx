"use client"

import { Suspense } from "react"

import { CompanyDashboardView } from "@/components/dashboard/company-dashboard-view"
import { CompanyProvider, useCompanyState } from "@/components/dashboard/company-context"
import { Skeleton } from "@/components/ui/skeleton"

function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4"><Skeleton className="size-14 rounded-xl" /><Skeleton className="h-6 w-48" /></div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function ClientPaneBody({ companyRef, href }: { companyRef: string; href: string }) {
  const { loading, error, client } = useCompanyState()
  if (loading) return <Loading />
  if (error || !client) return <p className="text-sm text-muted-foreground">{error ?? "This client could not be loaded."}</p>
  return <CompanyDashboardView embedded editHref={`${href}/edit`} keepParams={{ client: companyRef }} />
}

/** The full client page, tabs and all, inside the clients split view. Tabs stay in the URL beside ?client=. */
export function ClientPreview({ companyRef, href }: { companyRef: string; href: string }) {
  return (
    <CompanyProvider key={companyRef} companyRef={companyRef}>
      <Suspense fallback={<Loading />}>
        <ClientPaneBody companyRef={companyRef} href={href} />
      </Suspense>
    </CompanyProvider>
  )
}
