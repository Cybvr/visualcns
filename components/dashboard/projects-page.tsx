"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useCachedState } from "@/lib/page-cache"
import { getProjects, deleteProject, duplicateProject, getProject, isProjectArchived, projectLastActivity, projectSlug, projectStatusMeta, renameProject, setProjectArchived, type Project } from "@/lib/projects"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { campaignGridCardProps, useCampaignShare } from "@/components/dashboard/campaign-grid-card"
import type { ItemActions } from "@/components/dashboard/item-menu"
import { CompactListSkeleton, InitialAvatar, MOBILE_LIST_CARD, MobileListRow, CheckAvatar } from "@/components/dashboard/compact-list-row"
import { GridCardsSkeleton, MobileCardsSkeleton } from "@/components/dashboard/collection-skeletons"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ViewToggle, useViewMode } from "@/components/dashboard/view-toggle"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { Checkbox } from "@/components/ui/checkbox"
import { useRowSelection } from "@/hooks/use-row-selection"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { tsToMillis } from "@/lib/tasks"

const PROJECT_SORTS: SortOption<Project>[] = [
  { value: "title", label: "Campaign", get: (p) => p.title, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "client", label: "Client", get: (p) => p.client || p.companyId, ascLabel: "A–Z", descLabel: "Z–A" },
  {
    value: "status",
    label: "Status",
    get: (p) => projectStatusMeta[p.status]?.label ?? p.status,
    ascLabel: "A–Z",
    descLabel: "Z–A",
  },
  { value: "progress", label: "Progress", get: (p) => p.progress, ascLabel: "Lowest", descLabel: "Highest" },
  { value: "dueDate", label: "Due date", get: (p) => p.dueDate, ascLabel: "Soonest", descLabel: "Latest" },
  { value: "updatedAt", label: "Most recent", get: projectLastActivity, ascLabel: "Oldest", descLabel: "Newest" },
]

function searchProject(p: Project) {
  return [p.title, p.client, p.companyId, p.service, projectStatusMeta[p.status]?.label]
}

