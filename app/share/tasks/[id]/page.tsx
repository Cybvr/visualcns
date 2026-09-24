"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Badge } from "@/components/inline-table-cells"
import { TaskContent } from "@/components/dashboard/task-content"
import { getTask, taskPriorityMeta, taskStatusMeta, type Task } from "@/lib/tasks"

export default function SharedTaskPage() {
  const { id } = useParams<{ id: string }>()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let active = true
    getTask(id)
      .then((found) => {
        if (active) {
          setTask(found && (found.shareEnabled || found.isPublic) ? found : null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setTask(null)
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [id])

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-muted/30"><Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" /></main>
  }

  if (!task) {
    return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4"><p className="text-sm text-muted-foreground">This task link is no longer available.</p></main>
  }

  const status = taskStatusMeta[task.status] ?? taskStatusMeta.todo
  const priority = taskPriorityMeta[task.priority] ?? taskPriorityMeta.medium

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">VisualHQ task</p>
            <p className="mt-1 text-xs text-muted-foreground">{task.client || "Shared task"}{task.project ? ` · ${task.project}` : ""}</p>
          </div>
          <Badge className={status.className}>{status.label}</Badge>
        </div>
        <article className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <header className="border-b border-border px-6 py-7 sm:px-8">
            <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{task.name || "Untitled task"}</h1>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>Client: {task.client || "—"}</span>
              <span>Project: {task.project || "—"}</span>
              <span>Priority: {priority.label}</span>
              {task.dueDate && <span>Due: {task.dueDate}</span>}
            </div>
          </header>
          <div className="px-6 py-7 sm:px-8">
            <h2 className="text-sm font-semibold">Details</h2>
            <TaskContent value={task.content || ""} className="mt-3" />
          </div>
        </article>
        <p className="mt-6 text-center text-xs text-muted-foreground">Shared publicly by VisualHQ</p>
      </div>
    </main>
  )
}
