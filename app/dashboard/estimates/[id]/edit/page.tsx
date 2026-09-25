"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { EstimateBuilder } from "@/components/dashboard/estimate-builder"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { getEstimate, type Estimate } from "@/lib/billing"

export default function EditEstimatePage() {
  const router = useRouter()
  const { id = "" } = useParams<{ id: string }>()
  const { user, loading: authLoading, isAdmin, isImpersonating } = useAuth()
  const allowed = isAdmin && !isImpersonating
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!authLoading && user && !allowed) router.replace("/dashboard/estimates")
  }, [allowed, authLoading, router, user])

  useEffect(() => {
    if (!allowed || !id) return
    let active = true
    getEstimate(id)
      .then((found) => {
        if (!active) return
        if (found) setEstimate(found)
        else setMissing(true)
      })
      .catch(() => active && setMissing(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [allowed, id])

  if (!user || authLoading || !allowed || loading) {
    return <DashboardPageSkeleton variant="form" rows={5} />
  }

  return <main className="mx-auto w-full max-w-6xl px-3 py-2 sm:px-6 sm:py-9">{missing ? <p className="text-sm text-destructive">That estimate no longer exists.</p> : <EstimateBuilder estimate={estimate} />}</main>
}
