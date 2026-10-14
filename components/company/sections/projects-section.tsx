"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronRight, House, ListTodo, Megaphone } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { SectionAddButton } from "@/components/company/section-add-button"
import { TaskDetailSheet } from "@/components/company/task-detail-sheet"
import { CollectionView } from "@/components/dashboard/collection-view"
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

  // The open campaign follows the address, so links, refresh and the back button all work.
  const linkedCampaignId = searchParams.get("campaign")
  useEffect(() => {
    if (!linkedCampaignId) {
      if (!linkedTaskId) setSelectedProject(null)
      return
    }
    const project = projects.find((item) => item.id === linkedCampaignId)
    if (project) setSelectedProject((current) => current?.id === project.id ? current : project)
  }, [linkedCampaignId, linkedTaskId, projects])

  // An open campaign lives in the address (?campaign=id), with its tab as ?view=.
  function openCampaign(project: Project) {
    updateParams({ campaign: project.id, view: null, task: null })
  }

  function closeCampaign() {
    updateParams({ campaign: null, view: null, task: null })
  }

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
  const publicTasks = (
    <CollectionView
      className=""
      items={jobTasks}
      loading={tasksLoading}
      getKey={(task) => task.id}
      searchFields={(task) => [task.name, (taskStatusMeta[task.status] ?? taskStatusMeta.todo).label, task.dueDate]}
      searchPlaceholder="Search tasks"
      viewKey="tasks"
      empty={{ icon: ListTodo, title: "No shared tasks yet" }}
      card={(task) => ({
        icon: <ListTodo className="size-4 text-muted-foreground" aria-hidden="true" />,
        title: task.name,
        subtitle: task.dueDate ? `Due ${task.dueDate}` : undefined,
        preview: <span className="text-lg font-semibold tracking-[-0.02em] text-foreground">{(taskStatusMeta[task.status] ?? taskStatusMeta.todo).label}</span>,
        onClick: () => updateParams({ task: task.id }),
        ariaLabel: `View task: ${task.name}`,
      })}
      row={(task) => ({ subtitle: task.dueDate ? `Due ${task.dueDate}` : undefined, trailing: (taskStatusMeta[task.status] ?? taskStatusMeta.todo).label })}
    />
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
            <div className="mb-2 aspect-[4/1] w-full overflow-hidden rounded-2xl bg-muted">
              <ProjectCover project={selectedProject} />
            </div>
          )}
          <div className="flex items-center justify-between gap-3 max-sm:justify-end">
          <nav aria-label="Campaign breadcrumb" className="min-w-0 max-sm:hidden">
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
                  onClick={closeCampaign}
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
          </div>
          <div className="mt-0 sm:mt-2">
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
                closeCampaign()
              } : undefined}
            />
          </div>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Campaigns</h2>
          <CollectionView
            className=""
            items={projects}
            getKey={(project) => project.id}
            searchFields={(project) => [project.title, project.service, project.status, project.dueDate]}
            searchPlaceholder="Search campaigns"
            viewKey="company-campaigns"
            actions={canCreate ? <SectionAddButton label="New campaign" onClick={() => setCreatingProject(true)} /> : undefined}
            empty={{
              icon: Megaphone,
              title: canCreate ? "No campaigns yet" : emptyProjectsLabel ?? "No campaigns yet",
              action: canCreate ? <SectionAddButton label="New campaign" onClick={() => setCreatingProject(true)} /> : undefined,
            }}
            card={(project) => ({
              icon: <Megaphone className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
              title: project.title,
              subtitle: modifiedLabel(project),
              preview: <ProjectCover project={project} />,
              onClick: () => openCampaign(project),
              ariaLabel: `Open ${project.title}`,
              menuLabel: `Options for ${project.title}`,
              menu: projectMenu(project),
            })}
            row={(project) => ({ subtitle: modifiedLabel(project), trailing: project.dueDate || undefined })}
          />
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
            openCampaign(project)
          }}
        />
      )}
    </div>
  )
}
