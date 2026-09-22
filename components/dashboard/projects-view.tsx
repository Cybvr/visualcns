"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Plus } from "lucide-react"

import { FirstRunState } from "@/components/dashboard/empty-state"
import { ProjectCard } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  deleteProjectWithTasks,
  duplicateProject,
  projectSlug,
  projectStatusMeta,
  renameProject,
  type Project,
} from "@/lib/projects"
import { getTasksByProjectAndCompanyId, taskStatusMeta, type Task } from "@/lib/tasks"

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
    </div>
  )
}

export function ProjectsView({
  projects,
  onChanged,
  onNewProject,
  minimal = false,
}: {
  projects: Project[]
  onChanged?: () => Promise<void>
  /** Opens a quick-create dialog instead of navigating to /dashboard/projects?new=1. */
  onNewProject?: () => void
  /** Home page: skip the pitch copy and support line in the empty state. */
  minimal?: boolean
}) {
  const [renaming, setRenaming] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)
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
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChanged?.()
      setRenaming(null)
      setDeleting(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : failure)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="projects" className="mt-4 scroll-mt-20">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">Projects</h2>
        <span className="text-xs font-medium text-muted-foreground">{projects.length}</span>
      </div>

      {error && !renaming && !deleting && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {projects.length === 0 ? (
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
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {projects.map((project) => {
          const meta = projectStatusMeta[project.status]
          return (
            <ProjectCard
              key={project.id}
              project={project}
              href={`/dashboard/projects/${projectSlug(project)}`}
              footer={
                <>
                  <span
                    className={cn("mb-2 inline-block w-fit rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}
                  >
                    {meta.label}
                  </span>
                  <ProgressBar value={project.progress} />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{project.progress}%</span>
                    <span className="truncate">Due {project.dueDate}</span>
                  </div>
                </>
              }
              menu={
                onChanged ? (
                  <>
                    <DropdownMenuItem onSelect={() => openTaskPreview(project)}>
                      Preview tasks
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        setTitle(project.title)
                        setError(null)
                        setRenaming(project)
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        run(() => duplicateProject(project), "The project could not be duplicated.")
                      }}
                    >
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => {
                        setError(null)
                        setDeleting(project)
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : undefined
              }
            />
          )
        })}

        {onNewProject ? (
          <button
            type="button"
            onClick={onNewProject}
            className="group flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-border bg-card p-4 text-center outline-none transition-colors hover:border-foreground/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover:scale-105">
              <Plus className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-foreground">Create a new project</span>
          </button>
        ) : (
          <Link
            href="/dashboard/projects?new=1"
            className="group flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-border bg-card p-4 text-center outline-none transition-colors hover:border-foreground/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover:scale-105">
              <Plus className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-foreground">Create a new project</span>
          </Link>
        )}
      </div>
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
              <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading tasks…
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
                <p className="mt-1 text-sm text-muted-foreground">Add tasks to build this project’s workflow.</p>
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

      <Dialog open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-project">Project name</Label>
            <Input
              id="rename-project"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy || !title.trim() || title.trim() === renaming?.title}
              onClick={() =>
                renaming && run(() => renameProject(renaming.id, title.trim()), "The project could not be renamed.")
              }
            >
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.title}?</DialogTitle>
            <DialogDescription>
              This removes the project and every task filed under it. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                deleting && run(() => deleteProjectWithTasks(deleting.id), "The project could not be deleted.")
              }
            >
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
