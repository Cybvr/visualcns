"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Copy, Pencil, Receipt } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { EstimateDocument } from "@/components/dashboard/estimate-document"
import { usePageTitle } from "@/components/dashboard/page-title-context"
import { Button } from "@/components/ui/button"
import { ContextualEmailButton } from "@/components/dashboard/contextual-email-button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { getEstimate, type Estimate } from "@/lib/billing"
import { portalDocumentPath } from "@/lib/portal-model"

export default function EstimateDetailPage() {
  const { id = "" } = useParams<{ id: string }>()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const adminView = isAdmin && !isImpersonating
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

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

  const sharePath = `/share/estimates/${encodeURIComponent(estimate.id)}`
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : sharePath
  const emailContext = {
    companyId: estimate.companyId,
    companyName: estimate.client,
    recipientEmail: estimate.preparedFor?.email,
    recipientName: estimate.preparedFor?.name,
    projectId: estimate.projectId,
    projectName: estimate.project,
    documentType: "estimate",
    documentId: estimate.id,
    documentTitle: estimate.title || estimate.estimateNumber,
    subject: `Estimate ${estimate.estimateNumber}`,
    ctaText: "Review estimate",
    ctaUrl: portalDocumentPath(estimate.companyId, "estimate", estimate.id),
  }

  async function copyEstimateLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Estimate link copied")
    } catch {
      toast.error("The estimate link could not be copied.")
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/estimates" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />Back to estimates</Link>
        <div className="flex items-center gap-2">
          {adminView && <Button asChild variant="outline" size="sm"><Link href={`/dashboard/estimates/${estimate.id}/edit`}><Pencil className="size-3.5" aria-hidden="true" />Edit estimate</Link></Button>}
          {adminView && <Button asChild variant="outline" size="sm"><Link href={`/dashboard/invoices/new?estimateId=${encodeURIComponent(estimate.id)}`}><Receipt className="size-3.5" aria-hidden="true" />Convert to invoice</Link></Button>}
          <DocumentActions onShare={adminView ? () => setShareOpen(true) : undefined} />
        </div>
      </div>
      <EstimateDocument estimate={estimate} issuer={issuer ?? undefined} />

      {adminView && (
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Share estimate</DialogTitle>
              <DialogDescription>Send this estimate to the client or copy its public link.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium">Ready to send?</p>
                <p className="mt-1 text-sm text-muted-foreground">Open the email composer with this estimate already attached.</p>
                <ContextualEmailButton
                  label="Send estimate"
                  context={emailContext}
                  className="mt-3 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimate-public-link">Public link</Label>
                {estimate.shareEnabled ? (
                  <div className="flex gap-2">
                    <Input id="estimate-public-link" readOnly value={shareUrl} onClick={(event) => event.currentTarget.select()} className="min-w-0 text-xs" />
                    <Button type="button" variant="outline" onClick={() => void copyEstimateLink()}>
                      <Copy className="size-3.5" aria-hidden="true" />
                      Copy
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Public sharing is off. Turn it on in Edit estimate to create a client link.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShareOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
}
