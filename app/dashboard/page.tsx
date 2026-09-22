"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { HomeTaskList } from "@/components/dashboard/home-task-list"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { ProjectsView } from "@/components/dashboard/projects-view"
import { buildActivity, type ActivityItem } from "@/lib/activity"
import { getContracts, getEstimates, getInvoices } from "@/lib/billing"
import { getProjects, type Project } from "@/lib/projects"
import { getTasks, tsToMillis, type Task } from "@/lib/tasks"

/** Where a home-page activity row jumps to in the agency workspace. */
function activityHref(item: ActivityItem): string | undefined {
  switch (item.kind) {
    case "invoice": return `/dashboard/invoices/${item.refId}`
    case "estimate": return `/dashboard/estimates/${item.refId}`
    case "contract": return `/dashboard/contracts/${item.refId}`
    case "project": return "/dashboard/projects"
    case "task": return "/dashboard/tasks"
    default: return undefined
  }
}

/**
 * Only a signed-in admin ever reaches this route: clients (and anyone being
 * impersonated) are redirected to the portal by UnifiedDashboardShell. So this
 * home page shows the whole tenant's projects/tasks/activity, the same scope
 * as the dedicated Projects and Tasks pages, not one company's alone.
 */
export default function DashboardPage() {
  const { user } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const [nextProjects, nextTasks, invoices, estimates, contracts] = await Promise.all([
        getProjects(),
        getTasks(),
        getInvoices(),
        getEstimates(),
        getContracts(),
      ])
      setProjects(nextProjects)
      setActivity(buildActivity({ projects: nextProjects, tasks: nextTasks, invoices, estimates, contracts }))
      setTasks([...nextTasks].sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt)))
    } catch (err) {
      console.error("Error loading dashboard data:", err)
      setError("Couldn't load your projects right now. Please try again shortly.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 sm:px-6">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="mt-10 text-sm text-destructive">{error}</p>
      ) : (
        <>
          <ProjectsView
            projects={projects}
            onChanged={fetchData}
            onNewProject={() => setCreatingProject(true)}
            minimal
          />
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
            <HomeTaskList tasks={tasks} onSaved={fetchData} className="mt-0" />
            <ActivityFeed items={activity} hrefFor={activityHref} className="mt-0 hidden lg:block" />
          </div>
          <div className="mt-6 overflow-hidden rounded-lg bg-card">
            <Image
              src="/images/visualcns-blue-campaign-ad-v4.png"
              alt="VisualCNS campaign artwork: Do something awesome for your brand"
              width={1536}
              height={1057}
              className="h-auto w-full"
            />
          </div>
        </>
      )}

      <NewProjectDialog
        open={creatingProject}
        onOpenChange={setCreatingProject}
        onCreated={() => {
          void fetchData()
        }}
      />
    </main>
  )
}
