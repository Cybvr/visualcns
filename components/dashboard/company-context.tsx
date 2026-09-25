"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import {
  getContractsByCompanyId,
  getEstimatesByCompanyId,
  getInvoicesByCompanyId,
  type Contract,
  type Estimate,
  type Invoice,
} from "@/lib/billing"
import { getCompanyDocumentsByCompanyId, getPublicCompanyDocumentsByCompanyId, type CompanyDocument } from "@/lib/company-documents"
import { getOrganization, getOrganizationByRef, getPublicOrganizationBySlug, updateOrganization, type Organization, type PublicTeamMember } from "@/lib/organizations"
import { getProjectsByCompanyId, getPublicProjectsByCompanyId, type Project } from "@/lib/projects"
import { getUserByCompanyId, getUserByRef, getUsers, getUsersByCompanyId, type AppUser } from "@/lib/users"

export function clientName(client: AppUser): string {
  return client.company || client.displayName || client.email || "Unnamed company"
}

/** A person with neither a name nor an email is just the placeholder account a new company starts with. */
function hasProfile(person: AppUser): boolean {
  return Boolean(person.displayName?.trim() || person.email?.trim())
}

/** Only what the public page's Team section may show - never the email. */
function toPublicTeam(people: AppUser[]): PublicTeamMember[] {
  return people.map((person) => ({
    uid: person.uid,
    name: person.displayName || "Team member",
    role: person.role || "",
    photoUrl: person.photoURL || "",
  }))
}

function samePublicTeam(a: PublicTeamMember[] | undefined, b: PublicTeamMember[]): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b)
}

/** Industry off the organization, category off the projects, joined into one line. */
function buildCategoryLabel(projects: Project[], org: Organization | null): string {
  const category = [...new Set(projects.flatMap((project) => project.category ?? []))].filter(Boolean).join(" & ")
  return [org?.industry, category].filter(Boolean).join(" · ")
}

type CompanyState = {
  loading: boolean
  error: string | null
  client: AppUser | null
  organization: Organization | null
  people: AppUser[]
  publicTeam: PublicTeamMember[]
  projects: Project[]
  invoices: Invoice[]
  contracts: Contract[]
  estimates: Estimate[]
  documents: CompanyDocument[]
  workspaceId: string
  name: string
  categoryLabel: string
  reload: () => Promise<void>
}

const CompanyContext = createContext<CompanyState | null>(null)

/**
 * Loads the company, its organization doc, people, and projects once for the
 * whole `[slug]` route tree, so the view page and the edit page share one
 * fetch instead of each doing their own.
 */
export function CompanyProvider({ children, companyRef, publicView = false }: { children: ReactNode; companyRef?: string; publicView?: boolean }) {
  const { isAdmin } = useAuth()
  const params = useParams<{ slug?: string; clientSlug?: string }>()
  const ref = companyRef ?? params?.slug ?? params?.clientSlug ?? ""

  const [client, setClient] = useState<AppUser | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [people, setPeople] = useState<AppUser[]>([])
  const [publicTeam, setPublicTeam] = useState<PublicTeamMember[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [documents, setDocuments] = useState<CompanyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!ref) return
    setError(null)
    try {
      // Prefer the organization ref because company URLs use the organization's
      // canonical slug. Fall back to user refs so older /dashboard/{userSlug}
      // links and raw ids continue to resolve.
      const resolvedOrg = publicView ? await getPublicOrganizationBySlug(ref) : await getOrganizationByRef(ref)
      const found = publicView
        ? resolvedOrg
          ? ({ uid: resolvedOrg.id, email: resolvedOrg.email || "", displayName: resolvedOrg.name, company: resolvedOrg.name, companyId: resolvedOrg.id, role: "client" } as AppUser)
          : null
        : resolvedOrg
          ? await getUserByCompanyId(resolvedOrg.id)
          : await getUserByRef(ref)
      if (!found) {
        setError("That company doesn't exist, or it has been removed.")
        return
      }
      const workspace = found.companyId || resolvedOrg?.id || found.uid
      const [foundOrg, foundPeople, foundProjects, foundInvoices, foundContracts, foundEstimates, foundDocuments, tenantUsers] = publicView
        ? await Promise.all([
            Promise.resolve(resolvedOrg),
            Promise.resolve([] as AppUser[]),
            getPublicProjectsByCompanyId(workspace),
            Promise.resolve([] as Invoice[]),
            Promise.resolve([] as Contract[]),
            Promise.resolve([] as Estimate[]),
            getPublicCompanyDocumentsByCompanyId(workspace),
            Promise.resolve([] as AppUser[]),
          ])
        : await Promise.all([
            resolvedOrg?.id === workspace ? Promise.resolve(resolvedOrg) : getOrganization(workspace),
            getUsersByCompanyId(workspace),
            getProjectsByCompanyId(workspace),
            getInvoicesByCompanyId(workspace, true),
            getContractsByCompanyId(workspace, true),
            getEstimatesByCompanyId(workspace, true),
            getCompanyDocumentsByCompanyId(workspace, true),
            isAdmin ? getUsers() : Promise.resolve([] as AppUser[]),
          ])
      setClient(found)
      setOrganization(foundOrg)
      const profiled = foundPeople.filter(hasProfile)
      setPeople(profiled)
      setProjects(foundProjects)
      setInvoices(foundInvoices)
      setContracts(foundContracts)
      setEstimates(foundEstimates)
      setDocuments(foundDocuments)

      const assignedIds = new Set(foundProjects.flatMap((project) => project.teamMemberIds ?? []))
      const nextPublicTeam = publicView
        ? foundOrg?.publicTeam ?? []
        : isAdmin
        ? toPublicTeam(tenantUsers.filter((user) => assignedIds.has(user.uid)))
        : foundOrg?.publicTeam ?? []
      setPublicTeam(nextPublicTeam)

      // Keep the public page's Team section limited to organization users
      // assigned to at least one project. Only an admin can write here.
      if (isAdmin && !samePublicTeam(foundOrg?.publicTeam, nextPublicTeam)) {
        updateOrganization(workspace, { publicTeam: nextPublicTeam }).catch(() => {})
      }
    } catch (loadError) {
      console.error("Error loading company:", loadError)
      setError(loadError instanceof Error ? loadError.message : "This company could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [isAdmin, publicView, ref])

  useEffect(() => {
    void load()
  }, [load])

  const value = useMemo<CompanyState>(() => {
    const workspaceId = client ? client.companyId || client.uid : ""
    return {
      loading,
      error,
      client,
      organization,
      people,
      publicTeam,
      projects,
      invoices,
      contracts,
      estimates,
      documents,
      workspaceId,
      name: client ? organization?.name || clientName(client) : "",
      categoryLabel: buildCategoryLabel(projects, organization),
      reload: load,
    }
  }, [loading, error, client, organization, people, publicTeam, projects, invoices, contracts, estimates, documents, load])

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}

/** Raw state, loading/error included. Use this in the layout, which decides what to render while loading or on error. */
export function useCompanyState(): CompanyState {
  const context = useContext(CompanyContext)
  if (!context) throw new Error("useCompanyState must be used inside a CompanyProvider")
  return context
}

/** For the pages inside the layout, which only ever mount once the company has loaded. */
export function useCompany(): Omit<CompanyState, "client" | "loading" | "error"> & { client: AppUser } {
  const context = useCompanyState()
  if (!context.client) throw new Error("useCompany was called before the company finished loading")
  return { ...context, client: context.client }
}
