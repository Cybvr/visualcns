"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowUpRight, ListTodo } from "lucide-react"

import { TaskEditorSheet } from "@/components/dashboard/task-editor-sheet"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { Task } from "@/lib/tasks"
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
            const dueDate = formatDueDate(task.dueDate)
            return (
              <li key={task.id}>
                <MobileDataCard
                  variant="task"
                  title={task.name}
                  subtitle={[task.project, dueDate ? `Due ${dueDate}` : ""].filter(Boolean).join(" · ") || undefined}
                  icon={<ListTodo className="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
                  onClick={() => setEditingId(task.id)}
                  ariaLabel={`Open ${task.name}`}
                  menuLabel={`Options for ${task.name}`}
                  menu={<DropdownMenuItem onSelect={() => setEditingId(task.id)}>Edit task</DropdownMenuItem>}
                />
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
