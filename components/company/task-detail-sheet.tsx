"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Share2 } from "lucide-react"
import { toast } from "sonner"

import { useCompanyPage } from "@/components/company/company-page-context"
import { TaskContent } from "@/components/dashboard/task-content"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { taskStatusMeta } from "@/lib/tasks"

/** Keeps task details in the current company surface instead of routing away. */
export function TaskDetailSheet() {
  const { company, admin, tasks, sectionHref, updateParams, absoluteUrl } = useCompanyPage()
  const searchParams = useSearchParams()
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
  }, [admin, company.id, viewingTask?.content, viewingTaskId, retry])

  function taskHref(id: string) {
    return sectionHref("tasks", { task: id })
  }

  async function copyTaskLink() {
    if (!viewingTask) return
    try {
      await navigator.clipboard.writeText(absoluteUrl(taskHref(viewingTask.id)))
      toast.success("Task link copied")
    } catch {
      toast.error("Couldn’t copy the task link.")
    }
  }

  return (
    <Sheet open={Boolean(viewingTask)} onOpenChange={(open) => { if (!open) updateParams({ task: null }, true) }}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {viewingTask && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-11 top-2.5 size-8 text-muted-foreground hover:text-foreground"
            onClick={() => void copyTaskLink()}
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
}
