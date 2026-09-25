"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { EstimateDocument } from "@/components/dashboard/estimate-document"
import { EstimateBuilder } from "@/components/dashboard/estimate-builder"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { getEstimate, type Estimate } from "@/lib/billing"

export default function EstimateDetailPage() {
  const { id = "" } = useParams<{ id: string }>()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const adminView = isAdmin && !isImpersonating
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  usePageTitle(estimate ? (estimate.title || estimate.estimateNumber || "Estimate") : null, "/dashboard/estimates")

  useEffect(() => {
    if (!id || !user || !appUser) return
    let active = true
    Promise.all([getEstimate(id), getBusinessProfile()])
      .then(([record, profile]) => {
        if (!active) return
        const visible = record && (adminView || (record.companyId === appUser.companyId && record.status !== "draft"))
        setEstimate(visible ? record : null)
        setIssuer(profile)
      })
      .catch((error) => {
        console.error("Error loading estimate:", error)
        if (active) setFailed(true)
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [adminView, appUser, id, user])

  if (!user) return null
  if (loading) return <DashboardPageSkeleton variant="detail" />
  if (failed || !estimate) return <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6"><Link href="/dashboard/estimates" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />Back to estimates</Link><p className="mt-12 text-sm text-muted-foreground">This estimate couldn’t be found or you don’t have access to it.</p></main>

  if (adminView) {
    return (
      <main className="mx-auto w-full max-w-6xl px-3 py-2 sm:px-6 sm:py-9">
        <EstimateBuilder estimate={estimate} />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <Link href="/dashboard/estimates" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />Back to estimates</Link>
        <DocumentActions />
      </div>
      <EstimateDocument estimate={estimate} issuer={issuer ?? undefined} />
    </main>
  )
}
