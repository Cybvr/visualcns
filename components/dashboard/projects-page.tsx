"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { FaFolderOpen } from "react-icons/fa"
import { getProjects, deleteProject, projectSlug, projectStatusMeta, type Project } from "@/lib/projects"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { CompactListSkeleton, InitialAvatar, MOBILE_LIST_CARD, MobileListRow, CheckAvatar } from "@/components/dashboard/compact-list-row"
import { GridCardsSkeleton, MobileCardsSkeleton } from "@/components/dashboard/collection-skeletons"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { ReactIcon } from "@/components/react-icon"
import { ProjectCover } from "@/components/project-card"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ViewToggle, useViewMode } from "@/components/dashboard/view-toggle"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { Checkbox } from "@/components/ui/checkbox"
import { useRowSelection } from "@/hooks/use-row-selection"
import { cn } from "@/lib/utils"

const PROJECT_SORTS: SortOption<Project>[] = [
  { value: "title", label: "Project", get: (p) => p.title, ascLabel: "A–Z", descLabel: "Z–A" },
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
]

function searchProject(p: Project) {
  return [p.title, p.client, p.companyId, p.service, projectStatusMeta[p.status]?.label]
}

export default function ProjectsAdminPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useViewMode("projects", "grid")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  const [creating, setCreating] = useState(false)
  const [companyFilter, setCompanyFilter] = useState("all")

  const companyOptions = Array.from(
    new Set(projects.map((p) => p.client || p.companyId).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))

  const companyFilteredProjects =
    companyFilter === "all" ? projects : projects.filter((p) => (p.client || p.companyId) === companyFilter)

  const { results: visibleProjects, bar } = useFilterBar({
    items: companyFilteredProjects,
    search: searchProject,
    sorts: PROJECT_SORTS,
    defaultSort: "title",
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
    setDeleting(project.id)
    try {
      await deleteProject(project.id)
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
      setPendingDelete(null)
    } catch (err) {
      console.error("Error deleting project:", err)
    } finally {
      setDeleting(null)
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
      if (pendingDelete && removed.has(pendingDelete.id)) setPendingDelete(null)
      selection.clear()
    } catch (err) {
      console.error("Error deleting projects:", err)
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <TableFilterBar
        {...bar}
        mobileVariant="drawer"
        headerOnMobile
        placeholder="Search projects"
        controls={<ViewToggle view={view} onChange={setView} />}
        createAction={{ label: "New project", onClick: () => setCreating(true) }}
      >
        {companyOptions.length > 0 && (
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[170px]" aria-label="Filter by company">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companyOptions.map((company) => (
                <SelectItem key={company} value={company}>
                  {company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableFilterBar>

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
          label="Project"
          title="Let's set up your first project"
          description="A project holds the work you do for one client: the tasks, the progress, and whatever you choose to share with them in their portal."
          action={<Button onClick={() => setCreating(true)}>New Project</Button>}
        />
      ) : (
        <>
          {visibleProjects.length === 0 ? (
            <EmptySearchState label="No projects match your search." />
          ) : view === "grid" ? (
            <GridCardList>
              {visibleProjects.map((p) => {
                return (
                  <GridCard
                    key={p.id}
                    href={`/dashboard/projects/${projectSlug(p)}`}
                    ariaLabel={`Open ${p.title}`}
                    title={p.title}
                    icon={<ReactIcon icon={FaFolderOpen} className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                    preview={<ProjectCover project={p} />}
                    menuLabel={`Options for ${p.title}`}
                    menu={
                      <>
                        <DropdownMenuItem onSelect={() => router.push(`/dashboard/projects/${projectSlug(p)}`)}>Open project</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(p)}>Delete project</DropdownMenuItem>
                      </>
                    }
                  />
                )
              })}
            </GridCardList>
          ) : (
            <>
              <div className="sm:hidden">
                <TableBulkBar
                  count={selection.selectedCount}
                  noun="project"
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
                          ) : p.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.thumbnailUrl} alt="" loading="lazy" className="size-12 rounded-full object-cover" />
                          ) : (
                            <InitialAvatar text={p.title} />
                          )}
                          onAvatarClick={selecting ? () => selection.toggle(p.id) : undefined}
                          avatarPressed={selecting ? checked : undefined}
                          avatarLabel={selecting ? `${checked ? "Deselect" : "Select"} ${p.title}` : `Options for ${p.title}`}
                          avatarMenu={selecting ? undefined : (
                            <>
                              <DropdownMenuItem onSelect={() => router.push(href)}>Open project</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => selection.toggle(p.id)}>Select</DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(p)}>Delete project</DropdownMenuItem>
                            </>
                          )}
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
                <TableBulkBar count={selection.selectedCount} noun="project" deleting={bulkDeleting} onClear={selection.clear} onDelete={handleBulkDelete} />
                <label className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                  <Checkbox aria-label="Select all projects" checked={selection.allSelected} indeterminate={selection.someSelected} onChange={selection.toggleAll} />
                  Select all projects
                </label>
                {visibleProjects.map((p) => {
                  const meta = projectStatusMeta[p.status] ?? projectStatusMeta["in-progress"]
                  const href = `/dashboard/projects/${projectSlug(p)}`
                  const selected = selection.isSelected(p.id)
                  return <MobileDataCard
                    key={p.id}
                    surface="muted"
                    iconShape="circle"
                    imageUrl={p.thumbnailUrl || undefined}
                    icon={!p.thumbnailUrl ? <InitialAvatar text={p.title} className="size-11" /> : undefined}
                    title={<>{p.title}{p.isCaseStudy && <span className="ml-2 text-xs text-violet-700 dark:text-violet-200">Case study</span>}</>}
                    subtitle={[p.client || p.companyId, p.service].filter(Boolean).join(" · ") || "No details"}
                    description={`${meta.label} · ${p.progress}% done${p.dueDate ? ` · Due ${p.dueDate}` : ""}`}
                    selected={selected}
                    pressed={selected}
                    onClick={(event) => selection.selectedCount > 0 ? selection.toggle(p.id, event.shiftKey) : router.push(href)}
                    ariaLabel={`Open ${p.title}`}
                    menuLabel={`Options for ${p.title}`}
                    menu={<>
                      <DropdownMenuItem onSelect={() => router.push(href)}>Open project</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => selection.toggle(p.id)}>{selected ? "Deselect" : "Select"}</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(p)}>Delete project</DropdownMenuItem>
                    </>}
                  />
                })}
              </div>
            </>
          )}
        </>
      )}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes &quot;{pendingDelete?.title}&quot;. Tasks under it are not deleted
              automatically. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting !== null}
              onClick={() => pendingDelete && void handleDelete(pendingDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewProjectDialog open={creating} onOpenChange={setCreating} />
    </main>
  )
}
