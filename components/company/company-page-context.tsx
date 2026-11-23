"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Bell, FolderOpen, House, Settings } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { COMPANY_SECTIONS, type CompanySectionKey } from "@/components/company/company-sections"
import type { SectionNavItem } from "@/components/company/section-nav"
import type { CompanyDetailsPatch } from "@/components/company/company-sidebar"
import type { BrandKit } from "@/lib/organizations"
import { siteUrl } from "@/lib/email-composer"
import type { Contract, Estimate, Invoice } from "@/lib/billing"
import type { CompanyDocument } from "@/lib/company-documents"
import type { CompanyLink, PublicTeamMember } from "@/lib/organizations"
import type { Project } from "@/lib/projects"
import { deleteTask, getPublicTasksByCompanyId, getTasks, tsToMillis, updateTask, type Task } from "@/lib/tasks"
import type { AppUser } from "@/lib/users"

export { COMPANY_SECTIONS, isCompanySection, type CompanySectionKey } from "@/components/company/company-sections"

/** Marketing pages after Social Media, in menu order. Overview comes first, before Campaigns. */
const MARKETING_PAGE_KEYS: CompanySectionKey[] = ["reviews", "insights", "seo", "google-ads", "business-profile", "marketing-settings"]
const MARKETING_KEYS: CompanySectionKey[] = ["marketing", ...MARKETING_PAGE_KEYS, "websites-home", "finance-home", "security-home"]

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
  brandKit?: BrandKit
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
  /** Logo, name, public address and delete, shown at the top of About. */
  profileSettings?: ReactNode
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
  /** "routes" is the public /{slug}/{section} page, which titles each section itself. */
  mode: CompanySectionMode
  absoluteUrl: (path: string) => string
  tasks: Task[]
  tasksLoading: boolean
  deletingTaskId: string | null
  patchTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void
  refreshTasks: () => void
  /** True while a section shows one open record (like a campaign) with its own title. */
  recordOpen: boolean
  setRecordOpen: (open: boolean) => void
}

const CompanyPageContext = createContext<CompanyPageValue | null>(null)

/** The company page's data when inside one, otherwise null. */
export function useOptionalCompanyPage() {
  return useContext(CompanyPageContext)
}

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
  const sections = useMemo(() => {
    // Tasks and media live inside each campaign, so they have no menu entry of their own.
    const visible = COMPANY_SECTIONS
      .filter((item) => item.key !== "tasks")
      // Reports (Pulse) is now Marketing; its old address redirects there.
      .filter((item) => item.key !== "pulse")
      // Team sits on Account in the dashboard tabs.
      .filter((item) => mode === "routes" || item.key !== "team")
      .filter((item) => mode === "routes" || item.key !== "ngai")
      // Sites lists the viewer's own builder chats, so it only belongs on the company page itself.
      .filter((item) => mode === "routes" || item.key !== "sites")
      // The Marketing pages belong on the company's own pages, not the dashboard tabs.
      .filter((item) => mode === "routes" || !MARKETING_KEYS.includes(item.key))
      // Domains belong to the company's own websites, and only its staff and the agency manage them.
      .filter((item) => (mode === "routes" && canSeeVisitors) || item.key !== "domains")
      // Social holds private DMs and posting, so it follows the same rule as Visitors.
      .filter((item) => !["visitors", "security-home", "messages", "social"].includes(item.key) || canSeeVisitors)
      // Customers are the company's private contacts: its own staff and the agency only.
      .filter((item) => item.key !== "customers" || canSeeVisitors)
    if (mode !== "routes") {
      // Dashboard tabs open on Home: the company's activity, with its name and logo on top.
      // About holds the client's editable details, so it's called Settings and goes last.
      // Documents and Assets are one Artifacts tab here, and Billing, Customers and Security stay off it.
      const home = visible.find((item) => item.key === "activity")
      const settings = visible.find((item) => item.key === "about")
      return [
        ...(home ? [{ ...home, label: "Home", icon: House }] : []),
        ...visible
          // No Campaigns/Marketing tab: campaigns show as the groups on Content and Creators.
          .filter((item) => !["activity", "about", "assets", "billings", "customers", "visitors", "security-home", "social", "analytics", "projects", "tasks"].includes(item.key))
          .map((item) => item.key === "documents" ? { ...item, label: "Artifacts", icon: FolderOpen } : item),
        ...(settings ? [{ ...settings, label: "Account", icon: Settings }] : []),
      ]
    }
    const about = visible.find((item) => item.key === "about")!
    const find = (key: CompanySectionKey) => visible.find((item) => item.key === key)
    const activity = find("activity")
    const order = [
      { ...about, label: "Home", icon: House },
      find("ngai"),
      // Websites, Marketing, Finance, Customers, then Security, as the menu shows them.
      find("websites-home"),
      find("sites"),
      find("domains"),
      find("marketing"),
      find("projects"),
      find("creators"),
      find("content"),
      find("assets"),
      find("social"),
      ...MARKETING_PAGE_KEYS.map(find),
      find("finance-home"),
      find("documents"),
      find("billings"),
      find("customers"),
      find("security-home"),
      find("visitors"),
      find("analytics"),
      activity && { ...activity, label: "Notifications", icon: Bell },
    ]
    return order.filter((item): item is NonNullable<typeof item> => Boolean(item))
  }, [canSeeVisitors, mode])

  const basePath = mode === "routes" ? `/${pathname.split("/")[1] ?? ""}` : pathname
  const requested = mode === "routes" ? pathname.split("/")[2] : searchParams.get("tab")
  // "brand-health" is Pulse's old key; keep links that still use it working.
  const requestedSection = requested === "brand-health"
    ? "pulse"
    : requested === "tasks" || (mode !== "routes" && requested === "social")
      ? "projects"
      : requested === "drive" || requested === "documents" || requested === "media" || requested === "notes" || requested === "finance" || (mode !== "routes" && requested === "assets")
        ? "documents"
      : requested === "settings"
        ? "about"
        : mode === "routes" && requested === "notifications"
            ? "activity"
            : requested
  const section: CompanySectionKey = sections.some((s) => s.key === requestedSection)
    ? (requestedSection as CompanySectionKey)
    : mode === "routes" ? "about" : searchParams.get("task") || searchParams.get("campaign") ? "projects" : "activity"

  function sectionHref(section: CompanySectionKey, query: Record<string, string> = {}) {
    const key = section === "tasks" ? "projects" : section
    const params = new URLSearchParams({ ...data.keepParams, ...query })
    let path = basePath
    if (mode === "routes") {
      // Documents is called Drive, and so is its address.
      if (key !== "about") path = `${basePath}/${key === "activity" ? "notifications" : key === "documents" ? "drive" : key}`
    } else if (key !== "activity") {
      params.set("tab", key === "about" ? "settings" : key === "documents" ? "drive" : key)
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
  const [recordOpen, setRecordOpen] = useState(false)
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

        const found = (await getPublicTasksByCompanyId(company.id))
          .sort((a, b) => Math.max(tsToMillis(b.updatedAt), tsToMillis(b.createdAt)) - Math.max(tsToMillis(a.updatedAt), tsToMillis(a.createdAt)))
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
    emptyProjectsLabel: data.emptyProjectsLabel ?? "No campaigns yet.",
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
    mode,
    absoluteUrl: siteUrl,
    tasks,
    tasksLoading,
    deletingTaskId,
    patchTask,
    removeTask,
    refreshTasks: () => setTaskRevision((current) => current + 1),
    recordOpen,
    setRecordOpen,
  }

  return <CompanyPageContext.Provider value={value}>{children}</CompanyPageContext.Provider>
}
