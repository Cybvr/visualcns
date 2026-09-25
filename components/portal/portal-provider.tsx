"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { getOrganizationByRef, type Organization } from "@/lib/organizations"
import { getInvoicesByCompanyId, getContractsByCompanyId, getEstimatesByCompanyId, type Invoice, type Contract, type Estimate } from "@/lib/billing"
import { getDocumentsForClient, type SharedDocument } from "@/lib/documents"
import { getPublicCompanyDocumentsByCompanyId, type CompanyDocument } from "@/lib/company-documents"
import { getPortalProjects, getPortalTasks } from "@/lib/portal-data"
import type { PortalProject, PortalTask } from "@/lib/portal-model"
import { PortalLoading, PortalNotice } from "./portal-shell"

export type PortalData = { organization: Organization; projects: PortalProject[]; tasks: PortalTask[]; invoices: Invoice[]; contracts: Contract[]; estimates: Estimate[]; files: SharedDocument[]; documents: CompanyDocument[] }
const Context = createContext<(PortalData & { reload: () => void }) | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const { companySlug } = useParams<{ companySlug: string }>()
  const { appUser, isAdmin, isImpersonating } = useAuth()
  const [result, setResult] = useState<{ key: string; data?: PortalData; error?: string; denied?: boolean }>({ key: "" })
  const [revision, setRevision] = useState(0)
  const key = `${companySlug}:${appUser?.uid}:${appUser?.companyId}:${isAdmin}:${isImpersonating}:${revision}`

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const organization = await getOrganizationByRef(companySlug)
        if (!organization || ((!isAdmin || isImpersonating) && appUser?.companyId !== organization.id)) {
          if (active) setResult({ key, denied: true })
          return
        }
        const projects = await getPortalProjects(organization.id)
        const [taskGroups, invoices, contracts, estimates, files, documents] = await Promise.all([
          Promise.all(projects.map(project => getPortalTasks(organization.id, project.id))),
          getInvoicesByCompanyId(organization.id), getContractsByCompanyId(organization.id), getEstimatesByCompanyId(organization.id),
          getDocumentsForClient(organization.id, appUser?.uid || ""),
          // A document reaches the client when it's toggled public, whatever its draft status.
          getPublicCompanyDocumentsByCompanyId(organization.id),
        ])
        if (active) setResult({ key, data: { organization, projects, tasks: taskGroups.flat(), invoices, contracts, estimates, files: files.filter(file => file.companyId === organization.id), documents } })
      } catch (error) {
        console.error("Portal load failed", error)
        if (active) setResult({ key, error: "We couldn’t load this company portal. Check your connection and try again." })
      }
    }
    void load()
    return () => { active = false }
  }, [key, companySlug, appUser?.uid, appUser?.companyId, isAdmin, isImpersonating])

  if (result.key !== key) return <PortalLoading />
  if (result.denied) return <PortalNotice title="This company portal isn’t available to your account">Use the email your agency invited. If you need access, ask your agency to add you to this company.</PortalNotice>
  if (result.error) return <PortalNotice title="Company portal unavailable"><p role="alert">{result.error}</p><Button className="mt-5" variant="outline" onClick={() => setRevision(n => n + 1)}>Try again</Button></PortalNotice>
  if (!result.data) return <PortalLoading />
  return <Context.Provider value={{ ...result.data, reload: () => setRevision(n => n + 1) }}>{children}</Context.Provider>
}

export function usePortal() {
  const context = useContext(Context)
  if (!context) throw new Error("PortalProvider is required")
  return context
}
