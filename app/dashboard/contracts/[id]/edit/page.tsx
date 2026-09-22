"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { ContractBuilder } from "@/components/dashboard/contract-builder"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { getContract, type Contract } from "@/lib/billing"

export default function EditContractPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""
  const { user, loading: authLoading, isAdmin, isImpersonating } = useAuth()
  const allowed = isAdmin && !isImpersonating

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!authLoading && user && !allowed) router.replace("/dashboard/contracts")
  }, [authLoading, user, allowed, router])

  useEffect(() => {
    if (!allowed || !id) return
    let active = true
    getContract(id)
      .then((found) => {
        if (!active) return
        if (found) setContract(found)
        else setMissing(true)
      })
      .catch(() => {
        if (active) setMissing(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [allowed, id])

  if (!user || authLoading || !allowed || loading) {
    return (
      <DashboardPageSkeleton variant="form" rows={5} />
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-9 sm:px-6">
      {missing ? (
        <p className="text-sm text-destructive">That contract no longer exists.</p>
      ) : (
        <ContractBuilder contract={contract} />
      )}
    </main>
  )
}
