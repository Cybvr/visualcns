"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { InvoiceBuilder } from "@/components/dashboard/invoice-builder"

export default function NewInvoicePage() {
  const router = useRouter()
  const { user, loading, isAdmin, isImpersonating } = useAuth()
  const initialCompanyId = useSearchParams().get("companyId") ?? undefined
  const allowed = isAdmin && !isImpersonating

  useEffect(() => {
    if (!loading && user && !allowed) router.replace("/dashboard/invoices")
  }, [loading, user, allowed, router])

  if (!user || loading || !allowed) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-9 sm:px-6">
      <InvoiceBuilder initialCompanyId={initialCompanyId} />
    </main>
  )
}
