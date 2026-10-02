"use client"

import Link from "next/link"
import { ChevronRight, ListTodo } from "lucide-react"

import { CompanyEmptyState } from "@/components/company/empty-state"
import { useCompanyPage } from "@/components/company/company-page-context"
import { TaskDetailSheet } from "@/components/company/task-detail-sheet"
import { TasksView } from "@/components/dashboard/tasks-view"
import { taskStatusMeta } from "@/lib/tasks"

export function TasksSection() {
  const { company, projects, admin, tasks, tasksLoading, deletingTaskId, patchTask, removeTask, refreshTasks, sectionHref } = useCompanyPage()

  function taskHref(id: string) {
    return sectionHref("tasks", { task: id })
  }

  if (tasksLoading) return <p className="mt-8 text-sm text-muted-foreground" role="status">Loading tasks…</p>

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
    /><TaskDetailSheet /></>
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
      <TaskDetailSheet />
    </section>
  )
}
