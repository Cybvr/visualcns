"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { ContractBuilder } from "@/components/dashboard/contract-builder"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"

export default function NewContractPage() {
  const router = useRouter()
  const { user, loading, isAdmin, isImpersonating } = useAuth()
  const initialCompanyId = useSearchParams().get("companyId") ?? undefined
  const allowed = isAdmin && !isImpersonating

  useEffect(() => {
    if (!loading && user && !allowed) router.replace("/dashboard/contracts")
  }, [loading, user, allowed, router])

  if (!user || loading || !allowed) {
    return (
      <DashboardPageSkeleton variant="form" rows={5} />
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-9 sm:px-6">
      <ContractBuilder initialCompanyId={initialCompanyId} />
    </main>
  )
}
