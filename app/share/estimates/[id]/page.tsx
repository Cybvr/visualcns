"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { EstimateAcceptButton } from "@/components/dashboard/estimate-accept-button"
import { EstimateDocument } from "@/components/dashboard/estimate-document"
import { Skeleton } from "@/components/ui/skeleton"
import { getEstimate, type Estimate } from "@/lib/billing"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"

export default function SharedEstimatePage() {
  const { id = "" } = useParams<{ id: string }>()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let active = true
    getEstimate(id)
      .then(async (record) => {
        if (!active) return
        const visible = record?.shareEnabled ? record : null
        setEstimate(visible)
        if (!active) return
        setLoading(false)
        // The issuer header is nice-to-have on top of the estimate itself, so
        // a failure here never blocks the document from showing.
        try {
          setIssuer(await getBusinessProfile())
        } catch {
          // Header just stays without issuer details.
        }
      })
      .catch(() => {
        if (active) {
          setEstimate(null)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16" role="status" aria-label="Loading shared estimate">
        <div className="mx-auto max-w-5xl space-y-6"><Skeleton className="h-10 w-28" /><Skeleton className="h-9 w-2/3" /><Skeleton className="h-[32rem] w-full rounded-xl" /></div>
      </main>
    )
  }

  if (!estimate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <p className="text-sm text-muted-foreground">This link is no longer available.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex justify-end print:hidden">
          <DocumentActions title={`${estimate.client} Estimate ${estimate.estimateNumber}`} />
        </div>
        <EstimateDocument
          estimate={estimate}
          issuer={issuer ?? undefined}
          acceptanceAction={(estimate.status === "sent" || estimate.status === "accepted") ? (
            <EstimateAcceptButton
              estimateId={estimate.id}
              status={estimate.status}
              onAccepted={() => setEstimate((current) => current ? { ...current, status: "accepted" } : current)}
            />
          ) : undefined}
        />
        <p className="mt-6 text-center text-xs text-muted-foreground print:hidden">
          Shared by {issuer?.name ?? "VisualCNS"} · {issuer?.website ?? "visualcns.com"}
        </p>
      </div>
    </main>
  )
}
