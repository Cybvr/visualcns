"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Briefcase, ChevronRight, ExternalLink, FolderOpen, ListTodo, LogOut, Mail, MoreVertical, Pencil, Share2, User as UserIcon, X } from "lucide-react"
import { toast } from "sonner"

import { CompanyDocuments, type CompanyDocumentKind } from "@/components/company/company-documents"
import { CompanyBookings } from "@/components/company/company-bookings"
import { CompanyDocumentView } from "@/components/dashboard/company-document-view"
import { TaskContent } from "@/components/dashboard/task-content"
import { CompanyEmptyState } from "@/components/company/empty-state"
import { CompanyLinks } from "@/components/company/company-links"
import { CompanyMedia } from "@/components/company/company-media"
import { CompanyVisitors } from "@/components/company/company-visitors"
import { TeamInvitePanel, useTeamSeats } from "@/components/company/team-seats"
import { useAuth } from "@/components/auth-provider"
import { BusinessHealth } from "@/components/company/business-health"
import { CompanyDetails, type CompanyDetailsPatch } from "@/components/company/company-sidebar"
import { CompanyProfileHeader } from "@/components/company/company-profile-header"
import { ImageDropzone } from "@/components/image-dropzone"
import { SectionAddButton } from "@/components/company/section-add-button"
import { SectionNav } from "@/components/company/section-nav"
import { ContractDocument } from "@/components/dashboard/contract-document"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { EstimateDocument } from "@/components/dashboard/estimate-document"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { NewPersonDialog } from "@/components/dashboard/new-person-dialog"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { ProjectDetail } from "@/components/dashboard/project-detail"
import { TasksView } from "@/components/dashboard/tasks-view"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ProjectCover } from "@/components/project-card"
import { UserEditorSheet } from "@/components/dashboard/user-editor-sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Contract, Estimate, Invoice } from "@/lib/billing"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import type { CompanyDocument } from "@/lib/company-documents"
import { buildActivity } from "@/lib/activity"
import type { CompanyLink, PublicTeamMember } from "@/lib/organizations"
import { deleteProjectWithTasks, duplicateProject, renameProject, type Project } from "@/lib/projects"
import { deleteUser, type AppUser } from "@/lib/users"
import { deleteTask, getTasks, taskStatusMeta, tsToMillis, updateTask, type Task } from "@/lib/tasks"
import { getPortalTasks, getPublicPortalTasks } from "@/lib/portal-data"
import type { PortalTask } from "@/lib/portal-model"
import { buildEmailComposeHref } from "@/lib/email-composer"
import { PortalPublishingPanel } from "@/components/portal/portal-publishing"
import { usePageHeaderActions } from "@/components/dashboard/page-title-context"

const SECTIONS = [
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "about", label: "About" },
  { key: "team", label: "Team" },
  { key: "activity", label: "Activity" },
  { key: "media", label: "Media" },
  { key: "brand-health", label: "Business Health" },
  { key: "documents", label: "Documents" },
  { key: "visitors", label: "Visitors" },
] as const

type SectionKey = (typeof SECTIONS)[number]["key"]

function ProfileCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-2">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function CompanyAboutCard({ description, onSave }: { description?: string; onSave?: (patch: CompanyDetailsPatch) => Promise<void> }) {
  const [draft, setDraft] = useState(description ?? "")

  useEffect(() => setDraft(description ?? ""), [description])

  return (
    <ProfileCard title="About">
      {onSave ? (
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const next = draft.trim()
            if (next !== (description ?? "")) void onSave({ description: next })
          }}
          placeholder="Add a description"
          className="min-h-28 resize-y border-transparent bg-transparent px-0 text-sm leading-6 shadow-none focus-visible:border-transparent focus-visible:ring-0"
          aria-label="Company description"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
          {description || "No description yet."}
        </p>
      )}
    </ProfileCard>
  )
}

function CompanyTagsCard({ tags = [], onSave }: { tags?: string[]; onSave?: (patch: CompanyDetailsPatch) => Promise<void> }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")

  function addTag() {
    const next = draft.trim()
    setDraft("")
    setAdding(false)
    if (!next || tags.includes(next) || !onSave) return
    void onSave({ tags: [...tags, next] })
  }

  return (
    <ProfileCard title="Tags">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
            {tag}
            {onSave && (
              <button
                type="button"
                onClick={() => void onSave({ tags: tags.filter((item) => item !== tag) })}
                aria-label={`Remove ${tag} tag`}
                className="text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        {onSave && (adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                addTag()
              }
              if (event.key === "Escape") {
                setDraft("")
                setAdding(false)
              }
            }}
            onBlur={addTag}
            placeholder="Tag name"
            className="h-9 w-28 rounded-full bg-muted px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="New tag"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            + Add tag
          </button>
        ))}
        {!tags.length && !onSave && <span className="text-sm text-muted-foreground">No tags yet.</span>}
      </div>
    </ProfileCard>
  )
}

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

