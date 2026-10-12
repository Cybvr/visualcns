"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { DollarSign, FileText, House, Images, ListTodo, Mail, MoreVertical, Palette, Settings, Share2, Users, type LucideIcon } from "lucide-react"

import { CampaignBrief } from "@/components/dashboard/campaign-brief"
import { CampaignCreatives } from "@/components/dashboard/campaign-creatives"
import { CampaignHome, type CampaignTab } from "@/components/dashboard/campaign-home"
import { CampaignPeople } from "@/components/dashboard/campaign-people"
import { CampaignPayments } from "@/components/dashboard/campaign-payments"
import { CampaignSettings } from "@/components/dashboard/campaign-settings"
import { CaseStudyForm } from "@/components/dashboard/case-study-form"
import { ProjectShareButton } from "@/components/dashboard/project-share-button"
import { ProjectTeamPicker } from "@/components/dashboard/project-team-picker"
import { TasksView } from "@/components/dashboard/tasks-view"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { usePageHeaderActions, usePageHeaderTitle } from "@/components/dashboard/page-title-context"
import { watchCampaignCreatives, type CampaignCreative } from "@/lib/campaign-creatives"
import { onRoster, watchCampaignPeople, type CampaignPerson } from "@/lib/campaign-people"
import type { Invoice } from "@/lib/billing"
import { buildEmailComposeHref } from "@/lib/email-composer"
import { deleteProjectWithTasks, renameProject, slugify, type Project } from "@/lib/projects"
import { deleteTask, getTasksByCompanyId, tsToMillis, updateTask, type Task } from "@/lib/tasks"
import { cn } from "@/lib/utils"
import { companyPath } from "@/lib/navigation"

interface ProjectDetailProps {
  project: Project
  isAdmin: boolean
  publicView?: boolean
  companyId?: string
  clientName?: string
  embedded?: boolean
  onProjectPatched?: (patch: Partial<Project>) => void
  onProjectDeleted?: () => void | Promise<void>
  /** Signed-in agency admins on the public page, who can manage people and creatives without the admin view. */
  canEditCampaign?: boolean
  /** The client's own signed-in people, who can edit post text and approve it. */
  canReview?: boolean
  /** Invoices raised for this campaign, and where each one opens. */
  invoices?: Invoice[]
  invoiceHref?: (invoice: Invoice) => string
  /** The job's shared tasks for the public view, which can't edit them. */
  publicTasks?: ReactNode
}

/**
 * The full single-project workspace: cover, share/view actions, and the
 * Tasks/About tabs for admins on the standalone project workspace. The
 * company Projects tab routes here so the project has one focused surface.
 */
