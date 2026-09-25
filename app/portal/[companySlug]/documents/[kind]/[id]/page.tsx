"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { usePortal } from "@/components/portal/portal-provider"
import { PortalNotice } from "@/components/portal/portal-shell"
import { PortalShellLayout, SignInPrompt } from "@/components/portal/portal-workspace"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { ContractDocument } from "@/components/dashboard/contract-document"
import { EstimateDocument } from "@/components/dashboard/estimate-document"
import { CompanyDocumentView } from "@/components/dashboard/company-document-view"
import { EstimateAcceptButton } from "@/components/dashboard/estimate-accept-button"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { portalPath, safeExternalUrl } from "@/lib/portal-model"

export default function PortalDocumentPage() {
  const { companySlug, kind, id } = useParams<{ companySlug: string; kind: string; id: string }>()
  const data = usePortal()
  const { isAdmin } = useAuth()
  const [issuer, setIssuer] = useState<BusinessProfile>()
  useEffect(() => {
    // Share-link visitors can't read agency records directly; the link already carried the issuer.
    if (data.publicView) { setIssuer(data.issuer); return }
    let active = true; getBusinessProfile().then(value => { if (active && value) setIssuer(value) }).catch(() => {}); return () => { active = false } }, [data.publicView, data.issuer])
  const invoice = kind === "invoice" ? data.invoices.find(item => item.id === id) : undefined
  const contract = kind === "contract" ? data.contracts.find(item => item.id === id) : undefined
  const estimate = kind === "estimate" ? data.estimates.find(item => item.id === id) : undefined
  const written = kind === "document" ? data.documents.find(item => item.id === id) : undefined
  // Written documents sit under their own tab; the priced ones live in the overview's billing section.
  const backTab = kind === "document" ? "documents" : "overview"
  const backLabel = kind === "document" ? "Back to documents" : "Back to overview"
  const backHref = backTab === "overview" ? portalPath(companySlug) : `${portalPath(companySlug)}/${backTab}`
  if (!invoice && !contract && !estimate && !written) return <PortalNotice title="Document unavailable">This document hasn’t been issued to your company, or is no longer available. <Link href={backHref} className="underline">{backLabel}</Link></PortalNotice>
  const url = safeExternalUrl(invoice?.url || contract?.url) || undefined
  const title = invoice ? `Invoice ${invoice.invoiceNumber}` : contract?.title || estimate?.title || written?.title || "Document"
  return <PortalShellLayout company={companySlug} organization={data.organization} activeTab={backTab} title={title}>
    <div className="mx-auto max-w-5xl"><div className="mb-7 flex flex-wrap items-center justify-between gap-4 print:hidden"><Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{backLabel}</Link><DocumentActions url={url} title={title} /></div>
    {invoice && <InvoiceDocument invoice={invoice} issuer={issuer} />}
    {contract && <ContractDocument contract={contract} issuer={issuer} />}
    {written && <CompanyDocumentView document={written} issuer={issuer} />}
    {estimate && <><EstimateDocument estimate={estimate} issuer={issuer} />{!isAdmin && <div className="mt-6 print:hidden">{data.publicView && estimate.status === "sent" ? <SignInPrompt action="to accept this estimate" /> : data.publicView ? null : <EstimateAcceptButton key={estimate.id} estimateId={estimate.id} status={estimate.status} onAccepted={data.reload} />}</div>}</>}
    </div>
  </PortalShellLayout>
}
