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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Loader2, Plus, Trash2 } from "lucide-react"
import { FaFolderOpen } from "react-icons/fa"
import { getProjects, deleteProject, projectSlug, projectStatusMeta, type Project } from "@/lib/projects"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { ReactIcon } from "@/components/react-icon"
import { ProjectCover } from "@/components/project-card"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ViewToggle, useViewMode } from "@/components/dashboard/view-toggle"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
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
      <FilterBar
        {...bar}
        mobileVariant="drawer"
        headerOnMobile
        placeholder="Search projects"
        controls={<ViewToggle view={view} onChange={setView} />}
        actions={
          <Button variant="ghost" size="icon" className="bg-transparent text-foreground hover:bg-transparent" onClick={() => setCreating(true)} aria-label="Add Project">
            <Plus className="h-4 w-4" />
          </Button>
        }
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
      </FilterBar>

      {loading ? (
        <DashboardPageSkeleton rows={6} />
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
              <div className="space-y-2 sm:hidden">
                {visibleProjects.map((p) => {
                  return (
                    <MobileDataCard
                      key={p.id}
                      href={`/dashboard/projects/${projectSlug(p)}`}
                      title={p.title}
                      subtitle={[p.client || p.companyId, p.service].filter(Boolean).join(" · ") || "No details"}
                      icon={<ReactIcon icon={FaFolderOpen} className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
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
              </div>

              <div className="hidden rounded-lg border border-border sm:block">
              <TableBulkBar
                count={selection.selectedCount}
                noun="project"
                deleting={bulkDeleting}
                onClear={selection.clear}
                onDelete={handleBulkDelete}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Select all projects"
                        checked={selection.allSelected}
                        indeterminate={selection.someSelected}
                        onChange={selection.toggleAll}
                      />
                    </TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProjects.map((p) => {
                    const meta = projectStatusMeta[p.status] ?? projectStatusMeta["in-progress"]
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/projects/${projectSlug(p)}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            aria-label={`Select ${p.title}`}
                            checked={selection.isSelected(p.id)}
                            onChange={() => selection.toggle(p.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{p.title}</span>
                            {p.isCaseStudy && (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                                Case study
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.client || p.companyId}</TableCell>
                        <TableCell className="text-muted-foreground">{p.service || "—"}</TableCell>
                        <TableCell>
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", meta.className)}>
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.progress}%</TableCell>
                        <TableCell className="text-muted-foreground">{p.dueDate || "—"}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => router.push(`/dashboard/projects/${projectSlug(p)}`)}
                              aria-label={`Open ${p.title}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              aria-label="Delete project"
                              onClick={() => setPendingDelete(p)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
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
