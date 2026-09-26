"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CompanyBanner } from "@/components/company/company-banner"
import { ContractDocument } from "@/components/dashboard/contract-document"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { Skeleton } from "@/components/ui/skeleton"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { getContract, type Contract } from "@/lib/billing"
import { getOrganization, type Organization } from "@/lib/organizations"
import type { Project } from "@/lib/projects"

/** No login required: issued company contracts are public; drafts stay private. */
export default function SharedContractPage() {
  const { id } = useParams<{ id: string }>()
  const [contract, setContract] = useState<Contract | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let active = true
    getContract(id)
      .then(async (record) => {
        if (!active) return
        const visible = record && record.status !== "draft" ? record : null
        setContract(visible)
        setLoading(false)
        // The org header is nice-to-have on top of the contract itself, so a
        // failure here never blocks the document from showing.
        if (!visible) return
        const organization = await getOrganization(visible.companyId).catch(() => null)
        const profile = await getBusinessProfile(visible.agencyId || organization?.agencyId)
        if (!active) return
        if (organization) setOrganization(organization)
        setIssuer(profile)
      })
      .catch(() => {
        if (active) {
          setContract(null)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16" role="status" aria-label="Loading shared contract">
        <div className="mx-auto max-w-5xl space-y-6"><Skeleton className="h-10 w-28" /><Skeleton className="h-32 w-full" /><Skeleton className="h-[32rem] w-full rounded-xl" /></div>
      </main>
    )
  }

  if (!contract) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <p className="text-sm text-muted-foreground">This link is no longer available.</p>
      </main>
    )
  }

  const companyName = organization?.name || contract.client
  const coverProject: Project = {
    id: contract.companyId,
    companyId: contract.companyId,
    client: companyName,
    title: companyName,
    service: "",
    status: "in-progress",
    progress: 0,
    dueDate: "",
    thumbnailUrl: organization?.logoUrl,
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex justify-end print:hidden">
          <DocumentActions url={contract.url} title={`${companyName} Contract`} />
        </div>
        <div className="mb-6 print:hidden">
          <CompanyBanner name={companyName} categoryLabel={organization?.industry ?? ""} coverProject={coverProject} />
        </div>
        <ContractDocument contract={contract} issuer={issuer ?? undefined} />
        <p className="mt-6 text-center text-xs text-muted-foreground print:hidden">Shared by VisualHQ</p>
      </div>
    </main>
  )
}