export function ProjectDetail({
  project,
  isAdmin,
  publicView = false,
  companyId = "",
  clientName = "",
  embedded = false,
  onProjectPatched,
  onProjectDeleted,
  publicTasks,
  canEditCampaign = isAdmin,
  canReview = canEditCampaign,
  invoices = [],
  invoiceHref,
}: ProjectDetailProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const [tab, setTab] = useState<CampaignTab>("home")
  const [people, setPeople] = useState<CampaignPerson[]>([])

  useEffect(() => watchCampaignPeople(project.id, setPeople, () => setPeople([])), [project.id])
  const [creatives, setCreatives] = useState<CampaignCreative[]>([])
  useEffect(() => watchCampaignCreatives(project.id, setCreatives, () => setCreatives([])), [project.id])
  // Suggested creators wait in Roster matching; everything else counts only the roster.
  const roster = people.filter(onRoster)
  const contentItems = creatives.filter((item) => item.kind !== "media")
  const mediaItems = creatives.filter((item) => item.kind === "media")
  const [shareOpen, setShareOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(project.title)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleSaving, setTitleSaving] = useState(false)

  useEffect(() => {
    setTitleDraft(project.title)
  }, [project.id, project.title])

  const saveTitle = useCallback(async () => {
    const nextTitle = titleDraft.trim()
    if (!nextTitle || nextTitle === project.title || titleSaving) {
      setTitleDraft(project.title)
      setTitleEditing(false)
      return
    }

    setTitleSaving(true)
    try {
      await renameProject(project.id, nextTitle)
      onProjectPatched?.({ title: nextTitle, slug: slugify(nextTitle) })
      setTitleEditing(false)
    } catch (error) {
      console.error("Error renaming project:", error)
      setTitleDraft(project.title)
    } finally {
      setTitleSaving(false)
    }
  }, [onProjectPatched, project.id, project.title, titleDraft, titleSaving])

  const titleNode = useMemo(
    () => titleEditing ? (
      <input
        autoFocus
        value={titleDraft}
        disabled={titleSaving}
        aria-label="Project name"
        onChange={(event) => setTitleDraft(event.target.value)}
        onBlur={() => void saveTitle()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            void saveTitle()
          }
          if (event.key === "Escape") {
            setTitleDraft(project.title)
            setTitleEditing(false)
          }
        }}
        className="h-9 w-full min-w-0 bg-transparent px-0 text-inherit outline-none placeholder:text-current/60"
      />
    ) : (
      <button
        type="button"
        onClick={() => setTitleEditing(true)}
        title="Rename project"
        className="block max-w-full truncate text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {project.title}
      </button>
    ),
    [project.title, saveTitle, titleDraft, titleEditing, titleSaving],
  )

  usePageHeaderTitle(!embedded && isAdmin ? titleNode : null)

  const fetchTasks = useCallback(async () => {
    if (publicView) {
      setTasks([])
      return
    }
    // Tasks are fetched by client and narrowed here, reusing the same query
    // the rest of the dashboard already runs.
    const all = await getTasksByCompanyId(project.companyId)
    const mine = all.filter((task) => task.projectId === project.id)
    mine.sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt))
    setTasks(mine)
  }, [project.companyId, project.id, publicView])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteTask(id)
      setTasks((current) => current.filter((task) => task.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  async function handlePatch(id: string, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)))
    try {
      await updateTask(id, patch)
    } catch {
      await fetchTasks()
    }
  }

  async function handleDeleteProject() {
    if (!onProjectDeleted) return
    await deleteProjectWithTasks(project.id)
    await onProjectDeleted()
  }

  const headerActions = useMemo(() => {
    if (!isAdmin) return null

    return (
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More actions"
              title="More actions"
              className="flex size-10 items-center justify-center rounded-xl text-current outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreVertical className="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link
                href={buildEmailComposeHref({
                  companyId: project.companyId || companyId,
                  companyName: project.client || clientName,
                  projectId: project.id,
                  projectName: project.title,
                  documentType: "project",
                  documentId: project.id,
                  subject: `${project.title} update`,
                  ctaText: "Open company page",
                  ctaUrl: companyPath(project.companyId || companyId),
                })}
              >
                <Mail className="size-4" aria-hidden="true" />
                Send project update
              </Link>
            </DropdownMenuItem>
            {!publicView && (
              <DropdownMenuItem onSelect={() => setShareOpen(true)}>
                <Share2 className="size-4" aria-hidden="true" />
                {project.isPublic ? "Update sharing" : "Share project"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {!publicView && (
          <ProjectShareButton
            project={project}
            stepCount={tasks.length}
            onChanged={fetchTasks}
            open={shareOpen}
            onOpenChange={setShareOpen}
            showTrigger={false}
          />
        )}
      </div>
    )
  }, [clientName, companyId, fetchTasks, isAdmin, project, publicView, shareOpen, tasks.length])

  usePageHeaderActions(embedded ? null : headerActions)

  const tasksPanel = (
    <TasksView
      tasks={tasks}
      projects={[project]}
      companyId={project.companyId || companyId}
      clientName={project.client || clientName}
      canDuplicate={isAdmin}
      deleting={deleting}
      onDelete={handleDelete}
      onPatch={handlePatch}
      onSaved={fetchTasks}
    />
  )

  return (
    <div className="space-y-4">
      {isAdmin || publicView ? (
        <div className="flex flex-col gap-4 md:flex-row md:gap-8">
          <nav className="-mx-1 flex shrink-0 gap-1 overflow-x-auto px-1 md:mx-0 md:w-48 md:flex-col md:overflow-visible md:px-0" aria-label="Campaign sections">
            {([
              { key: "home", label: "Home", icon: House },
              { key: "about", label: "Brief", icon: FileText },
              { key: "people", label: "Creators", count: roster.length, icon: Users },
              { key: "creatives", label: "Content", count: contentItems.length, icon: Palette },
              { key: "media", label: "Media", count: mediaItems.length, icon: Images },
              { key: "payments", label: "Payments", icon: DollarSign },
              ...(publicView && !publicTasks ? [] : [{ key: "tasks", label: "Tasks", icon: ListTodo }]),
              ...(canEditCampaign ? [{ key: "settings", label: "Settings", icon: Settings }] : []),
            ] as { key: typeof tab; label: string; count?: number; icon: LucideIcon }[]).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-current={tab === item.key ? "page" : undefined}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  tab === item.key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
                {item.count ? <span className="ml-auto pl-2 text-xs tabular-nums text-muted-foreground">{item.count}</span> : null}
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1">
            {tab === "home" ? (
              <CampaignHome
                people={roster}
                content={contentItems}
                canReview={canReview}
                onOpen={setTab}
              />
            ) : tab === "about" ? (
              <CampaignBrief project={project} content={contentItems} canEdit={canEditCampaign} onPatched={onProjectPatched} />
            ) : tab === "people" ? (
              <CampaignPeople
                people={people}
                agencyId={project.agencyId}
                companyId={project.companyId || companyId}
                projectId={project.id}
                canEdit={canEditCampaign}
                canReview={canReview}
                project={project}
                content={contentItems}
                onPatched={onProjectPatched}
              />
            ) : tab === "creatives" || tab === "media" ? (
              <CampaignCreatives
                key={tab}
                kind={tab === "media" ? "media" : "content"}
                creatives={tab === "media" ? mediaItems : contentItems}
                agencyId={project.agencyId}
                companyId={project.companyId || companyId}
                projectId={project.id}
                canEdit={canEditCampaign}
                canReview={canReview}
              />
            ) : tab === "payments" ? (
              <CampaignPayments
                people={roster}
                invoices={invoices}
                canEdit={canEditCampaign}
                invoiceHref={invoiceHref}
              />
            ) : tab === "settings" ? (
              <div className="space-y-10">
                <CampaignSettings project={project} onPatched={onProjectPatched} />
                {isAdmin && (
                  <div className="max-w-2xl space-y-6 border-t border-border pt-8">
                    <ProjectTeamPicker project={project} onPatched={onProjectPatched} />
                    <CaseStudyForm project={project} onSaved={onProjectPatched} onDelete={handleDeleteProject} />
                  </div>
                )}
              </div>
            ) : (
              publicView ? publicTasks : tasksPanel
            )}
          </div>
        </div>
      ) : (
        <div className="min-w-0">{tasksPanel}</div>
      )}
    </div>
  )
}
