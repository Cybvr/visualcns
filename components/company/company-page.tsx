"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Briefcase, ExternalLink, FolderOpen, Mail, MoreVertical, Share2, User as UserIcon } from "lucide-react"
import { toast } from "sonner"

import { CompanyDocuments, type CompanyDocumentKind } from "@/components/company/company-documents"
import { CompanyDocumentView } from "@/components/dashboard/company-document-view"
import { CompanyEmptyState } from "@/components/company/empty-state"
import { CompanyMedia } from "@/components/company/company-media"
import { CompanyDetails, CompanySidebar, type CompanyDetailsPatch } from "@/components/company/company-sidebar"
import { SectionAddButton } from "@/components/company/section-add-button"
import { SectionNav } from "@/components/company/section-nav"
import { ContractDocument } from "@/components/dashboard/contract-document"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { EstimateDocument } from "@/components/dashboard/estimate-document"
import { InvoiceDocument } from "@/components/dashboard/invoice-document"
import { NewPersonDialog } from "@/components/dashboard/new-person-dialog"
import { NewDocumentDialog } from "@/components/dashboard/new-document-dialog"
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ProjectCover } from "@/components/project-card"
import { UserEditorSheet } from "@/components/dashboard/user-editor-sheet"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { Contract, Estimate, Invoice } from "@/lib/billing"
import { getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import type { CompanyDocument } from "@/lib/company-documents"
import { deleteProjectWithTasks, duplicateProject, projectSlug, renameProject, type Project } from "@/lib/projects"
import { deleteUser, type AppUser } from "@/lib/users"
import { buildEmailComposeHref } from "@/lib/email-composer"
import { PortalPublishingPanel } from "@/components/portal/portal-publishing"
import { usePageHeaderActions } from "@/components/dashboard/page-title-context"

const SECTIONS = [
  { key: "projects", label: "Projects" },
  { key: "about", label: "About" },
  { key: "team", label: "Team" },
  { key: "media", label: "Media" },
  { key: "documents", label: "Documents" },
] as const

type SectionKey = (typeof SECTIONS)[number]["key"]

export interface CompanyPagePerson {
  id: string
  name: string
  subtitle?: string
  role?: string
  photoUrl?: string
  adminUser?: AppUser
}

export interface CompanyPageCompany {
  id: string
  name: string
  logoUrl?: string
  categoryLabel: string
  industry?: string
  location?: string
  website?: string
  description?: string
  companySize?: string
  source?: string
  linkedIn?: string
  tags?: string[]
  primaryContactId?: string
  media?: string[]
}

export interface CompanyPageAdmin {
  sharePath: string
  onViewWorkspace: (person: AppUser) => void
  onMediaChange?: (urls: string[]) => Promise<void>
  onUpdateCompany: (patch: CompanyDetailsPatch) => Promise<void>
  /** Attach an existing contact to this company without creating a new account. */
  onAddExistingContact?: (contactId: string) => Promise<void>
  /** Attach a contact to this company (if needed) and make them the primary contact. */
  onSelectPrimaryContact?: (contactId: string) => Promise<void>
  reload: () => Promise<void>
}

/**
 * The complete company experience used by both dashboard and public routes.
 * Supplying `admin` reveals private actions; omitting it keeps this same block
 * read-only and never requires private data.
 */
export function CompanyPage({
  company,
  people,
  allContacts,
  projects,
  invoices,
  contracts,
  estimates,
  documents = [],
  admin,
  emptyProjectsLabel = "No projects yet.",
}: {
  company: CompanyPageCompany
  people: CompanyPagePerson[]
  /** All contacts across the workspace, for choosing a primary contact. */
  allContacts?: CompanyPagePerson[]
  projects: Project[]
  invoices: Invoice[]
  contracts: Contract[]
  estimates: Estimate[]
  documents?: CompanyDocument[]
  admin?: CompanyPageAdmin
  emptyProjectsLabel?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get("tab")
  const section: SectionKey = SECTIONS.some((s) => s.key === tabParam) ? (tabParam as SectionKey) : "projects"

  const [docKind, docId] = (searchParams.get("doc") ?? "").split(":")
  const selectedDocument = useMemo(() => {
    if (docKind === "invoice") return invoices.find((i) => i.id === docId) ? { kind: "invoice" as const, id: docId } : null
    if (docKind === "contract") return contracts.find((c) => c.id === docId) ? { kind: "contract" as const, id: docId } : null
    if (docKind === "estimate") return estimates.find((e) => e.id === docId) ? { kind: "estimate" as const, id: docId } : null
    if (docKind === "document") return documents.find((d) => d.id === docId) ? { kind: "document" as const, id: docId } : null
    return null
  }, [docKind, docId, invoices, contracts, estimates, documents])

  const [renamingProject, setRenamingProject] = useState<Project | null>(null)
  const [projectTitleDraft, setProjectTitleDraft] = useState("")
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [projectActionBusy, setProjectActionBusy] = useState(false)
  const [addingPerson, setAddingPerson] = useState(false)
  const [selectingExistingPerson, setSelectingExistingPerson] = useState(false)
  const [existingPersonQuery, setExistingPersonQuery] = useState("")
  const [addingExistingPersonId, setAddingExistingPersonId] = useState<string | null>(null)
  const [editingPerson, setEditingPerson] = useState<AppUser | null>(null)
  const [pendingRemove, setPendingRemove] = useState<AppUser | null>(null)
  const [removing, setRemoving] = useState(false)
  const [creatingDocument, setCreatingDocument] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)

  useEffect(() => {
    getBusinessProfile()
      .then(setIssuer)
      .catch(() => {
        // Document header just stays without issuer details.
      })
  }, [])

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function handleSectionChange(key: SectionKey) {
    updateParams({ tab: key === "projects" ? null : key, doc: null })
  }

  function handleSelectDocument(kind: CompanyDocumentKind, id: string) {
    if (admin) {
      router.push(`/dashboard/${kind}s/${id}/edit`)
      return
    }
    updateParams({ tab: "documents", doc: `${kind}:${id}` })
  }

  function handleCloseDocument() {
    updateParams({ doc: null })
  }

  function handleAddDocument(kind: CompanyDocumentKind) {
    if (kind === "document") {
      setCreatingDocument(true)
      return
    }
    router.push(`/dashboard/${kind}s/new?companyId=${encodeURIComponent(company.id)}`)
  }

  const absoluteUrl = (path: string) =>
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path

  const primaryContact = people.find((person) => person.adminUser?.uid === company.primaryContactId)
    || people.find((person) => person.adminUser?.email)

  const availableExistingContacts = (allContacts ?? [])
    .filter((person) => person.role !== "admin" && !people.some((current) => current.id === person.id))

  const existingContacts = availableExistingContacts
    .filter((person) => {
      const query = existingPersonQuery.trim().toLowerCase()
      return !query || `${person.name} ${person.subtitle ?? ""}`.toLowerCase().includes(query)
    })

  async function handleAddExistingPerson(contactId: string) {
    if (!admin?.onAddExistingContact || addingExistingPersonId) return
    setAddingExistingPersonId(contactId)
    try {
      await admin.onAddExistingContact(contactId)
      setSelectingExistingPerson(false)
      setExistingPersonQuery("")
    } catch (addError) {
      console.error("Error adding existing contact:", addError)
    } finally {
      setAddingExistingPersonId(null)
    }
  }

  async function handleRemovePerson() {
    if (!admin || !pendingRemove || removing) return
    setRemoving(true)
    try {
      await deleteUser(pendingRemove.uid)
      await admin.reload()
      setPendingRemove(null)
    } catch (removeError) {
      console.error("Error removing person:", removeError)
    } finally {
      setRemoving(false)
    }
  }

  const profile = {
    id: company.id,
    name: company.name,
    logoUrl: company.logoUrl,
    industry: company.industry,
    location: company.location,
    website: company.website,
    description: company.description,
    companySize: company.companySize,
    source: company.source,
    linkedIn: company.linkedIn,
    tags: company.tags,
    primaryContactId: company.primaryContactId,
  }
  const showCompanySidebar = Boolean(profile.industry)

  async function handleDuplicateProject(project: Project) {
    if (!admin || projectActionBusy) return
    setProjectActionBusy(true)
    try {
      await duplicateProject(project)
      await admin.reload()
      toast.success("Project duplicated")
    } catch (duplicateError) {
      console.error("Error duplicating project:", duplicateError)
      toast.error("The project could not be duplicated.")
    } finally {
      setProjectActionBusy(false)
    }
  }

  async function handleRenameProject() {
    if (!admin || !renamingProject || projectActionBusy) return
    const title = projectTitleDraft.trim()
    if (!title || title === renamingProject.title) return
    setProjectActionBusy(true)
    try {
      await renameProject(renamingProject.id, title)
      setRenamingProject(null)
      await admin.reload()
      toast.success("Project renamed")
    } catch (renameError) {
      console.error("Error renaming project:", renameError)
      toast.error("The project could not be renamed.")
    } finally {
      setProjectActionBusy(false)
    }
  }

  async function handleDeleteProject() {
    if (!admin || !deletingProject || projectActionBusy) return
    setProjectActionBusy(true)
    try {
      await deleteProjectWithTasks(deletingProject.id)
      setDeletingProject(null)
      await admin.reload()
      toast.success("Project deleted")
    } catch (deleteError) {
      console.error("Error deleting project:", deleteError)
      toast.error("The project could not be deleted.")
    } finally {
      setProjectActionBusy(false)
    }
  }

  const headerActions = useMemo(() => admin ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            title="More actions"
            className="flex size-10 items-center justify-center rounded-xl bg-transparent text-current outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring max-md:text-primary-foreground max-md:hover:bg-white/10"
          >
            <MoreVertical className="size-5" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={buildEmailComposeHref({
              companyId: company.id,
              companyName: company.name,
              recipientEmail: primaryContact?.adminUser?.email,
              recipientName: primaryContact?.adminUser?.displayName || primaryContact?.name,
              ctaText: "Open your client portal",
              ctaUrl: admin.sharePath,
            })}>
              <Mail className="size-4" aria-hidden="true" />
              Email
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShareOpen(true)}>
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={admin.sharePath} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" aria-hidden="true" />
              Open page
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null, [admin, company.id, company.name, primaryContact])

  usePageHeaderActions(headerActions)

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <div className={showCompanySidebar ? "grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]" : "block"}>
        {showCompanySidebar && <CompanySidebar company={profile} />}

        <div className="min-w-0">
          <div className="print:hidden">
            <SectionNav sections={SECTIONS} active={section} onChange={handleSectionChange} />
          </div>

          {section === "about" && (
            <div className="mt-4">
              <CompanyDetails company={profile} onSave={admin?.onUpdateCompany} />
            </div>
          )}

          {section === "team" && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="sr-only">Team</h2>
                <span className="text-sm text-muted-foreground">
                  {people.length} contact{people.length === 1 ? "" : "s"}
                </span>
                {admin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SectionAddButton label="Add person" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setAddingPerson(true)}>New person</DropdownMenuItem>
                      {admin.onAddExistingContact && (
                        <DropdownMenuItem
                          onSelect={() => {
                            setExistingPersonQuery("")
                            setSelectingExistingPerson(true)
                          }}
                        >
                          Select existing contact
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {people.length === 0 ? (
                <CompanyEmptyState
                  icon={UserIcon}
                  title="No contacts yet"
                  description={admin ? "Add the first person to give them access to this workspace." : undefined}
                  action={admin ? <SectionAddButton onClick={() => setAddingPerson(true)} label="Add person" /> : undefined}
                />
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {people.map((person) => (
                    <MobileDataCard
                      key={person.id}
                      onClick={admin && person.adminUser ? () => setEditingPerson(person.adminUser ?? null) : undefined}
                      ariaLabel={`Open ${person.name}`}
                      title={person.name}
                      subtitle={person.subtitle || person.role || "Team member"}
                      imageUrl={person.photoUrl}
                      icon={<UserIcon className="size-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />}
                      menuLabel={`Options for ${person.name}`}
                      menu={
                        admin && person.adminUser ? (
                          <>
                            <DropdownMenuItem onSelect={() => setEditingPerson(person.adminUser ?? null)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => person.adminUser && admin.onViewWorkspace(person.adminUser)}>
                              View workspace
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setPendingRemove(person.adminUser ?? null)}
                            >
                              Remove person
                            </DropdownMenuItem>
                          </>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {section === "projects" && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="sr-only">Projects</h2>
                <span className="text-sm text-muted-foreground">
                  {projects.length} project{projects.length === 1 ? "" : "s"}
                </span>
                {admin && <SectionAddButton onClick={() => setCreatingProject(true)} label="New project" />}
              </div>

              {projects.length === 0 ? (
                <CompanyEmptyState
                  icon={Briefcase}
                  title={admin ? "No projects yet" : emptyProjectsLabel}
                  action={admin ? <SectionAddButton onClick={() => setCreatingProject(true)} label="New project" /> : undefined}
                />
              ) : (
                <>
                  <div className="mt-4 space-y-2 sm:hidden">
                    {projects.map((project) => (
                      <MobileDataCard
                        key={project.id}
                        onClick={() => router.push(`/dashboard/projects/${projectSlug(project)}`)}
                        ariaLabel={`Open ${project.title}`}
                        title={project.title}
                        subtitle={project.dueDate || "No due date"}
                        icon={<FolderOpen className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                        menuLabel={`Options for ${project.title}`}
                        menu={
                          admin ? (
                            <>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setProjectTitleDraft(project.title)
                                  setRenamingProject(project)
                                }}
                              >
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void handleDuplicateProject(project)}>
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onSelect={() => setDeletingProject(project)}>
                                Delete
                              </DropdownMenuItem>
                            </>
                          ) : undefined
                        }
                      />
                    ))}
                  </div>

                  <div className="mt-4 hidden sm:block">
                    <GridCardList>
                      {projects.map((project) => (
                        <GridCard
                          key={project.id}
                          href={`/dashboard/projects/${projectSlug(project)}`}
                          ariaLabel={`Open ${project.title}`}
                          title={project.title}
                          icon={<FolderOpen className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                          preview={<ProjectCover project={project} />}
                          menuLabel={`Options for ${project.title}`}
                          menu={
                            admin ? (
                              <>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setProjectTitleDraft(project.title)
                                    setRenamingProject(project)
                                  }}
                                >
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => void handleDuplicateProject(project)}>
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onSelect={() => setDeletingProject(project)}>
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : undefined
                          }
                        />
                      ))}
                    </GridCardList>
                  </div>
                </>
              )}
            </div>
          )}

          {section === "media" && (
            <CompanyMedia
              logoUrl={company.logoUrl}
              projects={projects}
              uploaded={company.media ?? []}
              onUploadedChange={
                admin?.onMediaChange ? (urls) => void admin.onMediaChange?.(urls) : undefined
              }
            />
          )}

          {section === "documents" && (
            <div className="mt-4">
              {selectedDocument ? (
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <button
                      type="button"
                      onClick={handleCloseDocument}
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      Back to Documents
                    </button>
                    {!admin && (
                      <DocumentActions
                        title={`${company.name} ${selectedDocument.kind === "invoice" ? "Invoice" : selectedDocument.kind === "contract" ? "Contract" : selectedDocument.kind === "estimate" ? "Estimate" : "Document"}`}
                      />
                    )}
                  </div>
                  {selectedDocument.kind === "invoice" && (
                    <InvoiceDocument
                      invoice={invoices.find((i) => i.id === selectedDocument.id) as Invoice}
                      issuer={issuer ?? undefined}
                    />
                  )}
                  {selectedDocument.kind === "contract" && (
                    <ContractDocument
                      contract={contracts.find((c) => c.id === selectedDocument.id) as Contract}
                      issuer={issuer ?? undefined}
                    />
                  )}
                  {selectedDocument.kind === "estimate" && (
                    <EstimateDocument
                      estimate={estimates.find((e) => e.id === selectedDocument.id) as Estimate}
                      issuer={issuer ?? undefined}
                    />
                  )}
                  {selectedDocument.kind === "document" && (
                    <CompanyDocumentView
                      document={documents.find((d) => d.id === selectedDocument.id) as CompanyDocument}
                    />
                  )}
                </div>
              ) : (
                <CompanyDocuments
                  invoices={invoices}
                  contracts={contracts}
                  estimates={estimates}
                  documents={documents}
                  onSelect={handleSelectDocument}
                  canAdd={Boolean(admin)}
                  onAdd={handleAddDocument}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {admin && (
        <>
          <NewDocumentDialog
            open={creatingDocument}
            onOpenChange={setCreatingDocument}
            initialCompanyId={company.id}
          />

          <NewPersonDialog
            open={addingPerson}
            onOpenChange={setAddingPerson}
            fixedRole="client"
            subjectNoun="contact"
            joinWorkspaceId={company.id}
            joinWorkspaceName={company.name}
            onSaved={async () => {
              setAddingPerson(false)
              await admin.reload()
            }}
          />

          <Dialog
            open={selectingExistingPerson}
            onOpenChange={(open) => {
              setSelectingExistingPerson(open)
              if (!open) setExistingPersonQuery("")
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Select existing contact</DialogTitle>
                <DialogDescription>Choose a contact already in VisualHQ to add to this company.</DialogDescription>
              </DialogHeader>
              <Input
                autoFocus
                value={existingPersonQuery}
                onChange={(event) => setExistingPersonQuery(event.target.value)}
                placeholder="Search contacts"
                aria-label="Search contacts"
              />
              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                {existingContacts.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {availableExistingContacts.length ? "No contacts match your search." : "No existing contacts available."}
                  </p>
                ) : (
                  existingContacts.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      disabled={addingExistingPersonId !== null}
                      onClick={() => void handleAddExistingPerson(person.id)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-left outline-none last:border-b-0 hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{person.name}</span>
                        {person.subtitle && <span className="block truncate text-xs text-muted-foreground">{person.subtitle}</span>}
                      </span>
                      {addingExistingPersonId === person.id && <span className="shrink-0 text-xs text-muted-foreground">Adding…</span>}
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <UserEditorSheet
            open={Boolean(editingPerson)}
            user={editingPerson}
            subjectNoun="user"
            onClose={() => setEditingPerson(null)}
            onSaved={async () => {
              setEditingPerson(null)
              await admin.reload()
            }}
          />

          <AlertDialog
            open={Boolean(pendingRemove)}
            onOpenChange={(open) => !open && !removing && setPendingRemove(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove person?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes {pendingRemove?.displayName || pendingRemove?.email || "this person"}&apos;s login.
                  Projects, tasks, and documents stay with the company. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={removing}
                  onClick={(event) => {
                    event.preventDefault()
                    void handleRemovePerson()
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {removing ? "Removing…" : "Remove person"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog
            open={Boolean(renamingProject)}
            onOpenChange={(open) => !open && !projectActionBusy && setRenamingProject(null)}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Rename project</DialogTitle>
                <DialogDescription>Choose a new name for {renamingProject?.title}.</DialogDescription>
              </DialogHeader>
              <Input
                value={projectTitleDraft}
                onChange={(event) => setProjectTitleDraft(event.target.value)}
                maxLength={120}
                autoFocus
                aria-label="Project name"
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setRenamingProject(null)} disabled={projectActionBusy}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleRenameProject()}
                  disabled={projectActionBusy || !projectTitleDraft.trim() || projectTitleDraft.trim() === renamingProject?.title}
                >
                  {projectActionBusy ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={Boolean(deletingProject)}
            onOpenChange={(open) => !open && !projectActionBusy && setDeletingProject(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {deletingProject?.title}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the project and every task filed under it. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={projectActionBusy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={projectActionBusy}
                  onClick={(event) => {
                    event.preventDefault()
                    void handleDeleteProject()
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {projectActionBusy ? "Deleting…" : "Delete project"}
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
              router.push(`/dashboard/projects/${projectSlug(project)}`)
            }}
          />

          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Share client portal</DialogTitle>
                <DialogDescription>Control what {company.name} sees after signing in, then share their workspace link.</DialogDescription>
              </DialogHeader>
              <ShareLink value={absoluteUrl(admin.sharePath)} label="Workspace link" />
              <p className="text-xs text-muted-foreground">Clients sign in with their invited account. Previously shared company links continue to open this portal.</p>
              <div className="border-t border-border pt-4">
                <PortalPublishingPanel companyId={company.id} projects={projects} people={people} active={shareOpen} />
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </main>
  )
}

function ShareLink({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Input
        readOnly
        value={value}
        aria-label={label}
        className="font-mono text-xs"
        onClick={(event) => event.currentTarget.select()}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0"
        onClick={() => {
          void navigator.clipboard.writeText(value)
          toast.success("Link copied to clipboard")
        }}
      >
        Copy link
      </Button>
    </div>
  )
}
