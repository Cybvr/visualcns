"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Bell, House } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { COMPANY_SECTIONS, type CompanySectionKey } from "@/components/company/company-sections"
import type { SectionNavItem } from "@/components/company/section-nav"
import type { CompanyDetailsPatch } from "@/components/company/company-sidebar"
import type { Contract, Estimate, Invoice } from "@/lib/billing"
import type { CompanyDocument } from "@/lib/company-documents"
import type { CompanyLink, PublicTeamMember } from "@/lib/organizations"
import { getPublicPortalTasks } from "@/lib/portal-data"
import type { PortalTask } from "@/lib/portal-model"
import type { Project } from "@/lib/projects"
import { deleteTask, getTasks, tsToMillis, updateTask, type Task } from "@/lib/tasks"
import type { AppUser } from "@/lib/users"

export { COMPANY_SECTIONS, isCompanySection, type CompanySectionKey } from "@/components/company/company-sections"

export interface CompanyPagePerson {
  id: string
  name: string
  subtitle?: string
  email?: string
  phone?: string
  role?: string
  photoUrl?: string
  adminUser?: AppUser
}

export interface CompanyPageCompany {
  id: string
  agencyId?: string
  name: string
  slug?: string
  logoUrl?: string
  categoryLabel: string
  industry?: string
  location?: string
  address?: string
  website?: string
  links?: CompanyLink[]
  description?: string
  targetCustomers?: string
  companySize?: string
  source?: string
  linkedIn?: string
  tags?: string[]
  primaryContactId?: string
  media?: string[]
  publicTeam?: PublicTeamMember[]
}

export interface CompanyPageAdmin {
  sharePath: string
  onViewWorkspace: (person: AppUser) => void
  onMediaChange?: (urls: string[]) => Promise<void>
  onUpdateCompany: (patch: CompanyDetailsPatch) => Promise<void>
  /** Attach an existing contact to this company without creating a new account. */
  onAddExistingContact?: (contactId: string) => Promise<void>
  /** Attach a contact to this company (if needed) and make them the primary contact. */
  onSelectPrimaryContact?: (contactId: string) => Promise<void>
  reload: () => Promise<void>
}

export interface CompanyPageData {
  company: CompanyPageCompany
  people: CompanyPagePerson[]
  /** All contacts across the workspace, for choosing a primary contact. */
  allContacts?: CompanyPagePerson[]
  projects: Project[]
  invoices: Invoice[]
  contracts: Contract[]
  estimates: Estimate[]
  documents?: CompanyDocument[]
  admin?: CompanyPageAdmin
  emptyProjectsLabel?: string
  /** Query values every section link keeps, e.g. the open client when the page sits inside the clients list. */
  keepParams?: Record<string, string>
}

/**
 * How sections are addressed. "routes" gives each one its own page at
 * /{slug}/{section}; "tabs" keeps them on one page behind ?tab=.
 */
export type CompanySectionMode = "routes" | "tabs"

interface CompanyPageValue extends CompanyPageData {
  documents: CompanyDocument[]
  emptyProjectsLabel: string
  isAdmin: boolean
  canSeeVisitors: boolean
  canManageTeam: boolean
  canEditDocuments: boolean
  visitorAgencyId: string
  sections: SectionNavItem<CompanySectionKey>[]
  section: CompanySectionKey
  sectionHref: (key: CompanySectionKey, query?: Record<string, string>) => string
  goToSection: (key: CompanySectionKey, query?: Record<string, string>) => void
  /** Change query values on the current page, keeping the section. */
  updateParams: (next: Record<string, string | null>, replace?: boolean) => void
  absoluteUrl: (path: string) => string
  tasks: Task[]
  tasksLoading: boolean
  deletingTaskId: string | null
  patchTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void
  refreshTasks: () => void
}

const CompanyPageContext = createContext<CompanyPageValue | null>(null)

export function useCompanyPage() {
  const value = useContext(CompanyPageContext)
  if (!value) throw new Error("useCompanyPage must be used inside CompanyPageProvider")
  return value
}

/**
 * Holds the company data, permissions, navigation and shared task list for
 * every company section, on both the dashboard and the public page.
 */
