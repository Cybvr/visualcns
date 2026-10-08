"use client"

import { useRouter } from "next/navigation"
import { ListTodo } from "lucide-react"

import { CompanyEmptyState } from "@/components/company/empty-state"
import { useCompanyPage } from "@/components/company/company-page-context"
import { TaskDetailSheet } from "@/components/company/task-detail-sheet"
import { TasksView } from "@/components/dashboard/tasks-view"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { taskStatusMeta } from "@/lib/tasks"

export function TasksSection() {
  const router = useRouter()
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
        <div className="mt-4 space-y-2">
          {tasks.map((task) => (
            <MobileDataCard
              key={task.id}
              surface="muted"
              icon={<ListTodo className="size-5 text-muted-foreground" aria-hidden="true" />}
              title={task.name}
              subtitle={[task.project, task.dueDate ? `Due ${task.dueDate}` : null].filter(Boolean).join(" · ")}
              trailing={(taskStatusMeta[task.status] ?? taskStatusMeta.todo).label}
              onClick={() => router.push(taskHref(task.id), { scroll: false })}
              ariaLabel={`View task: ${task.name}`}
            />
          ))}
        </div>
      )}
      <TaskDetailSheet />
    </section>
  )
}
