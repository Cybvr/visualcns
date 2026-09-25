"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useAuth } from "@/components/auth-provider"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { HomeTaskList } from "@/components/dashboard/home-task-list"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { ProjectsView } from "@/components/dashboard/projects-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buildActivity, type ActivityItem } from "@/lib/activity"
import { getContracts, getEstimates, getInvoices } from "@/lib/billing"
import { getProjects, type Project } from "@/lib/projects"
import { getTasks, tsToMillis, type Task } from "@/lib/tasks"

const HOME_PROJECT_LIMIT = 4
const HOME_TASK_LIMIT = 4

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
 * home page shows the whole agency's projects/tasks/activity, the same scope
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
        <DashboardPageSkeleton variant="home" rows={4} />
      ) : error ? (
        <p className="mt-10 text-sm text-destructive">{error}</p>
      ) : (
        <>
          <Tabs defaultValue="projects" className="mt-0 gap-1">
            <TabsList className="h-8 p-0.5">
              <TabsTrigger value="projects" className="px-3 py-0">Projects</TabsTrigger>
              <TabsTrigger value="activity" className="px-3 py-0">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="projects" className="mt-0">
              <ProjectsView
                projects={[...projects]
                  .sort((a, b) => Math.max(tsToMillis(b.updatedAt), tsToMillis(b.createdAt)) - Math.max(tsToMillis(a.updatedAt), tsToMillis(a.createdAt)))
                  .slice(0, HOME_PROJECT_LIMIT)}
                onChanged={fetchData}
                onNewProject={() => setCreatingProject(true)}
                hideHeader
                minimal
              />
              <HomeTaskList tasks={tasks.slice(0, HOME_TASK_LIMIT)} onSaved={fetchData} className="mt-4" />
            </TabsContent>
            <TabsContent value="activity" className="mt-0">
              <ActivityFeed items={activity} hrefFor={activityHref} showHeader={false} className="mt-0" />
            </TabsContent>
          </Tabs>
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
