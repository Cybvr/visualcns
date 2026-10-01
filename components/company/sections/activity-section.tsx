"use client"

import { useMemo } from "react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { buildActivity } from "@/lib/activity"

export function ActivitySection({ heading, prominent = false }: { heading?: string; prominent?: boolean } = {}) {
  const { projects, tasks, invoices, estimates, contracts, documents, sections, sectionHref, isAdmin } = useCompanyPage()
  const title = heading ?? sections.find((item) => item.key === "activity")?.label ?? "Activity"

  const activity = useMemo(
    () => buildActivity({ projects, tasks, invoices, estimates, contracts, documents }, prominent ? 24 : 50),
    [tasks, contracts, documents, estimates, invoices, projects, prominent],
  )

  return (
    <div className="mt-5 min-w-0">
      <h2 className={prominent ? "py-2 text-xl font-semibold tracking-[-0.02em] text-foreground" : "sidebar-nav-label text-muted-foreground"}>{title}</h2>
      <ActivityFeed
        items={activity}
        hrefFor={(item) => item.kind === "task" ? isAdmin ? `/dashboard/tasks/${encodeURIComponent(item.refId)}` : sectionHref("tasks", { task: item.refId }) : undefined}
        emptyLabel={title === "Notifications" ? "No notifications yet." : "No recent activity for this company yet."}
        showHeader={false}
        className="mt-4 sm:rounded-none sm:bg-transparent sm:p-0"
      />
    </div>
  )
}
