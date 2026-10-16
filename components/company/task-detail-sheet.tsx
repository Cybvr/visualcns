"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Send } from "lucide-react"
import { toast } from "sonner"

import { useCompanyPage } from "@/components/company/company-page-context"
import { StatusHistory } from "@/components/dashboard/status-history"
import { TaskContent } from "@/components/dashboard/task-content"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getStatusHistory, type StatusEvent } from "@/lib/status-history"
import { taskStatusMeta } from "@/lib/tasks"
import { useAuth } from "@/components/auth-provider"

/** Keeps task details in the current company surface instead of routing away. */
export function TaskDetailSheet() {
  const { tasks, sectionHref, updateParams, absoluteUrl, isAdmin } = useCompanyPage()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const viewingTaskId = searchParams.get("task")
  const viewingTask = viewingTaskId ? tasks.find((task) => task.id === viewingTaskId) ?? null : null
  const [history, setHistory] = useState<StatusEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (!isAdmin || !user || !viewingTask?.id) {
      setHistory([])
      setHistoryLoading(false)
      return
    }
    let active = true
    setHistoryLoading(true)
    void getStatusHistory("task", viewingTask.id)
      .then((events) => { if (active) setHistory(events) })
      .catch(() => { if (active) setHistory([]) })
      .finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [isAdmin, user, viewingTask?.id])

  function taskHref(id: string) {
    return sectionHref("projects", { task: id })
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
            <Send className="size-4" aria-hidden="true" />
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
              <TaskContent value={viewingTask.content || ""} className="mt-2" />
            </section>
            {isAdmin && <StatusHistory events={history} loading={historyLoading} labels={Object.fromEntries(Object.entries(taskStatusMeta).map(([key, meta]) => [key, meta.label]))} />}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
