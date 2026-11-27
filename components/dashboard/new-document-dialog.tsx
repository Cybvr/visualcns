"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { findOrCreateCompany } from "@/lib/companies"
import { createCompanyDocument } from "@/lib/company-documents"
import { createProject, getProjects, type Project } from "@/lib/projects"
import { getUsers, type AppUser } from "@/lib/users"

/**
 * Everything that has to be decided before a document exists: what it's called
 * and who it's for. The document itself is written on the edit page this hands
 * you to, so the writing screen holds nothing but the document.
 */
export function NewDocumentDialog({
  open,
  onOpenChange,
  initialCompanyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCompanyId?: string
}) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "")
  const [projectId, setProjectId] = useState("")
  const [clients, setClients] = useState<AppUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setOptionsLoading(true)
    Promise.all([getUsers(), getProjects()])
      .then(([userList, projectList]) => {
        if (!active) return
        // One entry per company, since several people share a workspace.
        const seen = new Set<string>()
        setClients(userList.filter((user) => {
          if (!user.companyId || seen.has(user.companyId)) return false
          seen.add(user.companyId)
          return true
        }))
        setProjects(projectList)
      })
      .catch(() => { if (active) setError("Couldn't load companies and projects.") })
      .finally(() => { if (active) setOptionsLoading(false) })
    return () => { active = false }
  }, [open])

  /** Reopening starts fresh, so a cancelled attempt never half-fills the next one. */
  useEffect(() => {
    if (open) return
    setTitle("")
    setCompanyId(initialCompanyId ?? "")
    setProjectId("")
    setError(null)
  }, [open, initialCompanyId])

  const companyOptions: ComboboxOption[] = clients.map((client) => ({
    value: client.companyId as string,
    label: client.company || client.displayName || client.email || (client.companyId as string),
  }))

  const projectOptions: ComboboxOption[] = projects
    .filter((project) => !companyId || project.companyId === companyId)
    .map((project) => ({ value: project.id, label: project.title }))

  /** Reuse the workspace with this name, or spin up a bare one, the same shape the companies page makes. */
  async function createCompany(name: string): Promise<ComboboxOption | null> {
    const company = await findOrCreateCompany({ name })
    setClients((prev) => prev.some((entry) => entry.companyId === company.id)
      ? prev
      : [...prev, { uid: company.id, email: "", company: company.name, companyId: company.id, role: "client" }])
    return { value: company.id, label: company.name }
  }

  /** A new project belongs to the chosen company, so it needs one picked first. */
  async function createProjectOption(name: string): Promise<ComboboxOption | null> {
    if (!companyId) { setError("Choose a company before adding a project."); return null }
    const client = clients.find((entry) => entry.companyId === companyId)
    const clientName = client?.company || client?.displayName || companyId
    const id = await createProject({
      companyId,
      client: clientName,
      title: name,
      service: "General",
      status: "in-progress",
      progress: 0,
      dueDate: "",
    })
    setProjects((prev) => [...prev, { id, companyId, client: clientName, title: name, service: "General", status: "in-progress", progress: 0, dueDate: "" }])
    return { value: id, label: name }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (creating) return
    const trimmedTitle = title.trim() || "Untitled"
    if (!companyId) { setError("Choose which company this document is for."); return }

    setCreating(true)
    setError(null)
    try {
      const client = clients.find((entry) => entry.companyId === companyId)
      const project = projects.find((entry) => entry.id === projectId)
      const id = await createCompanyDocument({
        title: trimmedTitle,
        companyId,
        client: client?.company || client?.displayName || "",
        projectId: projectId || "",
        project: project?.title || "",
        kind: "other",
        status: "draft",
        summary: "",
        body: "",
        shareEnabled: false,
      })
      onOpenChange(false)
      // Opens beside Ngai, like every other document.
      router.push(`/admin/documents?document=${encodeURIComponent(id)}`)
    } catch (createError) {
      console.error("Error creating document:", createError)
      setError("Couldn't create this document. Try again.")
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-4 overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>New document</DialogTitle>
          <DialogDescription className="sr-only">Create a document.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col overflow-y-auto px-0.5">
          <div className="space-y-4 py-0.5">
            <div>
              <Label htmlFor="document-title">Title</Label>
              <Input
                id="document-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Untitled"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="document-company">Company</Label>
              <div className="mt-1">
                <Combobox
                  id="document-company"
                  options={companyOptions}
                  value={companyId}
                  onChange={(next) => {
                    setCompanyId(next)
                    // Drop a project that belongs to a different company.
                    setProjectId((current) =>
                      projects.find((project) => project.id === current)?.companyId === next ? current : "",
                    )
                  }}
                  onCreate={createCompany}
                  loading={optionsLoading}
                  placeholder="Choose a company"
                  searchPlaceholder="Search companies..."
                  emptyText="No company found."
                  createLabel={(query) => `Add “${query}”`}
                  createHint="Type a name to add a company"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="document-project">Project</Label>
              <div className="mt-1">
                <Combobox
                  id="document-project"
                  options={projectOptions}
                  value={projectId}
                  onChange={setProjectId}
                  onCreate={createProjectOption}
                  disabled={!companyId}
                  loading={optionsLoading}
                  placeholder={companyId ? "Optional" : "Choose a company first"}
                  searchPlaceholder="Search projects..."
                  emptyText="No project found."
                  createLabel={(query) => `Add “${query}”`}
                  createHint="Type a name to add a project"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" disabled={creating} className="mt-5 w-full">
            {creating && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
