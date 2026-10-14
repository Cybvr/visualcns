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

function ClientPaneBody({ companyRef, onBack }: { companyRef: string; onBack: () => void }) {
  const { loading, error, client } = useCompanyState()
  if (loading) return <Loading />
  if (error || !client) return <p className="text-sm text-muted-foreground">{error ?? "This client could not be loaded."}</p>
  return <CompanyDashboardView embedded keepParams={{ client: companyRef }} onBack={onBack} />
}

/** The full client page, tabs and all, inside the clients split view. Tabs stay in the URL beside ?client=. */
export function ClientPreview({ companyRef, onBack }: { companyRef: string; onBack: () => void }) {
  return (
    <CompanyProvider key={companyRef} companyRef={companyRef}>
      <Suspense fallback={<Loading />}>
        <ClientPaneBody companyRef={companyRef} onBack={onBack} />
      </Suspense>
    </CompanyProvider>
  )
}
