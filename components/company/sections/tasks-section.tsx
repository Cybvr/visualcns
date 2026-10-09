"use client"

import { useRouter } from "next/navigation"
import { ListTodo } from "lucide-react"

import { CompanyEmptyState } from "@/components/company/empty-state"
import { useCompanyPage } from "@/components/company/company-page-context"
import { TaskDetailSheet } from "@/components/company/task-detail-sheet"
import { ListSearch, useListSearch } from "@/components/dashboard/list-search"
import { TasksView } from "@/components/dashboard/tasks-view"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { taskStatusMeta } from "@/lib/tasks"

export function TasksSection() {
  const router = useRouter()
  const { company, projects, admin, tasks, tasksLoading, deletingTaskId, patchTask, removeTask, refreshTasks, sectionHref } = useCompanyPage()
  const { query, setQuery, results } = useListSearch(tasks, (task) => [task.name, task.project, task.dueDate, (taskStatusMeta[task.status] ?? taskStatusMeta.todo).label])

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
      <h2 className="sr-only">Tasks</h2>
      {tasks.length === 0 ? (
        <CompanyEmptyState icon={ListTodo} title="No shared tasks yet" />
      ) : (
        <>
          <ListSearch value={query} onChange={setQuery} placeholder="Search tasks" className="max-w-sm" />
          <div className="mt-4">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches your search.</p>
            ) : results.map((task) => (
              <MobileDataCard
                key={task.id}
                surface="list"
                variant="inline"
                iconShape="circle"
                icon={<ListTodo className="size-5 text-muted-foreground" aria-hidden="true" />}
                title={task.name}
                subtitle={[task.project, task.dueDate ? `Due ${task.dueDate}` : null].filter(Boolean).join(" · ") || undefined}
                trailing={(taskStatusMeta[task.status] ?? taskStatusMeta.todo).label}
                onClick={() => router.push(taskHref(task.id), { scroll: false })}
                ariaLabel={`View task: ${task.name}`}
              />
            ))}
          </div>
        </>
      )}
      <TaskDetailSheet />
    </section>
  )
}
