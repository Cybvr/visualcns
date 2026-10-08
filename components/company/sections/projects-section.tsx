"use client"

import { useState } from "react"
import { ArrowLeft, Briefcase, FolderOpen } from "lucide-react"
import { toast } from "sonner"

import { CompanyEmptyState } from "@/components/company/empty-state"
import { useCompanyPage } from "@/components/company/company-page-context"
import { SectionAddButton } from "@/components/company/section-add-button"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
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

export function ProjectsSection() {
  const { company, projects, admin, emptyProjectsLabel } = useCompanyPage()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
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
          <button
            type="button"
            onClick={() => setSelectedProject(null)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Jobs
          </button>
          <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em]">{selectedProject.title}</h2>
          <div className="mt-4">
            <ProjectDetail
              project={selectedProject}
              isAdmin={Boolean(admin)}
              publicView={!admin}
              embedded
              companyId={company.id}
              clientName={company.name}
              onProjectPatched={(patch) => setSelectedProject((current) => current ? { ...current, ...patch } : current)}
              onProjectDeleted={admin ? async () => {
                await admin.reload()
                setSelectedProject(null)
              } : undefined}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <h2 className="sr-only">Jobs</h2>
            <span className="sidebar-nav-label text-muted-foreground">Jobs</span>
            {admin && <SectionAddButton onClick={() => setCreatingProject(true)} label="New project" />}
          </div>

          {projects.length === 0 ? (
            <CompanyEmptyState
              icon={Briefcase}
              title={admin ? "No jobs yet" : emptyProjectsLabel}
              action={admin ? <SectionAddButton onClick={() => setCreatingProject(true)} label="New project" /> : undefined}
            />
          ) : (
            <>
              <div className="mt-4 space-y-2 sm:hidden">
                {projects.map((project) => (
                  <MobileDataCard
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    ariaLabel={`Open ${project.title}`}
                    title={project.title}
                    subtitle={project.dueDate || "No due date"}
                    icon={<FolderOpen className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                    menuLabel={`Options for ${project.title}`}
                    menu={projectMenu(project)}
                  />
                ))}
              </div>

              <div className="mt-4 hidden sm:block">
                <GridCardList>
                  {projects.map((project) => (
                    <GridCard
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      ariaLabel={`Open ${project.title}`}
                      title={project.title}
                      icon={<FolderOpen className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                      preview={<ProjectCover project={project} />}
                      menuLabel={`Options for ${project.title}`}
                      menu={projectMenu(project)}
                    />
                  ))}
                </GridCardList>
              </div>
            </>
          )}
        </>
      )}

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

          <NewProjectDialog
            open={creatingProject}
            onOpenChange={setCreatingProject}
            initialCompanyId={company.id}
            onCreated={async (project) => {
              await admin.reload()
              setSelectedProject(project)
            }}
          />
        </>
      )}
    </div>
  )
}
