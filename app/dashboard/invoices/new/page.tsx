"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { InvoiceBuilder } from "@/components/dashboard/invoice-builder"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { getEstimate, type Estimate } from "@/lib/billing"

export default function NewInvoicePage() {
  const router = useRouter()
  const { user, loading, isAdmin, isImpersonating } = useAuth()
  const searchParams = useSearchParams()
  const initialCompanyId = searchParams.get("companyId") ?? undefined
  const estimateId = searchParams.get("estimateId") ?? ""
  const allowed = isAdmin && !isImpersonating
  const [sourceEstimate, setSourceEstimate] = useState<Estimate | null>(null)
  const [sourceLoading, setSourceLoading] = useState(Boolean(estimateId))
  const [sourceError, setSourceError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user && !allowed) router.replace("/dashboard/invoices")
  }, [loading, user, allowed, router])

  useEffect(() => {
    if (!allowed || !estimateId) return
    let active = true
    getEstimate(estimateId)
      .then((estimate) => {
        if (!active) return
        if (estimate) setSourceEstimate(estimate)
        else setSourceError("That estimate could not be found.")
      })
      .catch(() => active && setSourceError("That estimate could not be loaded."))
      .finally(() => active && setSourceLoading(false))
    return () => { active = false }
  }, [allowed, estimateId])

  if (!user || loading || !allowed || sourceLoading) {
    return (
      <DashboardPageSkeleton variant="form" rows={5} />
    )
  }

  if (sourceError) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-9 sm:px-6"><p className="text-sm text-destructive">{sourceError}</p></main>
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-9">
      <InvoiceBuilder initialCompanyId={initialCompanyId} initialEstimate={sourceEstimate ?? undefined} />
    </main>
  )
}
