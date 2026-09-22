"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { InvoiceBuilder } from "@/components/dashboard/invoice-builder"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { getInvoice, type Invoice } from "@/lib/billing"

export default function EditInvoicePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""
  const { user, loading: authLoading, isAdmin, isImpersonating } = useAuth()
  const allowed = isAdmin && !isImpersonating

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!authLoading && user && !allowed) router.replace("/dashboard/invoices")
  }, [authLoading, user, allowed, router])

  useEffect(() => {
    if (!allowed || !id) return
    let active = true
    getInvoice(id)
      .then((found) => {
        if (!active) return
        if (found) setInvoice(found)
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
        <p className="text-sm text-destructive">That invoice no longer exists.</p>
      ) : (
        <InvoiceBuilder invoice={invoice} />
      )}
    </main>
  )
}
