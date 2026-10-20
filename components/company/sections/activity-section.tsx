"use client"

import { useMemo } from "react"
import { SectionHeader } from "@/components/dashboard/section-header"

import { useCompanyPage } from "@/components/company/company-page-context"
import { TaskDetailSheet } from "@/components/company/task-detail-sheet"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { ListSearch, useListSearch } from "@/components/dashboard/list-search"
import { buildActivity } from "@/lib/activity"

interface ActivitySectionProps {
  heading?: string
  prominent?: boolean
  listLayout?: "default" | "rows"
  /** A short preview, as on the home page: no search, a few items and a link to the full list. */
  preview?: boolean
}

const PREVIEW_LIMIT = 5

export function ActivitySection({ heading, prominent = false, listLayout = "default", preview = false }: ActivitySectionProps = {}) {
  const { projects, tasks, invoices, estimates, contracts, documents, sections, updateParams, sectionHref } = useCompanyPage()
  const title = heading ?? sections.find((item) => item.key === "activity")?.label ?? "Activity"

  const activity = useMemo(
    () => buildActivity({ projects, tasks, invoices, estimates, contracts, documents }, prominent ? 24 : 50),
    [tasks, contracts, documents, estimates, invoices, projects, prominent],
  )
  const { query, setQuery, results } = useListSearch(activity, (item) => [item.title, item.subtitle, item.kind])
  const rows = listLayout === "rows"
  const searchable = rows && !preview
  const visibleActivity = preview ? activity.slice(0, PREVIEW_LIMIT) : searchable ? results : activity
  const emptyLabel = query.trim()
    ? "Nothing matches your search."
    : title === "Notifications" ? "No notifications yet." : "No recent activity for this company yet."

  return (
    <div className={preview ? "min-w-0" : "mt-5 min-w-0"}>
      <SectionHeader title={title} href={preview && activity.length > 0 ? sectionHref("activity") : undefined} />
      {searchable && (
        <ListSearch
          value={query}
          onChange={setQuery}
          placeholder="Search activity"
          className="mt-4 max-w-sm"
        />
      )}
      <ActivityFeed
        items={visibleActivity}
        onItemClick={(item) => updateParams({ task: item.refId })}
        isItemClickable={(item) => item.kind === "task"}
        emptyLabel={emptyLabel}
        showHeader={false}
        layout={listLayout}
        className={rows ? (preview ? "mt-2" : "mt-4") : "mt-4 sm:rounded-none sm:bg-transparent sm:p-0"}
      />
      <TaskDetailSheet />
    </div>
  )
}
