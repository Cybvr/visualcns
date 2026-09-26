"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Mail, MoreVertical, Share2 } from "lucide-react"

import { CaseStudyForm } from "@/components/dashboard/case-study-form"
import { ProjectShareButton } from "@/components/dashboard/project-share-button"
import { ProjectTeamPicker } from "@/components/dashboard/project-team-picker"
import { TasksView } from "@/components/dashboard/tasks-view"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { usePageHeaderActions, usePageHeaderTitle } from "@/components/dashboard/page-title-context"
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
}: ProjectDetailProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const [tab, setTab] = useState<"tasks" | "about">(publicView ? "about" : "tasks")
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
              className="flex size-10 items-center justify-center rounded-xl text-current outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring max-md:text-primary-foreground max-md:hover:bg-white/10"
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
      deleting={deleting}
      onDelete={handleDelete}
      onPatch={handlePatch}
      onSaved={fetchTasks}
    />
  )

  return (
    <div className="space-y-4">
      {isAdmin || publicView ? (
        <div>
          <nav className="flex gap-6 border-b border-border" aria-label="Project sections">
            {(
              publicView
                ? ([{ key: "about", label: "About" }] as const)
                : ([
                    { key: "tasks", label: "Tasks" },
                    { key: "about", label: "About" },
                  ] as const)
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "relative -mb-px shrink-0 px-0 py-2 text-base font-medium outline-none transition-colors",
                  tab === item.key
                    ? "border-b-2 border-foreground text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 pt-4">
            {tab === "about" ? (
              publicView ? (
                <div className="space-y-5">
                  {project.description || project.excerpt || project.summary ? (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{project.description || project.excerpt || project.summary}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No project description yet.</p>
                  )}
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><span className="text-muted-foreground">Service</span><p className="mt-1 font-medium">{project.service || "Not set"}</p></div>
                    <div><span className="text-muted-foreground">Status</span><p className="mt-1 font-medium">{project.status}</p></div>
                    <div><span className="text-muted-foreground">Progress</span><p className="mt-1 font-medium">{project.progress}%</p></div>
                    <div><span className="text-muted-foreground">Due date</span><p className="mt-1 font-medium">{project.dueDate || "Not set"}</p></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <ProjectTeamPicker project={project} onPatched={onProjectPatched} />
                  <CaseStudyForm
                    project={project}
                    onSaved={onProjectPatched}
                    onDelete={handleDeleteProject}
                  />
                </div>
              )
            ) : (
              tasksPanel
            )}
          </div>
        </div>
      ) : (
        <div className="min-w-0">{tasksPanel}</div>
      )}
    </div>
  )
}