export default function ProjectsAdminPage() {
  const router = useRouter()
  const [projects, setProjects, cached] = useCachedState<Project[]>("projects", [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useViewMode("projects", "grid")
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [duplicateBusy, setDuplicateBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [campaignTab, setCampaignTab] = useState<"active" | "archive">("active")
  const isCampaignActive = (project: Project) => !isProjectArchived(project)
  const activeProjects = projects.filter(isCampaignActive)
  const archivedProjects = projects.filter((project) => !isCampaignActive(project))
  const tabProjects = campaignTab === "active" ? activeProjects : archivedProjects
  const { results: visibleProjects, bar } = useFilterBar({
    items: tabProjects,
    search: searchProject,
    sorts: PROJECT_SORTS,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })

  const selection = useRowSelection(visibleProjects, (p) => p.id)

  async function fetchProjects() {
    setError(null)
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (err) {
      console.error("Error fetching projects:", err)
      setError(err instanceof Error ? err.message : "Failed to load projects.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  async function handleDelete(project: Project) {
    try {
      await deleteProject(project.id)
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
    } catch (err) {
      console.error("Error deleting project:", err)
    }
  }

  async function handleRename(project: Project, title: string) {
    if (title === project.title) return
    try {
      await renameProject(project.id, title)
      setProjects((current) => current.map((item) => item.id === project.id ? { ...item, title } : item))
      toast.success("Campaign renamed")
    } catch (error) {
      console.error("Error renaming campaign:", error)
      toast.error("The campaign could not be renamed.")
    }
  }

  async function handleDuplicate(project: Project) {
    if (duplicateBusy) return
    setDuplicateBusy(true)
    try {
      const copyId = await duplicateProject(project)
      const copy = await getProject(copyId)
      if (copy) setProjects((current) => [copy, ...current])
      toast.success("Campaign duplicated")
    } catch (error) {
      console.error("Error duplicating campaign:", error)
      toast.error("The campaign could not be duplicated.")
    } finally {
      setDuplicateBusy(false)
    }
  }

  async function handleArchive(project: Project, isArchived: boolean) {
    try {
      const updatedAt = await setProjectArchived(project.id, isArchived)
      setProjects((current) => current.map((item) => item.id === project.id ? { ...item, isArchived, updatedAt } : item))
      toast.success(isArchived ? "Campaign archived" : "Campaign restored")
    } catch (error) {
      console.error(`Error ${isArchived ? "archiving" : "restoring"} campaign:`, error)
      toast.error(`The campaign could not be ${isArchived ? "archived" : "restored"}.`)
    }
  }

  async function handleBulkDelete() {
    const ids = selection.selectedIds
    if (ids.length === 0 || bulkDeleting) return
    setBulkDeleting(true)
    try {
      await Promise.all(ids.map((id) => deleteProject(id)))
      const removed = new Set(ids)
      setProjects((prev) => prev.filter((p) => !removed.has(p.id)))
      selection.clear()
    } catch (err) {
      console.error("Error deleting projects:", err)
    } finally {
      setBulkDeleting(false)
    }
  }

  // One campaign's menu, shared by every view. Select sits with the page's own actions.
  const share = useCampaignShare()

  function campaignActions(p: Project): Omit<ItemActions, "noun" | "name" | "onOpen"> {
    return {
      onRename: (title) => handleRename(p, title),
      onDuplicate: () => handleDuplicate(p),
      onArchive: isCampaignActive(p) ? () => handleArchive(p, true) : undefined,
      onRestore: !isCampaignActive(p) ? () => handleArchive(p, false) : undefined,
      extra: <>{share.shareItem(p)}<DropdownMenuItem onSelect={() => selection.toggle(p.id)}>{selection.isSelected(p.id) ? "Deselect" : "Select"}</DropdownMenuItem></>,
      onDelete: () => handleDelete(p),
      deleteMessage: `This permanently deletes "${p.title}". Tasks under it are not deleted automatically. This cannot be undone.`,
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <Tabs value={campaignTab} onValueChange={(value) => setCampaignTab(value as "active" | "archive")} className="mb-4">
        <TabsList>
          <TabsTrigger value="active">Active <span className="ml-1 text-xs text-muted-foreground">{activeProjects.length}</span></TabsTrigger>
          <TabsTrigger value="archive">Archive <span className="ml-1 text-xs text-muted-foreground">{archivedProjects.length}</span></TabsTrigger>
        </TabsList>
      </Tabs>
      <TableFilterBar
        {...bar}
        mobileVariant="drawer"
        headerOnMobile
        placeholder="Search campaigns"
        controls={<ViewToggle view={view} onChange={setView} />}
        createAction={{ label: "New campaign", onClick: () => setCreating(true) }}
      />

      {loading ? (
        view === "grid" ? <GridCardsSkeleton /> : <>
          <div className="sm:hidden"><CompactListSkeleton /></div>
          <div className="hidden sm:block"><MobileCardsSkeleton /></div>
        </>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <FirstRunState
          label="Campaign"
          title="Let's set up your first campaign"
          description="A campaign holds the work you do for one client: the tasks, the progress, and whatever you choose to share with them in their portal."
          action={<Button onClick={() => setCreating(true)}>New Campaign</Button>}
        />
      ) : (
        <>
          {visibleProjects.length === 0 ? (
            <EmptySearchState label={tabProjects.length === 0 ? `No campaigns in ${campaignTab === "active" ? "Active" : "Archive"}.` : "No campaigns match your search."} />
          ) : view === "grid" ? (
            <GridCardList>
              {visibleProjects.map((p) => {
                return (
                  <GridCard
                    key={p.id}
                    {...campaignGridCardProps(p, {
                      href: `/dashboard/projects/${projectSlug(p)}`,
                      onOpen: () => router.push(`/dashboard/projects/${projectSlug(p)}`),
                      archived: !isCampaignActive(p),
                      ...campaignActions(p),
                      // The grid has no bulk bar, so it gets Share but not Select.
                      extra: share.shareItem(p),
                    })}
                  />
                )
              })}
            </GridCardList>
          ) : (
            <>
              <div className="sm:hidden">
                <TableBulkBar
                  count={selection.selectedCount}
                  noun="campaign"
                  deleting={bulkDeleting}
                  onClear={selection.clear}
                  onDelete={handleBulkDelete}
                />
                <ul className={MOBILE_LIST_CARD}>
                  {visibleProjects.map((p) => {
                    const meta = projectStatusMeta[p.status] ?? projectStatusMeta["in-progress"]
                    const href = `/dashboard/projects/${projectSlug(p)}`
                    const checked = selection.isSelected(p.id)
                    const selecting = selection.selectedCount > 0
                    return (
                      <li key={p.id}>
                        <MobileListRow
                          href={selecting ? undefined : href}
                          onClick={selecting ? () => selection.toggle(p.id) : undefined}
                          ariaLabel={selecting ? `${checked ? "Deselect" : "Select"} ${p.title}` : `Open ${p.title}`}
                          active={checked}
                          avatar={checked ? (
                            <CheckAvatar />
                          ) : (p.campaignImageUrl || p.thumbnailUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.campaignImageUrl || p.thumbnailUrl} alt="" loading="lazy" className="size-12 rounded-full object-cover" />
                          ) : (
                            <InitialAvatar text={p.title} />
                          )}
                          onAvatarClick={selecting ? () => selection.toggle(p.id) : undefined}
                          avatarPressed={selecting ? checked : undefined}
                          avatarLabel={selecting ? `${checked ? "Deselect" : "Select"} ${p.title}` : `Options for ${p.title}`}
                          avatarActions={selecting ? undefined : { noun: "campaign", name: p.title, ...campaignActions(p) }}
                          title={p.title}
                          meta={<span className={cn("rounded-full px-1.5 py-px text-[10px] font-medium", meta.className)}>{meta.label}</span>}
                          lines={[
                            [p.client || p.companyId, p.service].filter(Boolean).join(" · ") || "No details",
                            [`${p.progress}% done`, p.dueDate && `Due ${p.dueDate}`].filter(Boolean).join(" · "),
                          ]}
                        />
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="hidden space-y-2 sm:block">
                <TableBulkBar count={selection.selectedCount} noun="campaign" deleting={bulkDeleting} onClear={selection.clear} onDelete={handleBulkDelete} />
                <label className="flex items-center gap-2 px-3 py-1 text-sm text-muted-foreground">
                  <Checkbox aria-label="Select all campaigns" checked={selection.allSelected} indeterminate={selection.someSelected} onChange={selection.toggleAll} />
                  Select all campaigns
                </label>
                {visibleProjects.map((p) => {
                  const meta = projectStatusMeta[p.status] ?? projectStatusMeta["in-progress"]
                  const href = `/dashboard/projects/${projectSlug(p)}`
                  const selected = selection.isSelected(p.id)
                  return <MobileDataCard
                    key={p.id}
                    surface="muted"
                    iconShape="circle"
                    imageUrl={p.campaignImageUrl || p.thumbnailUrl || undefined}
                    icon={!(p.campaignImageUrl || p.thumbnailUrl) ? <InitialAvatar text={p.title} className="size-11" /> : undefined}
                    title={<>{p.title}{p.isCaseStudy && <span className="ml-2 text-xs text-violet-700 dark:text-violet-200">Case study</span>}</>}
                    subtitle={[p.client || p.companyId, p.service].filter(Boolean).join(" · ") || "No details"}
                    description={`${meta.label} · ${p.progress}% done${p.dueDate ? ` · Due ${p.dueDate}` : ""}`}
                    selected={selected}
                    pressed={selected}
                    checkbox={{ checked: selected, onChange: () => selection.toggle(p.id), label: `${selected ? "Deselect" : "Select"} ${p.title}` }}
                    onClick={(event) => selection.selectedCount > 0 ? selection.toggle(p.id, event.shiftKey) : router.push(href)}
                    ariaLabel={`Open ${p.title}`}
                    menuLabel={`Options for ${p.title}`}
                    actions={{ noun: "campaign", name: p.title, ...campaignActions(p) }}
                  />
                })}
              </div>
            </>
          )}
        </>
      )}

      <NewProjectDialog open={creating} onOpenChange={setCreating} entityLabel="campaign" />
      {share.dialog}
    </main>
  )
}