export function CompanyPageProvider({
  mode,
  children,
  ...data
}: CompanyPageData & { mode: CompanySectionMode; children: ReactNode }) {
  const { company, projects, admin } = data
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const searchParams = useSearchParams()
  const isAdmin = Boolean(admin)

  // Visitors are private: the agency and the company's own signed-in staff only.
  // Same rule as /api/visitors/staff, so an agency admin sees it on the public page too.
  const { appUser, isImpersonating } = useAuth()
  const canSeeVisitors = isAdmin
    || appUser?.role === "superadmin"
    || (appUser?.role === "admin" && Boolean(appUser.agencyId) && appUser.agencyId === company.agencyId)
    || (Boolean(appUser?.companyId) && appUser?.companyId === company.id)
  // Ngai is on the public page for the company's members; anyone else is asked to sign in
  // or told it's members only. Admins have it in the dashboard instead.
  const showNgai = mode === "routes" && appUser?.role !== "admin" && appUser?.role !== "superadmin"
  const sections = useMemo(() => {
    const visible = COMPANY_SECTIONS
      .filter((item) => item.key !== "visitors" || canSeeVisitors)
      .filter((item) => item.key !== "ngai" || showNgai)
    if (mode !== "routes") return [...visible]
    const about = visible.find((item) => item.key === "about")!
    return [
      { ...about, label: "Home", icon: House },
      ...visible.filter((item) => item.key !== "about").map((item) => item.key === "activity" ? { ...item, label: "Notifications", icon: Bell } : item),
    ]
  }, [canSeeVisitors, showNgai, mode])

  const basePath = mode === "routes" ? `/${pathname.split("/")[1] ?? ""}` : pathname
  const requested = mode === "routes" ? pathname.split("/")[2] : searchParams.get("tab")
  // "brand-health" is Pulse's old key; keep links that still use it working.
  const requestedSection = requested === "brand-health" ? "pulse" : mode === "routes" && requested === "notifications" ? "activity" : requested
  const section: CompanySectionKey = sections.some((s) => s.key === requestedSection)
    ? (requestedSection as CompanySectionKey)
    : mode === "tabs" && searchParams.get("task") && !isAdmin ? "tasks" : mode === "routes" ? "about" : "projects"

  function sectionHref(key: CompanySectionKey, query: Record<string, string> = {}) {
    const params = new URLSearchParams({ ...data.keepParams, ...query })
    let path = basePath
    if (mode === "routes") {
      if (key !== "about") path = `${basePath}/${key === "activity" ? "notifications" : key}`
    } else if (key !== "projects") {
      params.set("tab", key)
    }
    const search = params.toString()
    return search ? `${path}?${search}` : path
  }

  function goToSection(key: CompanySectionKey, query?: Record<string, string>) {
    router.push(sectionHref(key, query), { scroll: false })
  }

  function updateParams(next: Record<string, string | null>, replace = false) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    const search = params.toString()
    const href = search ? `${pathname}?${search}` : pathname
    if (replace) router.replace(href, { scroll: false })
    else router.push(href, { scroll: false })
  }

  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [taskRevision, setTaskRevision] = useState(0)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  // Tasks feed both the Tasks and Activity sections, so they load once here.
  useEffect(() => {
    let active = true
    setTasksLoading(true)
    async function loadTasks() {
      try {
        if (isAdmin) {
          // Older tasks can carry a stale companyId while the tasks table still
          // names this client. Keep those visible on the admin company page.
          const projectIds = new Set(projects.map((project) => project.id))
          const companyName = company.name.trim().toLowerCase()
          const found = (await getTasks())
            .filter((task) =>
              task.companyId === company.id ||
              (task.projectId && projectIds.has(task.projectId)) ||
              (companyName && task.client?.trim().toLowerCase() === companyName),
            )
            .sort((a, b) => Math.max(tsToMillis(b.updatedAt), tsToMillis(b.createdAt)) - Math.max(tsToMillis(a.updatedAt), tsToMillis(a.createdAt)))
          if (active) setTasks(found)
          return
        }

        const projectById = new Map(projects.map((project) => [project.id, project]))
        const taskGroups = await Promise.all(projects.map((project) => getPublicPortalTasks(company.id, project.id)))
        const found = taskGroups.flat().map((task: PortalTask) => {
          const project = projectById.get(task.projectId)
          return {
            id: task.id,
            agencyId: task.agencyId,
            name: task.name,
            companyId: task.companyId,
            client: company.name,
            projectId: task.projectId,
            project: project?.title || "",
            status: task.status,
            priority: "medium" as const,
            dueDate: task.dueDate,
            content: task.instructions,
            createdAt: (task.createdAt ?? project?.createdAt) as Task["createdAt"],
            updatedAt: task.updatedAt as Task["updatedAt"],
          } satisfies Task
        })
        if (active) setTasks(found)
      } catch {
        if (active) setTasks([])
      } finally {
        if (active) setTasksLoading(false)
      }
    }

    void loadTasks()
    return () => { active = false }
  }, [company.id, company.name, isAdmin, projects, taskRevision])

  function patchTask(id: string, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task))
    void updateTask(id, patch)
      .catch(() => toast.error("Could not update task."))
      .finally(() => setTaskRevision((current) => current + 1))
  }

  function removeTask(id: string) {
    setDeletingTaskId(id)
    void deleteTask(id)
      .then(() => setTasks((current) => current.filter((task) => task.id !== id)))
      .catch(() => toast.error("Could not delete task."))
      .finally(() => {
        setDeletingTaskId(null)
        setTaskRevision((current) => current + 1)
      })
  }

  const value: CompanyPageValue = {
    ...data,
    documents: data.documents ?? [],
    emptyProjectsLabel: data.emptyProjectsLabel ?? "No projects yet.",
    isAdmin,
    canSeeVisitors,
    // The company's own staff and agency admins manage the team; each person is a seat.
    canManageTeam: canSeeVisitors,
    canEditDocuments: isAdmin && !isImpersonating,
    visitorAgencyId: company.agencyId || appUser?.agencyId || "",
    sections,
    section,
    sectionHref,
    goToSection,
    updateParams,
    absoluteUrl: (path) => typeof window !== "undefined" ? `${window.location.origin}${path}` : path,
    tasks,
    tasksLoading,
    deletingTaskId,
    patchTask,
    removeTask,
    refreshTasks: () => setTaskRevision((current) => current + 1),
  }

  return <CompanyPageContext.Provider value={value}>{children}</CompanyPageContext.Provider>
}