/**
 * The complete company experience used by both dashboard and public routes.
 * Supplying `admin` reveals private actions; omitting it keeps this same block
 * read-only and never requires private data.
 */
export function CompanyPage({
  company,
  people,
  allContacts,
  projects,
  invoices,
  contracts,
  estimates,
  documents = [],
  admin,
  emptyProjectsLabel = "No projects yet.",
}: {
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
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdmin = Boolean(admin)

  // Visitors are private: the agency and the company's own signed-in staff only.
  const { appUser, user, signOut, isImpersonating } = useAuth()
  const canEditDocuments = Boolean(admin) && !isImpersonating
  const canSeeVisitors = isAdmin || (Boolean(appUser?.companyId) && appUser?.companyId === company.id)
  const visitorAgencyId = company.agencyId || appUser?.agencyId || ""
  const sections = useMemo(() => SECTIONS.filter((item) => item.key !== "visitors" || canSeeVisitors), [canSeeVisitors])
  // The company's own staff and agency admins manage the team; each person is a seat.
  const canManageTeam = canSeeVisitors
  const teamSeats = useTeamSeats(company.id, canManageTeam)
  const [removedPersonIds, setRemovedPersonIds] = useState<string[]>([])

  const tabParam = searchParams.get("tab")
  const taskParam = searchParams.get("task")
  const section: SectionKey = sections.some((s) => s.key === tabParam) ? (tabParam as SectionKey) : taskParam && !admin ? "tasks" : "projects"

  const [docKind, docId] = (searchParams.get("doc") ?? "").split(":")
  const selectedDocument = useMemo(() => {
    if (docKind === "invoice") return invoices.find((i) => i.id === docId) ? { kind: "invoice" as const, id: docId } : null
    if (docKind === "contract") return contracts.find((c) => c.id === docId) ? { kind: "contract" as const, id: docId } : null
    if (docKind === "estimate") return estimates.find((e) => e.id === docId) ? { kind: "estimate" as const, id: docId } : null
    if (docKind === "document") return documents.find((d) => d.id === docId) ? { kind: "document" as const, id: docId } : null
    return null
  }, [docKind, docId, invoices, contracts, estimates, documents])

  const [renamingProject, setRenamingProject] = useState<Project | null>(null)
  const [projectTitleDraft, setProjectTitleDraft] = useState("")
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [projectActionBusy, setProjectActionBusy] = useState(false)
  const [addingPerson, setAddingPerson] = useState(false)
  const [selectingExistingPerson, setSelectingExistingPerson] = useState(false)
  const [existingPersonQuery, setExistingPersonQuery] = useState("")
  const [addingExistingPersonId, setAddingExistingPersonId] = useState<string | null>(null)
  const [editingPerson, setEditingPerson] = useState<AppUser | null>(null)
  const [pendingRemove, setPendingRemove] = useState<AppUser | null>(null)
  const [removing, setRemoving] = useState(false)
  const [creatingDocument, setCreatingDocument] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [logoEditOpen, setLogoEditOpen] = useState(false)
  const [mediaAddOpen, setMediaAddOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [activityTasks, setActivityTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const viewingTaskId = !admin && section === "tasks" ? taskParam : null
  const [viewingTaskContent, setViewingTaskContent] = useState<string | null>(null)
  const [viewingTaskError, setViewingTaskError] = useState(false)
  const [viewingTaskRetry, setViewingTaskRetry] = useState(0)
  const [taskRevision, setTaskRevision] = useState(0)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [teamContactIds, setTeamContactIds] = useState<string[]>([])
  const [teamSaving, setTeamSaving] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)

  useEffect(() => {
    setIssuer(null)
    if (!isAdmin && !company.agencyId) return
    let active = true
    getBusinessProfile(isAdmin ? undefined : company.agencyId)
      .then((profile) => { if (active) setIssuer(profile) })
      .catch(() => {
        // Document header just stays without issuer details.
      })
    return () => { active = false }
  }, [isAdmin, company.agencyId])

  useEffect(() => {
    let active = true
    setTasksLoading(true)
    async function loadActivityTasks() {
      try {
        if (isAdmin) {
          // Older tasks can carry a stale companyId while the tasks table still
          // names this client. Keep those visible on the admin company page.
          const projectIds = new Set(projects.map((project) => project.id))
          const companyName = company.name.trim().toLowerCase()
          const tasks = (await getTasks())
            .filter((task) =>
              task.companyId === company.id ||
              (task.projectId && projectIds.has(task.projectId)) ||
              (companyName && task.client?.trim().toLowerCase() === companyName),
            )
            .sort((a, b) => Math.max(tsToMillis(b.updatedAt), tsToMillis(b.createdAt)) - Math.max(tsToMillis(a.updatedAt), tsToMillis(a.createdAt)))
          if (active) setActivityTasks(tasks)
          return
        }

        const projectById = new Map(projects.map((project) => [project.id, project]))
        const taskGroups = await Promise.all(projects.map((project) => getPublicPortalTasks(company.id, project.id)))
        const tasks = taskGroups.flat().map((task: PortalTask) => {
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
        if (active) setActivityTasks(tasks)
      } catch {
        if (active) setActivityTasks([])
      } finally {
        if (active) setTasksLoading(false)
      }
    }

    void loadActivityTasks()
    return () => { active = false }
  }, [company.id, company.name, isAdmin, projects, taskRevision])

  function handleTaskPatch(id: string, patch: Partial<Task>) {
    setActivityTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task))
    void updateTask(id, patch)
      .catch(() => toast.error("Could not update task."))
      .finally(() => setTaskRevision((current) => current + 1))
  }

  function handleTaskDelete(id: string) {
    setDeletingTaskId(id)
    void deleteTask(id)
      .then(() => setActivityTasks((current) => current.filter((task) => task.id !== id)))
      .catch(() => toast.error("Could not delete task."))
      .finally(() => {
        setDeletingTaskId(null)
        setTaskRevision((current) => current + 1)
      })
  }

  function updateParams(next: Record<string, string | null>, replace = false) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    const query = params.toString()
    const href = query ? `${pathname}?${query}` : pathname
    if (replace) router.replace(href, { scroll: false })
    else router.push(href, { scroll: false })
  }

  function handleSectionChange(key: SectionKey) {
    if (key !== "projects") setSelectedProject(null)
    updateParams({ tab: key === "projects" ? null : key, doc: null, task: null })
  }

  function publicTaskPath(id: string) {
    return `${pathname}?tab=tasks&task=${encodeURIComponent(id)}`
  }

  async function copyPublicTaskLink(task: Task) {
    const url = absoluteUrl(publicTaskPath(task.id))
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Task link copied")
    } catch {
      toast.error("Couldn’t copy the task link.")
    }
  }

  function handleSelectDocument(kind: CompanyDocumentKind, id: string) {
    updateParams({ tab: "documents", doc: `${kind}:${id}` })
  }

  function handleCloseDocument() {
    updateParams({ doc: null })
  }

  function documentEditHref(kind: CompanyDocumentKind, id: string) {
    return `/dashboard/${kind}s/${encodeURIComponent(id)}/edit`
  }

  function handleEditDocument(kind: CompanyDocumentKind, id: string) {
    router.push(documentEditHref(kind, id))
  }

  function handleAddDocument(kind: CompanyDocumentKind) {
    if (kind === "document") {
      setCreatingDocument(true)
      return
    }
    router.push(`/dashboard/${kind}s/new?companyId=${encodeURIComponent(company.id)}`)
  }

  const absoluteUrl = (path: string) =>
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path

  const primaryContact = people.find((person) => person.adminUser?.uid === company.primaryContactId)
    || people.find((person) => person.adminUser?.email)

  const availableExistingContacts = (allContacts ?? [])
    .filter((person) => !people.some((current) => current.id === person.id))

  const existingContacts = availableExistingContacts
    .filter((person) => {
      const query = existingPersonQuery.trim().toLowerCase()
      return !query || [person.name, person.subtitle, person.email, person.phone].filter(Boolean).join(" ").toLowerCase().includes(query)
    })

  const clientTeamMembers = useMemo<Array<{ person: CompanyPagePerson; projects: string[] }>>(
    () => people
      .filter((person) => !removedPersonIds.includes(person.id))
      .map((person) => ({
        person,
        projects: projects
          .filter((project) => project.teamMemberIds?.includes(person.id))
          .map((project) => project.title),
      }))
      .sort((a, b) => a.person.name.localeCompare(b.person.name)),
    [people, projects, removedPersonIds],
  )

  const activity = useMemo(
    () => buildActivity({ projects, tasks: activityTasks, invoices, estimates, contracts, documents }),
    [activityTasks, contracts, documents, estimates, invoices, projects],
  )
  const viewingTask = !admin && viewingTaskId
    ? activityTasks.find((task) => task.id === viewingTaskId) ?? null
    : null

  useEffect(() => {
    if (isAdmin || !viewingTaskId) {
      setViewingTaskContent(null)
      setViewingTaskError(false)
      return
    }
    const controller = new AbortController()
    setViewingTaskContent(null)
    setViewingTaskError(false)
    fetch(`/api/organizations/public/task-content?companyId=${encodeURIComponent(company.id)}&taskId=${encodeURIComponent(viewingTaskId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Task content unavailable")
        return response.json() as Promise<{ content: string }>
      })
      .then((result) => setViewingTaskContent(result.content))
      .catch(() => { if (!controller.signal.aborted) setViewingTaskError(true) })
    return () => controller.abort()
  }, [company.id, isAdmin, viewingTaskId, viewingTaskRetry])

  function openTeamDialog() {
    setTeamContactIds([])
    setExistingPersonQuery("")
    setTeamError(null)
    setTeamDialogOpen(true)
  }

  async function saveTeamMembers() {
    if (!admin?.onAddExistingContact || !teamContactIds.length || teamSaving) return
    setTeamSaving(true)
    setTeamError(null)
    try {
      for (const contactId of teamContactIds) {
        await admin.onAddExistingContact(contactId)
      }
      await admin.reload()
      setTeamDialogOpen(false)
    } catch (saveError) {
      setTeamError(saveError instanceof Error ? saveError.message : "Could not add the team members.")
    } finally {
      setTeamSaving(false)
    }
  }

  async function handleAddExistingPerson(contactId: string) {
    if (!admin?.onAddExistingContact || addingExistingPersonId) return
    setAddingExistingPersonId(contactId)
    try {
      await admin.onAddExistingContact(contactId)
      setSelectingExistingPerson(false)
      setExistingPersonQuery("")
    } catch (addError) {
      console.error("Error adding existing contact:", addError)
    } finally {
      setAddingExistingPersonId(null)
    }
  }

  async function handleRemovePerson() {
    if (!admin || !pendingRemove || removing) return
    setRemoving(true)
    try {
      await deleteUser(pendingRemove.uid)
      await admin.reload()
      setPendingRemove(null)
    } catch (removeError) {
      console.error("Error removing person:", removeError)
    } finally {
      setRemoving(false)
    }
  }

  const profile = {
    id: company.id,
    name: company.name,
    logoUrl: company.logoUrl,
    industry: company.industry,
    location: company.location,
    address: company.address,
    website: company.website,
    description: company.description,
    companySize: company.companySize,
    source: company.source,
    linkedIn: company.linkedIn,
    tags: company.tags,
    primaryContactId: company.primaryContactId,
  }
  async function handleDuplicateProject(project: Project) {
    if (!admin || projectActionBusy) return
    setProjectActionBusy(true)
    try {
      await duplicateProject(project)
      await admin.reload()
      toast.success("Project duplicated")
    } catch (duplicateError) {
      console.error("Error duplicating project:", duplicateError)
      toast.error("The project could not be duplicated.")
    } finally {
      setProjectActionBusy(false)
    }
  }

  async function handleRenameProject() {
    if (!admin || !renamingProject || projectActionBusy) return
    const title = projectTitleDraft.trim()
    if (!title || title === renamingProject.title) return
    setProjectActionBusy(true)
    try {
      await renameProject(renamingProject.id, title)
      setRenamingProject(null)
      await admin.reload()
      toast.success("Project renamed")
    } catch (renameError) {
      console.error("Error renaming project:", renameError)
      toast.error("The project could not be renamed.")
    } finally {
      setProjectActionBusy(false)
    }
  }

  async function handleDeleteProject() {
    if (!admin || !deletingProject || projectActionBusy) return
    setProjectActionBusy(true)
    try {
      await deleteProjectWithTasks(deletingProject.id)
      setDeletingProject(null)
      await admin.reload()
      toast.success("Project deleted")
    } catch (deleteError) {
      console.error("Error deleting project:", deleteError)
      toast.error("The project could not be deleted.")
    } finally {
      setProjectActionBusy(false)
    }
  }

  const headerActions = useMemo(() => admin ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            title="More actions"
            className="flex size-10 items-center justify-center rounded-xl bg-transparent text-current outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreVertical className="size-5" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={buildEmailComposeHref({
              companyId: company.id,
              companyName: company.name,
              recipientEmail: primaryContact?.adminUser?.email,
              recipientName: primaryContact?.adminUser?.displayName || primaryContact?.name,
              ctaText: "Open your company page",
              ctaUrl: admin.sharePath,
            })}>
              <Mail className="size-4" aria-hidden="true" />
              Email
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShareOpen(true)}>
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={admin.sharePath} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" aria-hidden="true" />
              Open page
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null, [admin, company.id, company.name, primaryContact])

  usePageHeaderActions(headerActions)

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl max-md:bg-page px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-16 sm:pt-6">
      <CompanyProfileHeader
        name={company.name}
        handle={company.slug || admin?.sharePath.split("/").filter(Boolean).pop()}
        description={company.description}
        categoryLabel={company.categoryLabel}
        logoUrl={company.logoUrl}
        coverUrl={company.media?.find((url) => url && url !== company.logoUrl)}
        location={company.location}
        website={company.website}
        linkedIn={company.linkedIn}
        contactCount={people.length}
        publicPath={admin?.sharePath}
        admin={Boolean(admin)}
        onShare={admin ? () => setShareOpen(true) : undefined}
        onEdit={admin ? () => router.push(`${pathname}/edit`) : undefined}
        onChangeLogo={admin ? () => setLogoEditOpen(true) : undefined}
        onChangeCover={admin ? () => {
          setMediaAddOpen(true)
          handleSectionChange("media")
        } : undefined}
        accountAction={!admin && user ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-[9px] px-3"
            onClick={() => { void signOut().then(() => router.replace("/login")) }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Log out
          </Button>
        ) : undefined}
        tabs={<SectionNav sections={sections} active={section} onChange={handleSectionChange} />}
      />

      <div className="min-w-0">
          {section === "about" && (
            <div className="mt-5">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
                <div className="min-w-0 space-y-6">
                  <CompanyAboutCard description={company.description} onSave={admin?.onUpdateCompany} />
                  <CompanyTagsCard tags={company.tags} onSave={admin?.onUpdateCompany} />
                </div>
                <ProfileCard title="Details">
                  <CompanyDetails
                    company={profile}
                    onSave={admin?.onUpdateCompany}
                    hideTags
                    hideDescription
                  />
                </ProfileCard>
              </div>
              <div className="mt-6">
                <CompanyLinks
                  links={company.links}
                  onSave={admin ? (links) => admin.onUpdateCompany({ links }) : undefined}
                />
              </div>
            </div>
          )}

          {section === "team" && (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="sr-only">Team</h2>
                <span className="sidebar-nav-label text-muted-foreground">
                  Team members{teamSeats.info ? ` · ${teamSeats.info.seats} of ${teamSeats.info.limit} seats` : ""}
                </span>
                {admin && <SectionAddButton label="Add team members" onClick={openTeamDialog} />}
              </div>
              {canManageTeam && teamSeats.info && (
                <TeamInvitePanel info={teamSeats.info} call={teamSeats.call} onChange={() => void teamSeats.reload()} />
              )}

              {clientTeamMembers.length === 0 ? (
                <CompanyEmptyState
                  icon={UserIcon}
                  title="No team members yet"
                  description={admin ? "Use the add button to add contacts, or invite someone by email." : canManageTeam ? "Invite colleagues by email above." : undefined}
                />
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {clientTeamMembers.map(({ person, projects: assignedProjects }) => (
                    <MobileDataCard
                      key={person.id}
                      ariaLabel={`Open ${person.name}`}
                      title={person.name}
                      subtitle={
                        [person.email, person.phone, assignedProjects.length ? assignedProjects.join(", ") : null]
                          .filter(Boolean)
                          .join(" · ") || "Team member"
                      }
                      imageUrl={person.photoUrl}
                      icon={<UserIcon className="size-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />}
                      menuLabel={`Options for ${person.name}`}
                      menu={canManageTeam && person.id !== appUser?.uid && teamSeats.info?.staff.some((member) => member.id === person.id) ? (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            void teamSeats.removePerson(person.id)
                              .then(() => { setRemovedPersonIds((current) => [...current, person.id]); toast.success(`${person.name} removed from the team.`) })
                              .catch((reason) => toast.error(reason instanceof Error ? reason.message : "Couldn't remove them. Try again."))
                          }}
                        >
                          Remove from team
                        </DropdownMenuItem>
                      ) : undefined}
                    />
                  ))}
                </div>
              )}

              {admin && (
                <Dialog
                  open={teamDialogOpen}
                  onOpenChange={(open) => {
                    if (!teamSaving) setTeamDialogOpen(open)
                  }}
                >
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add team members</DialogTitle>
                      <DialogDescription>Select one or more existing contacts to add to this client&apos;s team.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                      <Input
                        autoFocus
                        value={existingPersonQuery}
                        onChange={(event) => setExistingPersonQuery(event.target.value)}
                        placeholder="Search contacts"
                        aria-label="Search contacts"
                      />
                      {existingContacts.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                          {availableExistingContacts.length ? "No contacts match your search." : "No unassigned contacts available."}
                        </p>
                      ) : (
                        <div className="max-h-72 overflow-y-auto rounded-xl border border-border p-2">
                          <div className="grid gap-1 sm:grid-cols-2">
                            {existingContacts.map((person) => (
                              <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted">
                                <Checkbox
                                  checked={teamContactIds.includes(person.id)}
                                  disabled={teamSaving}
                                  onChange={(event) => {
                                    const checked = event.currentTarget.checked
                                    setTeamContactIds((current) => checked
                                      ? [...current, person.id]
                                      : current.filter((id) => id !== person.id))
                                  }}
                                  aria-label={`Add ${person.name} to the client team`}
                                />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">{person.name}</span>
                                  {person.email && <span className="block truncate text-xs text-muted-foreground">{person.email}</span>}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {teamError && <p className="text-sm text-destructive">{teamError}</p>}

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setTeamDialogOpen(false)} disabled={teamSaving}>Cancel</Button>
                      <Button type="button" onClick={() => void saveTeamMembers()} disabled={teamSaving || teamContactIds.length === 0}>
                        {teamSaving ? "Adding…" : `Add team members${teamContactIds.length > 0 ? ` (${teamContactIds.length})` : ""}`}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}

          {section === "activity" && (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="sr-only">Activity</h2>
                <span className="sidebar-nav-label text-muted-foreground">Activity</span>
              </div>
              <ActivityFeed
                items={activity}
                emptyLabel="No recent activity for this company yet."
                showHeader={false}
                className="mt-4 sm:rounded-none sm:bg-transparent sm:p-0"
              />
            </div>
          )}

          {section === "tasks" && (
            tasksLoading ? (
              <p className="mt-8 text-sm text-muted-foreground" role="status">Loading tasks…</p>
            ) : admin ? (
              <TasksView
                tasks={activityTasks}
                projects={projects}
                companyId={company.id}
                clientName={company.name}
                deleting={deletingTaskId}
                onDelete={handleTaskDelete}
                onPatch={handleTaskPatch}
                onSaved={() => setTaskRevision((current) => current + 1)}
              />
            ) : (
              <section className="mt-5">
                <h2 className="sidebar-nav-label text-muted-foreground">Tasks</h2>
                {activityTasks.length === 0 ? (
                  <CompanyEmptyState icon={ListTodo} title="No shared tasks yet" />
                ) : (
                  <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
                    {activityTasks.map((task) => (
                      <li key={task.id}>
                        <Link
                          href={publicTaskPath(task.id)}
                          scroll={false}
                          className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          aria-label={`View task: ${task.name}`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{task.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {[task.project, task.dueDate ? `Due ${task.dueDate}` : null].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <span className="flex items-center gap-2">
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                              {(taskStatusMeta[task.status] ?? taskStatusMeta.todo).label}
                            </span>
                            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          )}

          {section === "projects" && (
            <div className="mt-5">
              {selectedProject ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedProject(null)}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back to Projects
                  </button>
                  <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em]">{selectedProject.title}</h2>
                  <div className="mt-4">
                    <ProjectDetail
                      project={selectedProject}
                      isAdmin={Boolean(admin)}
                      publicView={!admin}
                      embedded
                      companyId={company.id}
                      clientName={company.name}
                      onProjectPatched={(patch) => setSelectedProject((current) => current ? { ...current, ...patch } : current)}
                      onProjectDeleted={admin ? async () => {
                        await admin.reload()
                        setSelectedProject(null)
                      } : undefined}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <CompanyBookings companyId={company.id} canCancel={!admin && Boolean(user)} />
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="sr-only">Projects</h2>
                    <span className="sidebar-nav-label text-muted-foreground">Projects</span>
                    {admin && <SectionAddButton onClick={() => setCreatingProject(true)} label="New project" />}
                  </div>

                  {projects.length === 0 ? (
                    <CompanyEmptyState
                      icon={Briefcase}
                      title={admin ? "No projects yet" : emptyProjectsLabel}
                      action={admin ? <SectionAddButton onClick={() => setCreatingProject(true)} label="New project" /> : undefined}
                    />
                  ) : (
                    <>
                      <div className="mt-4 space-y-2 sm:hidden">
                        {projects.map((project) => (
                          <MobileDataCard
                            key={project.id}
                            onClick={() => setSelectedProject(project)}
                            ariaLabel={`Open ${project.title}`}
                            title={project.title}
                            subtitle={project.dueDate || "No due date"}
                            icon={<FolderOpen className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                            menuLabel={`Options for ${project.title}`}
                            menu={
                              admin ? (
                                <>
                                  <DropdownMenuItem onSelect={() => { setProjectTitleDraft(project.title); setRenamingProject(project) }}>Rename</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => void handleDuplicateProject(project)}>Duplicate</DropdownMenuItem>
                                  <DropdownMenuItem variant="destructive" onSelect={() => setDeletingProject(project)}>Delete</DropdownMenuItem>
                                </>
                              ) : undefined
                            }
                          />
                        ))}
                      </div>

                      <div className="mt-4 hidden sm:block">
                        <GridCardList>
                          {projects.map((project) => (
                            <GridCard
                              key={project.id}
                              onClick={() => setSelectedProject(project)}
                              ariaLabel={`Open ${project.title}`}
                              title={project.title}
                              icon={<FolderOpen className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                              preview={<ProjectCover project={project} />}
                              menuLabel={`Options for ${project.title}`}
                              menu={
                                admin ? (
                                  <>
                                    <DropdownMenuItem onSelect={() => { setProjectTitleDraft(project.title); setRenamingProject(project) }}>Rename</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => void handleDuplicateProject(project)}>Duplicate</DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" onSelect={() => setDeletingProject(project)}>Delete</DropdownMenuItem>
                                  </>
                                ) : undefined
                              }
                            />
                          ))}
                        </GridCardList>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {section === "media" && (
            <div className="mt-5"><CompanyMedia
              logoUrl={company.logoUrl}
              projects={projects}
              uploaded={company.media ?? []}
              onUploadedChange={
                admin?.onMediaChange ? (urls) => void admin.onMediaChange?.(urls) : undefined
              }
              openAdd={mediaAddOpen}
              onOpenAddChange={setMediaAddOpen}
            /></div>
          )}

          {section === "visitors" && canSeeVisitors && (
            <CompanyVisitors agencyId={visitorAgencyId} companyId={company.id} slug={company.slug || company.id} />
          )}

          {section === "brand-health" && (
            <BusinessHealth
              companyId={company.id}
              details={{
                name: company.name,
                logoUrl: company.logoUrl,
                website: company.website,
                industry: company.industry,
                description: company.description,
                targetCustomers: company.targetCustomers,
                location: company.location,
              }}
              onSave={admin?.onUpdateCompany}
            />
          )}

          {section === "documents" && (
            <div className="mt-5">
              {selectedDocument ? (
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <button
                      type="button"
                      onClick={handleCloseDocument}
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      Back to Documents
                    </button>
                    {canEditDocuments ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={documentEditHref(selectedDocument.kind, selectedDocument.id)}>
                          <Pencil className="size-4" aria-hidden="true" />
                          Edit {selectedDocument.kind}
                        </Link>
                      </Button>
                    ) : !admin ? (
                      <DocumentActions
                        title={`${company.name} ${selectedDocument.kind === "invoice" ? "Invoice" : selectedDocument.kind === "contract" ? "Contract" : selectedDocument.kind === "estimate" ? "Estimate" : "Document"}`}
                      />
                    ) : null}
                  </div>
                  {selectedDocument.kind === "invoice" && (
                    <InvoiceDocument
                      invoice={invoices.find((i) => i.id === selectedDocument.id) as Invoice}
                      issuer={issuer ?? undefined}
                    />
                  )}
                  {selectedDocument.kind === "contract" && (
                    <ContractDocument
                      contract={contracts.find((c) => c.id === selectedDocument.id) as Contract}
                      issuer={issuer ?? undefined}
                    />
                  )}
                  {selectedDocument.kind === "estimate" && (
                    <EstimateDocument
                      estimate={estimates.find((e) => e.id === selectedDocument.id) as Estimate}
                      issuer={issuer ?? undefined}
                    />
                  )}
                  {selectedDocument.kind === "document" && (
                    <CompanyDocumentView
                      document={documents.find((d) => d.id === selectedDocument.id) as CompanyDocument}
                      issuer={issuer ?? undefined}
                    />
                  )}
                </div>
              ) : (
                <CompanyDocuments
                  invoices={invoices}
                  contracts={contracts}
                  estimates={estimates}
                  documents={documents}
                  onSelect={handleSelectDocument}
                  onEdit={canEditDocuments ? handleEditDocument : undefined}
                  canAdd={Boolean(admin)}
                  onAdd={handleAddDocument}
                />
              )}
            </div>
          )}
      </div>

      {!admin && (
        <Dialog open={Boolean(viewingTask)} onOpenChange={(open) => { if (!open) updateParams({ task: null }, true) }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            {viewingTask && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-11 top-2.5 size-8 text-muted-foreground hover:text-foreground"
                onClick={() => void copyPublicTaskLink(viewingTask)}
                aria-label="Copy task link"
                title="Copy task link"
              >
                <Share2 className="size-4" aria-hidden="true" />
              </Button>
            )}
            <DialogHeader className="pr-20">
              <DialogTitle>{viewingTask?.name || "Task"}</DialogTitle>
              <DialogDescription className="sr-only">Task details</DialogDescription>
            </DialogHeader>
            {viewingTask && (
              <div className="space-y-5">
                <dl className="grid gap-4 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Project</dt>
                    <dd className="mt-1 font-medium text-foreground">{viewingTask.project || "No project"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="mt-1 font-medium text-foreground">{(taskStatusMeta[viewingTask.status] ?? taskStatusMeta.todo).label}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Due date</dt>
                    <dd className="mt-1 font-medium text-foreground">{viewingTask.dueDate || "No due date"}</dd>
                  </div>
                </dl>
                <section>
                  <h3 className="text-sm font-medium text-foreground">Content</h3>
                  {viewingTaskError ? (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>Couldn’t load the task content.</p>
                      <button type="button" className="mt-2 font-medium text-foreground underline underline-offset-4" onClick={() => setViewingTaskRetry((value) => value + 1)}>Try again</button>
                    </div>
                  ) : viewingTaskContent === null ? (
                    <p className="mt-2 text-sm text-muted-foreground" role="status">Loading content…</p>
                  ) : (
                    <TaskContent value={viewingTaskContent} className="mt-2" />
                  )}
                </section>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {admin && (
        <>
          <Dialog open={logoEditOpen} onOpenChange={setLogoEditOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Company image</DialogTitle>
                <DialogDescription>Choose the image shown beside the company name.</DialogDescription>
              </DialogHeader>
              <ImageDropzone
                compact
                label="Logo"
                value={company.logoUrl || ""}
                onChange={(url) => {
                  void admin.onUpdateCompany({ logoUrl: url }).then(() => setLogoEditOpen(false))
                }}
              />
            </DialogContent>
          </Dialog>

          <NewDocumentDialog
            open={creatingDocument}
            onOpenChange={setCreatingDocument}
            initialCompanyId={company.id}
          />

          <NewPersonDialog
            open={addingPerson}
            onOpenChange={setAddingPerson}
            fixedRole="client"
            subjectNoun="contact"
            joinWorkspaceId={company.id}
            joinWorkspaceName={company.name}
            onSaved={async () => {
              setAddingPerson(false)
              await admin.reload()
            }}
          />

          <Dialog
            open={selectingExistingPerson}
            onOpenChange={(open) => {
              setSelectingExistingPerson(open)
              if (!open) setExistingPersonQuery("")
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Select existing contact</DialogTitle>
                <DialogDescription>Choose a contact already in VisualHQ to add to this company.</DialogDescription>
              </DialogHeader>
              <Input
                autoFocus
                value={existingPersonQuery}
                onChange={(event) => setExistingPersonQuery(event.target.value)}
                placeholder="Search contacts"
                aria-label="Search contacts"
              />
              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                {existingContacts.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {availableExistingContacts.length ? "No contacts match your search." : "No existing contacts available."}
                  </p>
                ) : (
                  existingContacts.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      disabled={addingExistingPersonId !== null}
                      onClick={() => void handleAddExistingPerson(person.id)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-left outline-none last:border-b-0 hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{person.name}</span>
                        {person.subtitle && <span className="block truncate text-xs text-muted-foreground">{person.subtitle}</span>}
                      </span>
                      {addingExistingPersonId === person.id && <span className="shrink-0 text-xs text-muted-foreground">Adding…</span>}
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <UserEditorSheet
            open={Boolean(editingPerson)}
            user={editingPerson}
            subjectNoun="user"
            onClose={() => setEditingPerson(null)}
            onSaved={async () => {
              setEditingPerson(null)
              await admin.reload()
            }}
          />

          <AlertDialog
            open={Boolean(pendingRemove)}
            onOpenChange={(open) => !open && !removing && setPendingRemove(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove person?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes {pendingRemove?.displayName || pendingRemove?.email || "this person"}&apos;s login.
                  Projects, tasks, and documents stay with the company. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={removing}
                  onClick={(event) => {
                    event.preventDefault()
                    void handleRemovePerson()
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {removing ? "Removing…" : "Remove person"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog
            open={Boolean(renamingProject)}
            onOpenChange={(open) => !open && !projectActionBusy && setRenamingProject(null)}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Rename project</DialogTitle>
                <DialogDescription>Choose a new name for {renamingProject?.title}.</DialogDescription>
              </DialogHeader>
              <Input
                value={projectTitleDraft}
                onChange={(event) => setProjectTitleDraft(event.target.value)}
                maxLength={120}
                autoFocus
                aria-label="Project name"
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setRenamingProject(null)} disabled={projectActionBusy}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleRenameProject()}
                  disabled={projectActionBusy || !projectTitleDraft.trim() || projectTitleDraft.trim() === renamingProject?.title}
                >
                  {projectActionBusy ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={Boolean(deletingProject)}
            onOpenChange={(open) => !open && !projectActionBusy && setDeletingProject(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {deletingProject?.title}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the project and every task filed under it. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={projectActionBusy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={projectActionBusy}
                  onClick={(event) => {
                    event.preventDefault()
                    void handleDeleteProject()
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {projectActionBusy ? "Deleting…" : "Delete project"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <NewProjectDialog
            open={creatingProject}
            onOpenChange={setCreatingProject}
            initialCompanyId={company.id}
            onCreated={async (project) => {
              await admin.reload()
              setSelectedProject(project)
            }}
          />

          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Share company page</DialogTitle>
                <DialogDescription>Control what {company.name} sees after signing in, then share their company page link.</DialogDescription>
              </DialogHeader>
              <ShareLink value={absoluteUrl(admin.sharePath)} label="Company link" />
              <p className="text-xs text-muted-foreground">Clients sign in with their invited account. Previously shared company links continue to open this company page.</p>
              <div className="border-t border-border pt-4">
                <PortalPublishingPanel companyId={company.id} projects={projects} people={people} active={shareOpen} />
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      {admin && <div className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />}
    </main>
  )
}

function ShareLink({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Input
        readOnly
        value={value}
        aria-label={label}
        className="font-mono text-xs"
        onClick={(event) => event.currentTarget.select()}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0"
        onClick={() => {
          void navigator.clipboard.writeText(value)
          toast.success("Link copied to clipboard")
        }}
      >
        Copy link
      </Button>
    </div>
  )
}
