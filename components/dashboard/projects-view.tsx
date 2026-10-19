"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { FaFolderOpen } from "react-icons/fa"

import { FirstRunState } from "@/components/dashboard/empty-state"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { MobileCardsSkeleton } from "@/components/dashboard/collection-skeletons"
import { ReactIcon } from "@/components/react-icon"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { deleteProjectWithTasks, duplicateProject, projectSlug, renameProject, type Project } from "@/lib/projects"
import { getTasksByProjectAndCompanyId, taskStatusMeta, type Task } from "@/lib/tasks"

export function ProjectsView({
  projects,
  onChanged,
  onNewProject,
  hideHeader = false,
  minimal = false,
  loading = false,
}: {
  projects: Project[]
  onChanged?: () => Promise<void>
  /** Opens a quick-create dialog instead of navigating to /dashboard/projects?new=1. */
  onNewProject?: () => void
  /** Home page: the tab label already provides the section heading. */
  hideHeader?: boolean
  /** Home page: skip the pitch copy and support line in the empty state. */
  minimal?: boolean
  loading?: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<Project | null>(null)
  const [previewTasks, setPreviewTasks] = useState<Task[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const previewRequest = useRef(0)

  async function openTaskPreview(project: Project) {
    const request = ++previewRequest.current
    setPreviewing(project)
    setPreviewTasks([])
    setPreviewError(null)
    setPreviewLoading(true)
    try {
      const tasks = await getTasksByProjectAndCompanyId(project.id, project.companyId)
      if (request === previewRequest.current) setPreviewTasks(tasks)
    } catch (caughtError) {
      console.error("Error loading project task preview:", caughtError)
      if (request === previewRequest.current) setPreviewError("Tasks couldn’t be loaded. Try again.")
    } finally {
      if (request === previewRequest.current) setPreviewLoading(false)
    }
  }

  function closeTaskPreview() {
    previewRequest.current += 1
    setPreviewing(null)
    setPreviewTasks([])
    setPreviewError(null)
    setPreviewLoading(false)
  }

  async function run(action: () => Promise<unknown>, failure: string) {
    setError(null)
    try {
      await action()
      await onChanged?.()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : failure)
    }
  }

  return (
    <section id="projects" className={cn(hideHeader ? "mt-0" : "mt-4", "scroll-mt-20")}>
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-medium text-muted-foreground">Projects</h2>
          {!loading && <span className="text-xs font-medium text-muted-foreground">{projects.length}</span>}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-2"><MobileCardsSkeleton rows={4} /></div>
      ) : projects.length === 0 ? (
        <FirstRunState
          className="mt-4"
          label="Project"
          title="No projects yet"
          description={minimal ? undefined : "Projects created for you will show up here, with their tasks and progress alongside."}
          help={minimal ? null : undefined}
          action={
            onNewProject ? (
              <Button onClick={onNewProject}>New Project</Button>
            ) : (
              <Button asChild>
                <Link href="/dashboard/projects?new=1">New Project</Link>
              </Button>
            )
          }
        />
      ) : (
      <>
        <div className="mt-2 space-y-2">
          {projects.map((project) => {
            return (
              <MobileDataCard
                key={project.id}
                title={project.title}
                subtitle={project.dueDate || "No due date"}
                icon={<ReactIcon icon={FaFolderOpen} className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                href={`/dashboard/projects/${projectSlug(project)}`}
                ariaLabel={`Open ${project.title}`}
                menuLabel={`Options for ${project.title}`}
                actions={onChanged ? {
                  noun: "project",
                  name: project.title,
                  onRename: (title) => run(() => renameProject(project.id, title), "The project could not be renamed."),
                  onDuplicate: () => run(() => duplicateProject(project), "The project could not be duplicated."),
                  extra: <DropdownMenuItem onSelect={() => openTaskPreview(project)}>Preview tasks</DropdownMenuItem>,
                  onDelete: () => run(() => deleteProjectWithTasks(project.id), "The project could not be deleted."),
                  deleteMessage: "This removes the project and every task filed under it. It cannot be undone.",
                } : undefined}
              />
            )
          })}
        </div>
      </>
      )}

      <Sheet open={Boolean(previewing)} onOpenChange={(open) => !open && closeTaskPreview()}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle>{previewing?.title}</SheetTitle>
            <SheetDescription>
              {previewLoading
                ? "Loading task preview…"
                : `${previewTasks.length} ${previewTasks.length === 1 ? "task" : "tasks"}`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 p-5">
            {previewLoading ? (
              <div role="status" aria-label="Loading tasks" className="space-y-3 py-10">
                <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-4/5" />
              </div>
            ) : previewError ? (
              <div className="py-8">
                <p role="alert" className="text-sm text-destructive">{previewError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => previewing && openTaskPreview(previewing)}
                >
                  Try again
                </Button>
              </div>
            ) : previewTasks.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium">No tasks yet</p>
                <p className="mt-1 text-sm text-muted-foreground">No tasks yet.</p>
              </div>
            ) : (
              <ol className="divide-y divide-border">
                {previewTasks.map((task, index) => {
                  const meta = taskStatusMeta[task.status]
                  return (
                    <li key={task.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-3 py-3 first:pt-0">
                      <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-medium leading-5 text-foreground">{task.name}</p>
                        {task.dueDate && <p className="mt-1 text-xs text-muted-foreground">Due {task.dueDate}</p>}
                      </div>
                      <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", meta.className)}>
                        {meta.label}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {previewing && (
            <div className="border-t border-border p-4">
              <Button asChild className="w-full">
                <Link href={`/dashboard/projects/${projectSlug(previewing)}`}>Open project</Link>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}
