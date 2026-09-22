"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { EstimateBuilder } from "@/components/dashboard/estimate-builder"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"

export default function NewEstimatePage() {
  const router = useRouter()
  const { user, loading, isAdmin, isImpersonating } = useAuth()
  const initialCompanyId = useSearchParams().get("companyId") ?? undefined
  const allowed = isAdmin && !isImpersonating

  useEffect(() => {
    if (!loading && user && !allowed) router.replace("/dashboard/estimates")
  }, [allowed, loading, router, user])

  if (!user || loading || !allowed) {
    return <DashboardPageSkeleton variant="form" rows={5} />
  }

  return <main className="mx-auto w-full max-w-6xl px-4 py-9 sm:px-6"><EstimateBuilder initialCompanyId={initialCompanyId} /></main>
}
