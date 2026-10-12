"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronRight, House, ListTodo, Megaphone } from "lucide-react"
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
import { CampaignGenerateButton } from "@/components/dashboard/campaign-generate"
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
import { deleteProjectWithTasks, duplicateProject, getProject, renameProject, type Project } from "@/lib/projects"
import { formatTimestamp, taskStatusMeta, tsToMillis } from "@/lib/tasks"

export function ProjectsSection() {
  const { company, projects: loadedProjects, admin, emptyProjectsLabel, tasks, tasksLoading, updateParams, setRecordOpen, invoices, sectionHref } = useCompanyPage()
  const { appUser } = useAuth()
  // The public page has no admin handle, but the agency's own admins can still create campaigns there.
  const canCreate = Boolean(admin)
    || appUser?.role === "superadmin"
    || (appUser?.role === "admin" && Boolean(appUser.agencyId) && appUser.agencyId === company.agencyId)
  const isCompanyUser = appUser?.companyId === company.id
  const canManageCampaigns = canCreate || isCompanyUser
  const canDeleteCampaigns = canCreate
  const [addedProjects, setAddedProjects] = useState<Project[]>([])
  const [removedProjectIds, setRemovedProjectIds] = useState<string[]>([])
  // Campaigns made or edited here show at once, before the company data reloads.
  const projects = [
    ...addedProjects.filter((added) => !loadedProjects.some((project) => project.id === added.id)),
    ...loadedProjects.map((project) => addedProjects.find((added) => added.id === project.id) ?? project),
  ].filter((project) => !removedProjectIds.includes(project.id))
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

  // Campaign edits show at once, before the company data reloads.
  function patchSelected(patch: Partial<Project>) {
    if (!selectedProject) return
    const patched = { ...selectedProject, ...patch }
    setSelectedProject(patched)
    setAddedProjects((list) => [patched, ...list.filter((project) => project.id !== patched.id)])
  }

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
    if (!canManageCampaigns || busy) return
    setBusy(true)
    try {
      const copyId = await duplicateProject(project)
      if (admin) await admin.reload()
      else {
        const copy = await getProject(copyId)
        if (copy) setAddedProjects((current) => [copy, ...current.filter((item) => item.id !== copy.id)])
      }
      toast.success("Campaign duplicated")
    } catch (duplicateError) {
      console.error("Error duplicating campaign:", duplicateError)
      toast.error("The campaign could not be duplicated.")
    } finally {
      setBusy(false)
    }
  }

  async function handleRename() {
    if (!canManageCampaigns || !renamingProject || busy) return
    const title = titleDraft.trim()
    if (!title || title === renamingProject.title) return
    setBusy(true)
    try {
      await renameProject(renamingProject.id, title)
      if (!admin) {
        const renamed = { ...renamingProject, title }
        setAddedProjects((current) => [renamed, ...current.filter((project) => project.id !== renamed.id)])
      }
      setRenamingProject(null)
      if (admin) await admin.reload()
      toast.success("Campaign renamed")
    } catch (renameError) {
      console.error("Error renaming campaign:", renameError)
      toast.error("The campaign could not be renamed.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!canDeleteCampaigns || !deletingProject || busy) return
    setBusy(true)
    try {
      await deleteProjectWithTasks(deletingProject.id)
      if (!admin) {
        setRemovedProjectIds((current) => [...current, deletingProject.id])
        setAddedProjects((current) => current.filter((project) => project.id !== deletingProject.id))
      }
      setDeletingProject(null)
      if (admin) await admin.reload()
      toast.success("Campaign deleted")
    } catch (deleteError) {
      console.error("Error deleting campaign:", deleteError)
      toast.error("The campaign could not be deleted.")
    } finally {
      setBusy(false)
    }
  }

  function projectMenu(project: Project) {
    if (!canManageCampaigns) return undefined
    return (
      <>
        <DropdownMenuItem onSelect={() => { setTitleDraft(project.title); setRenamingProject(project) }}>Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleDuplicate(project)}>Duplicate</DropdownMenuItem>
        {canDeleteCampaigns && <DropdownMenuItem variant="destructive" onSelect={() => setDeletingProject(project)}>Delete</DropdownMenuItem>}
      </>
    )
  }

  return (
    <div className={selectedProject ? "mt-0" : "mt-5"}>
      {selectedProject ? (
        <div>
          {selectedProject.thumbnailUrl && (
            <div className="mb-4 aspect-[4/1] w-full overflow-hidden rounded-2xl bg-muted">
              <ProjectCover project={selectedProject} />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
          <nav aria-label="Campaign breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-1 text-sm">
              <li className="flex shrink-0 items-center">
                <Link
                  href={sectionHref("about")}
                  aria-label="Home"
                  title="Home"
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <House className="size-4" aria-hidden="true" />
                </Link>
              </li>
              <li className="flex shrink-0 items-center gap-1">
                <ChevronRight className="size-4 text-muted-foreground/60" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProject(null)
                    if (linkedTaskId || linkedCampaignId) updateParams({ task: null, campaign: null }, true)
                  }}
                  className="rounded-md px-2 py-2 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Campaigns
                </button>
              </li>
              <li className="flex min-w-0 items-center gap-1" aria-current="page">
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                <span className="min-w-0 truncate px-2 py-2 font-medium text-foreground">{selectedProject.title}</span>
              </li>
            </ol>
          </nav>
            {(canCreate || appUser?.companyId === company.id) && (
              <CampaignGenerateButton project={selectedProject} companyName={company.name} onPatched={patchSelected} />
            )}
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
              /* The agency writes and manages; only the client approves. */
              canEditCampaign={canCreate}
              canReview={!admin && appUser?.companyId === company.id}
              invoices={invoices.filter((invoice) => invoice.projectId === selectedProject.id)}
              invoiceHref={(invoice) => sectionHref("finance", { doc: `invoice:${invoice.id}` })}
              onProjectPatched={patchSelected}
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

      {canManageCampaigns && (
        <>
          <Dialog
            open={Boolean(renamingProject)}
            onOpenChange={(open) => !open && !busy && setRenamingProject(null)}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Rename campaign</DialogTitle>
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
                  This removes the campaign and every task filed under it. This cannot be undone.
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
                  {busy ? "Deleting…" : "Delete campaign"}
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
