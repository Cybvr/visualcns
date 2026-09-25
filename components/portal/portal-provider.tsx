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
import type { BusinessProfile } from "@/lib/business-profile"
import { fetchPublicPortal, PortalLinkInvalidError } from "@/lib/portal-public"
import { PortalLoading, PortalNotice, usePortalKey } from "./portal-shell"

export type PortalData = { organization: Organization; projects: PortalProject[]; tasks: PortalTask[]; invoices: Invoice[]; contracts: Contract[]; estimates: Estimate[]; files: SharedDocument[]; documents: CompanyDocument[] }
/**
 * `publicView` is true when the portal was opened through a share link by
 * someone who isn't signed in as this company's client: they can look, but
 * anything that writes (feedback, approvals, Ngai) asks them to sign in.
 */
type PortalContext = PortalData & { reload: () => void; publicView: boolean; issuer?: BusinessProfile }
const Context = createContext<PortalContext | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const { companySlug } = useParams<{ companySlug: string }>()
  const { user, appUser, isAdmin, isImpersonating } = useAuth()
  const portalKey = usePortalKey()
  const [result, setResult] = useState<{ key: string; data?: PortalData; publicView?: boolean; issuer?: BusinessProfile; error?: string; denied?: boolean; invalidLink?: boolean }>({ key: "" })
  const [revision, setRevision] = useState(0)
  const key = `${companySlug}:${appUser?.uid}:${appUser?.companyId}:${isAdmin}:${isImpersonating}:${portalKey}:${revision}`

  useEffect(() => {
    let active = true
    async function loadPublic() {
      try {
        const data = await fetchPublicPortal<PortalData>(portalKey)
        // A key only opens its own company, whatever slug is in the address.
        const matches = data.organization.slug === companySlug || data.organization.id === companySlug
        if (active) setResult(matches ? { key, data, publicView: true, issuer: data.issuer } : { key, invalidLink: true })
      } catch (error) {
        if (!active) return
        if (error instanceof PortalLinkInvalidError) setResult({ key, invalidLink: true })
        else setResult({ key, error: "We couldn’t load this workspace. Check your connection and try again." })
      }
    }
    async function load() {
      // Visitors who aren't signed in (or have no account doc) use the share link.
      if (!user || !appUser) { if (portalKey) await loadPublic(); else if (active) setResult({ key, denied: true }); return }
      try {
        const organization = await getOrganizationByRef(companySlug)
        if (!organization || ((!isAdmin || isImpersonating) && appUser?.companyId !== organization.id)) {
          // Signed in as someone else, but holding this company's link: show it read-only.
          if (portalKey) { await loadPublic(); return }
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
        if (portalKey && !isAdmin) { await loadPublic(); return }
        if (active) setResult({ key, error: "We couldn’t load this workspace. Check your connection and try again." })
      }
    }
    void load()
    return () => { active = false }
    // `key` already covers every input that should trigger a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (result.key !== key) return <PortalLoading />
  if (result.invalidLink) return <PortalNotice title="This link isn’t valid anymore">Ask your agency to send you the latest link to your workspace.</PortalNotice>
  if (result.denied) return <PortalNotice title="This workspace isn’t available to your account">Use the email your agency invited. If you need access, ask your agency to add you to this company.</PortalNotice>
  if (result.error) return <PortalNotice title="Workspace unavailable"><p role="alert">{result.error}</p><Button className="mt-5" variant="outline" onClick={() => setRevision(n => n + 1)}>Try again</Button></PortalNotice>
  if (!result.data) return <PortalLoading />
  return <Context.Provider value={{ ...result.data, publicView: Boolean(result.publicView), issuer: result.issuer, reload: () => setRevision(n => n + 1) }}>{children}</Context.Provider>
}

export function usePortal() {
  const context = useContext(Context)
  if (!context) throw new Error("PortalProvider is required")
  return context
}
