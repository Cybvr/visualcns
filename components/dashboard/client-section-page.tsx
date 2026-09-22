"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { ClientProjectCreateSheet } from "@/components/dashboard/client-project-create-sheet"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { ProjectsView } from "@/components/dashboard/projects-view"
import { TemplatesView } from "@/components/dashboard/templates-view"
import { TasksView } from "@/components/dashboard/tasks-view"
import { getProjectsByCompanyId, type Project } from "@/lib/projects"
import { deleteTask, getTasksByCompanyId, updateTask, type Task } from "@/lib/tasks"

export function ClientSectionPage({ section }: { section: "projects" | "tasks" }) {
  const { appUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = appUser?.companyId ?? ""
  const clientName = appUser?.company || appUser?.displayName || ""
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!companyId) { setLoading(false); return }
    setError(false)
    try {
      const [projectList, taskList] = await Promise.all([
        getProjectsByCompanyId(companyId),
        getTasksByCompanyId(companyId),
      ])
      setProjects(projectList)
      setTasks(taskList)
    } catch (error) {
      console.error(`Error loading ${section}:`, error)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [companyId, section])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await deleteTask(id); setTasks((current) => current.filter((task) => task.id !== id)) }
    finally { setDeleting(null) }
  }

  async function handlePatch(id: string, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task))
    try { await updateTask(id, patch) } catch { await fetchData() }
  }

  const creatingProject = section === "projects" && searchParams.get("new") === "1"

  async function handleProjectCreated() {
    await fetchData()
    router.replace("/dashboard/projects")
  }

  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">
        {loading ? <DashboardPageSkeleton rows={6} />
          : error ? <p className="py-12 text-sm text-destructive">Couldn&apos;t load this section.</p>
          : section === "projects" ? (
            <>
              <ProjectsView projects={projects} onChanged={fetchData} />
              <TemplatesView companyId={companyId} clientName={clientName} onCreated={fetchData} />
            </>
          )
          : <TasksView tasks={tasks} projects={projects} companyId={companyId} clientName={clientName} deleting={deleting} onDelete={handleDelete} onPatch={handlePatch} onSaved={fetchData} />}
      </main>
      {section === "projects" && (
        <ClientProjectCreateSheet
          open={creatingProject}
          companyId={companyId}
          clientName={clientName}
          onOpenChange={(open) => {
            if (!open) router.replace("/dashboard/projects")
          }}
          onCreated={handleProjectCreated}
        />
      )}
    </>
  )
}
