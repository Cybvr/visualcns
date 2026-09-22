"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowUpRight, CalendarDays, FolderKanban } from "lucide-react"

import { TaskEditorSheet } from "@/components/dashboard/task-editor-sheet"
import { taskPriorityMeta, taskStatusMeta, type Task } from "@/lib/tasks"
import { cn } from "@/lib/utils"

function formatDueDate(value: string) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function HomeTaskList({
  tasks,
  onSaved,
  className,
}: {
  tasks: Task[]
  onSaved: () => void | Promise<void>
  className?: string
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingTask = editingId ? tasks.find((task) => task.id === editingId) ?? null : null

  return (
    <section className={cn("mt-8 min-w-0", className)} aria-labelledby="home-tasks-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="home-tasks-heading" className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Tasks
        </h2>
        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          View all
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-3 border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
          No tasks yet.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2">
          {tasks.map((task) => {
            const status = taskStatusMeta[task.status] ?? taskStatusMeta.todo
            const priority = taskPriorityMeta[task.priority] ?? taskPriorityMeta.medium
            const dueDate = formatDueDate(task.dueDate)

            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => setEditingId(task.id)}
                  aria-haspopup="dialog"
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{task.name}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}>
                        {status.label}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${priority.className}`}>
                        {priority.label}
                      </span>
                    </div>
                  </div>

                  {(task.project || dueDate) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {task.project && (
                        <span className="inline-flex items-center gap-2">
                          <FolderKanban className="size-4" aria-hidden="true" />
                          {task.project}
                        </span>
                      )}
                      {dueDate && (
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="size-4" aria-hidden="true" />
                          Due {dueDate}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <TaskEditorSheet
        open={editingTask !== null}
        task={editingTask}
        companyId={editingTask?.companyId ?? ""}
        clientName={editingTask?.client ?? ""}
        onClose={() => setEditingId(null)}
        onSaved={onSaved}
      />
    </section>
  )
}
