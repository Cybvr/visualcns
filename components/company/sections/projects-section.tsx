"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, ListTodo, Megaphone } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { CompanyEmptyState } from "@/components/company/empty-state"
import { useCompanyPage } from "@/components/company/company-page-context"
import { SectionAddButton } from "@/components/company/section-add-button"
import { TaskDetailSheet } from "@/components/company/task-detail-sheet"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ListToolbar, useListSearch, useListView } from "@/components/dashboard/list-search"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { ProjectDetail } from "@/components/dashboard/project-detail"
import { ProjectCover } from "@/components/project-card"
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
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { deleteProjectWithTasks, duplicateProject, renameProject, type Project } from "@/lib/projects"
import { formatTimestamp, taskStatusMeta, tsToMillis } from "@/lib/tasks"

export function ProjectsSection() {
  const { company, projects: loadedProjects, admin, emptyProjectsLabel, tasks, tasksLoading, updateParams, setRecordOpen, invoices, sectionHref } = useCompanyPage()
  const { appUser } = useAuth()
  // The public page has no admin handle, but the agency's own admins can still create campaigns there.
  const canCreate = Boolean(admin)
    || appUser?.role === "superadmin"
    || (appUser?.role === "admin" && Boolean(appUser.agencyId) && appUser.agencyId === company.agencyId)
  const [addedProjects, setAddedProjects] = useState<Project[]>([])
  // Campaigns made or edited here show at once, before the company data reloads.
  const projects = [
    ...addedProjects.filter((added) => !loadedProjects.some((project) => project.id === added.id)),
    ...loadedProjects.map((project) => addedProjects.find((added) => added.id === project.id) ?? project),
  ]
  const searchParams = useSearchParams()
  const [view, setView] = useListView("company-campaigns")
  const { query, setQuery, results } = useListSearch(projects, (project) => [project.title, project.service, project.status, project.dueDate])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const projectOpen = Boolean(selectedProject)
  useEffect(() => {
    setRecordOpen(projectOpen)
    return () => setRecordOpen(false)
  }, [projectOpen, setRecordOpen])

  // A task link opens the job the task belongs to, with the task on top.
  const linkedTaskId = searchParams.get("task")
  useEffect(() => {
    if (!linkedTaskId) return
    const projectId = tasks.find((task) => task.id === linkedTaskId)?.projectId
    const project = projectId ? projects.find((item) => item.id === projectId) : undefined
    if (project) setSelectedProject((current) => current?.id === project.id ? current : project)
  }, [linkedTaskId, projects, tasks])

  // The home page's campaign cards link here with ?campaign= to open one straight away.
  const linkedCampaignId = searchParams.get("campaign")
  useEffect(() => {
    if (!linkedCampaignId) return
    const project = projects.find((item) => item.id === linkedCampaignId)
    if (project) setSelectedProject((current) => current?.id === project.id ? current : project)
  }, [linkedCampaignId, projects])

  function modifiedLabel(project: Project) {
    const millis = tsToMillis(project.updatedAt) || tsToMillis(project.createdAt)
    return millis ? formatTimestamp(millis) : undefined
  }

  const jobTasks = selectedProject ? tasks.filter((task) => task.projectId === selectedProject.id) : []
  const publicTasks = tasksLoading ? (
    <p className="text-sm text-muted-foreground" role="status">Loading tasks…</p>
  ) : jobTasks.length === 0 ? (
    <CompanyEmptyState icon={ListTodo} title="No shared tasks yet" />
  ) : (
    <div>
      {jobTasks.map((task) => (
        <MobileDataCard
          key={task.id}
          surface="list"
          variant="inline"
          iconShape="circle"
          icon={<ListTodo className="size-5 text-muted-foreground" aria-hidden="true" />}
          title={task.name}
          subtitle={task.dueDate ? `Due ${task.dueDate}` : undefined}
          trailing={(taskStatusMeta[task.status] ?? taskStatusMeta.todo).label}
          onClick={() => updateParams({ task: task.id })}
          ariaLabel={`View task: ${task.name}`}
        />
      ))}
    </div>
  )
  const [creatingProject, setCreatingProject] = useState(false)
  const [renamingProject, setRenamingProject] = useState<Project | null>(null)
  const [titleDraft, setTitleDraft] = useState("")
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleDuplicate(project: Project) {
    if (!admin || busy) return
    setBusy(true)
    try {
      await duplicateProject(project)
      await admin.reload()
      toast.success("Project duplicated")
    } catch (duplicateError) {
      console.error("Error duplicating project:", duplicateError)
      toast.error("The project could not be duplicated.")
    } finally {
      setBusy(false)
    }
  }

  async function handleRename() {
    if (!admin || !renamingProject || busy) return
    const title = titleDraft.trim()
    if (!title || title === renamingProject.title) return
    setBusy(true)
    try {
      await renameProject(renamingProject.id, title)
      setRenamingProject(null)
      await admin.reload()
      toast.success("Project renamed")
    } catch (renameError) {
      console.error("Error renaming project:", renameError)
      toast.error("The project could not be renamed.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!admin || !deletingProject || busy) return
    setBusy(true)
    try {
      await deleteProjectWithTasks(deletingProject.id)
      setDeletingProject(null)
      await admin.reload()
      toast.success("Project deleted")
    } catch (deleteError) {
      console.error("Error deleting project:", deleteError)
      toast.error("The project could not be deleted.")
    } finally {
      setBusy(false)
    }
  }

  function projectMenu(project: Project) {
    if (!admin) return undefined
    return (
      <>
        <DropdownMenuItem onSelect={() => { setTitleDraft(project.title); setRenamingProject(project) }}>Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleDuplicate(project)}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => setDeletingProject(project)}>Delete</DropdownMenuItem>
      </>
    )
  }

  return (
    <div className="mt-5">
      {selectedProject ? (
        <div>
          {selectedProject.thumbnailUrl && (
            <div className="mb-4 aspect-[4/1] w-full overflow-hidden rounded-2xl bg-muted">
              <ProjectCover project={selectedProject} />
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedProject(null)
                  if (linkedTaskId || linkedCampaignId) updateParams({ task: null, campaign: null }, true)
                }}
                aria-label="Back to Campaigns"
                title="Back to Campaigns"
                className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>
              {selectedProject.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedProject.logoUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
              )}
              <h2 className="min-w-0 truncate text-xl font-semibold tracking-[-0.02em]">{selectedProject.title}</h2>
            </div>
            {canCreate && <SectionAddButton label="New campaign" onClick={() => setCreatingProject(true)} />}
          </div>
          <div className="mt-4">
            <ProjectDetail
              project={selectedProject}
              isAdmin={Boolean(admin)}
              publicView={!admin}
              embedded
              companyId={company.id}
              clientName={company.name}
              publicTasks={admin ? undefined : publicTasks}
              canEditCampaign={canCreate}
              invoices={invoices.filter((invoice) => invoice.projectId === selectedProject.id)}
              invoiceHref={(invoice) => sectionHref("finance", { doc: `invoice:${invoice.id}` })}
              onProjectPatched={(patch) => {
                const patched = { ...selectedProject, ...patch }
                setSelectedProject(patched)
                setAddedProjects((current) => [patched, ...current.filter((project) => project.id !== patched.id)])
              }}
              onProjectDeleted={admin ? async () => {
                await admin.reload()
                setSelectedProject(null)
              } : undefined}
            />
          </div>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Campaigns</h2>
          <ListToolbar
            query={query}
            onQueryChange={setQuery}
            placeholder="Search campaigns"
            view={view}
            onViewChange={setView}
            actions={canCreate ? <SectionAddButton label="New campaign" onClick={() => setCreatingProject(true)} /> : undefined}
          />

          {projects.length === 0 ? (
            <CompanyEmptyState
              icon={Megaphone}
              title={canCreate ? "No campaigns yet" : emptyProjectsLabel}
              action={canCreate ? <SectionAddButton label="New campaign" onClick={() => setCreatingProject(true)} /> : undefined}
            />
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches your search.</p>
          ) : view === "card" ? (
            <div className="mt-4">
              <GridCardList>
                {results.map((project) => (
                  <GridCard
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    ariaLabel={`Open ${project.title}`}
                    title={project.title}
                    subtitle={modifiedLabel(project)}
                    icon={<Megaphone className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                    preview={<ProjectCover project={project} />}
                    menuLabel={`Options for ${project.title}`}
                    menu={projectMenu(project)}
                  />
                ))}
              </GridCardList>
            </div>
          ) : (
            <div className="mt-4">
              {results.map((project) => (
                <MobileDataCard
                  key={project.id}
                  surface="list"
                  variant="inline"
                  iconShape="circle"
                  title={project.title}
                  subtitle={modifiedLabel(project)}
                  icon={<Megaphone className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                  trailing={project.dueDate || undefined}
                  onClick={() => setSelectedProject(project)}
                  ariaLabel={`Open ${project.title}`}
                  menuLabel={`Options for ${project.title}`}
                  menu={projectMenu(project)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {!admin && <TaskDetailSheet />}

      {admin && (
        <>
          <Dialog
            open={Boolean(renamingProject)}
            onOpenChange={(open) => !open && !busy && setRenamingProject(null)}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Rename project</DialogTitle>
                <DialogDescription>Choose a new name for {renamingProject?.title}.</DialogDescription>
              </DialogHeader>
              <Input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                maxLength={120}
                autoFocus
                aria-label="Project name"
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setRenamingProject(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleRename()}
                  disabled={busy || !titleDraft.trim() || titleDraft.trim() === renamingProject?.title}
                >
                  {busy ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={Boolean(deletingProject)}
            onOpenChange={(open) => !open && !busy && setDeletingProject(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {deletingProject?.title}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the project and every task filed under it. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busy}
                  onClick={(event) => {
                    event.preventDefault()
                    void handleDelete()
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {busy ? "Deleting…" : "Delete project"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {canCreate && (
        <NewProjectDialog
          open={creatingProject}
          onOpenChange={setCreatingProject}
          initialCompanyId={company.id}
          onCreated={async (project) => {
            if (admin) await admin.reload()
            else setAddedProjects((current) => [project, ...current])
            setSelectedProject(project)
          }}
        />
      )}
    </div>
  )
}
