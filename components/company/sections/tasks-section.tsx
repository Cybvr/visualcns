"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronRight, ListTodo, Share2 } from "lucide-react"
import { toast } from "sonner"

import { CompanyEmptyState } from "@/components/company/empty-state"
import { useCompanyPage } from "@/components/company/company-page-context"
import { TaskContent } from "@/components/dashboard/task-content"
import { TasksView } from "@/components/dashboard/tasks-view"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { taskStatusMeta, type Task } from "@/lib/tasks"

export function TasksSection() {
  const { company, projects, admin, tasks, tasksLoading, deletingTaskId, patchTask, removeTask, refreshTasks, sectionHref, updateParams, absoluteUrl } = useCompanyPage()
  const searchParams = useSearchParams()

  // Shared task links open the task over the list as ?task={id}.
  const viewingTaskId = searchParams.get("task")
  const viewingTask = viewingTaskId ? tasks.find((task) => task.id === viewingTaskId) ?? null : null
  const [content, setContent] = useState<string | null>(null)
  const [contentError, setContentError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!viewingTaskId) {
      setContent(null)
      setContentError(false)
      return
    }
    setContent(null)
    setContentError(false)
    if (admin) {
      setContent(viewingTask?.content || "")
      return
    }
    const controller = new AbortController()
    fetch(`/api/organizations/public/task-content?companyId=${encodeURIComponent(company.id)}&taskId=${encodeURIComponent(viewingTaskId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Task content unavailable")
        return response.json() as Promise<{ content: string }>
      })
      .then((result) => setContent(result.content))
      .catch(() => { if (!controller.signal.aborted) setContentError(true) })
    return () => controller.abort()
  }, [admin, company.id, viewingTask, viewingTaskId, retry])

  function taskHref(id: string) {
    return sectionHref("tasks", { task: id })
  }

  async function copyTaskLink(task: Task) {
    try {
      await navigator.clipboard.writeText(absoluteUrl(taskHref(task.id)))
      toast.success("Task link copied")
    } catch {
      toast.error("Couldn’t copy the task link.")
    }
  }

  if (tasksLoading) return <p className="mt-8 text-sm text-muted-foreground" role="status">Loading tasks…</p>

  const taskSheet = (
      <Sheet open={Boolean(viewingTask)} onOpenChange={(open) => { if (!open) updateParams({ task: null }, true) }}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
          {viewingTask && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-11 top-2.5 size-8 text-muted-foreground hover:text-foreground"
              onClick={() => void copyTaskLink(viewingTask)}
              aria-label="Copy task link"
              title="Copy task link"
            >
              <Share2 className="size-4" aria-hidden="true" />
            </Button>
          )}
          <SheetHeader className="border-b border-border px-5 py-4 pr-20">
            <SheetTitle>{viewingTask?.name || "Task"}</SheetTitle>
            <SheetDescription className="sr-only">Task details</SheetDescription>
          </SheetHeader>
          {viewingTask && (
            <div className="space-y-5 p-5">
              <dl className="grid grid-cols-1 gap-4 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
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
                {contentError ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>Couldn’t load the task content.</p>
                    <button type="button" className="mt-2 font-medium text-foreground underline underline-offset-4" onClick={() => setRetry((value) => value + 1)}>Try again</button>
                  </div>
                ) : content === null ? (
                  <p className="mt-2 text-sm text-muted-foreground" role="status">Loading content…</p>
                ) : (
                  <TaskContent value={content} className="mt-2" />
                )}
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
  )

  if (admin) {
    return <><TasksView
      tasks={tasks}
      projects={projects}
      companyId={company.id}
      clientName={company.name}
      deleting={deletingTaskId}
      onDelete={removeTask}
      onPatch={patchTask}
      onSaved={refreshTasks}
    />{taskSheet}</>
  }

  return (
    <section className="mt-5">
      <h2 className="sidebar-nav-label text-muted-foreground">Tasks</h2>
      {tasks.length === 0 ? (
        <CompanyEmptyState icon={ListTodo} title="No shared tasks yet" />
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={taskHref(task.id)}
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
      {taskSheet}
    </section>
  )
}
