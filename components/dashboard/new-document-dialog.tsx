"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight, FilePlus, LayoutTemplate, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { findOrCreateCompany } from "@/lib/companies"
import { COMPANY_DOCUMENT_TEMPLATES, createCompanyDocument } from "@/lib/company-documents"
import { createProject, getProjects, type Project } from "@/lib/projects"
import { getUsers, type AppUser } from "@/lib/users"

type Step = "start" | "templates" | "details"

/**
 * Everything that has to be decided before a document exists: which template,
 * what it's called, and who it's for. The document itself is written on the
 * edit page this hands you to, so the writing screen holds nothing but the
 * document.
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
  const [step, setStep] = useState<Step>("start")
  const [backTo, setBackTo] = useState<Step>("start")
  const [templateId, setTemplateId] = useState(COMPANY_DOCUMENT_TEMPLATES[0].id)
  const [title, setTitle] = useState(COMPANY_DOCUMENT_TEMPLATES[0].title)
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
    setStep("start")
    setBackTo("start")
    setTemplateId(COMPANY_DOCUMENT_TEMPLATES[0].id)
    setTitle(COMPANY_DOCUMENT_TEMPLATES[0].title)
    setCompanyId(initialCompanyId ?? "")
    setProjectId("")
    setError(null)
  }, [open, initialCompanyId])

  const template = COMPANY_DOCUMENT_TEMPLATES.find((entry) => entry.id === templateId) ?? COMPANY_DOCUMENT_TEMPLATES[0]

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

  /** Picking a template renames the document too, unless it has been named by hand. */
  function chooseTemplate(id: string) {
    const next = COMPANY_DOCUMENT_TEMPLATES.find((entry) => entry.id === id)
    if (!next) return
    setTemplateId(id)
    if (!title.trim() || title === template.title) setTitle(next.title)
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
        kind: template.kind,
        status: "draft",
        summary: "",
        body: template.body,
        shareEnabled: false,
      })
      onOpenChange(false)
      router.push(`/dashboard/documents/${id}/edit`)
    } catch (createError) {
      console.error("Error creating document:", createError)
      setError("Couldn't create this document. Try again.")
      setCreating(false)
    }
  }

  const steps: Step[] = ["start", "templates", "details"]
  const stepIndex = steps.indexOf(step)

  function startBlank() {
    chooseTemplate("blank")
    setBackTo("start")
    setStep("details")
  }

  function pickTemplate(id: string) {
    chooseTemplate(id)
    setBackTo("templates")
    setStep("details")
  }

  const startOptions = [
    { key: "blank", label: "From blank", icon: FilePlus, onClick: startBlank },
    { key: "template", label: "From template", icon: LayoutTemplate, onClick: () => setStep("templates") },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-4 overflow-hidden">
        <DialogHeader className="flex-row items-center gap-2 space-y-0 text-left">
          {step !== "start" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-ml-2 size-8 shrink-0"
              aria-label="Back"
              onClick={() => setStep(step === "details" ? backTo : "start")}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
          )}
          <DialogTitle>{step === "templates" ? "Templates" : step === "details" && templateId !== "blank" ? template.label : "New document"}</DialogTitle>
          <DialogDescription className="sr-only">Create a document from blank or from a template.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full w-[300%] transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${(stepIndex * 100) / 3}%)` }}
          >
            <div className="w-1/3 shrink-0 px-0.5" inert={step !== "start"}>
              <div className="grid grid-cols-2 gap-2">
                {startOptions.map(({ key, label, icon: Icon, onClick }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={onClick}
                    className="flex flex-col items-center gap-2 rounded-[10px] border border-border px-3 py-6 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-1/3 shrink-0 overflow-y-auto px-0.5" inert={step !== "templates"}>
              <div className="flex flex-col">
                {COMPANY_DOCUMENT_TEMPLATES.filter((entry) => entry.id !== "blank").map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => pickTemplate(entry.id)}
                    className="flex h-11 items-center justify-between rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {entry.label}
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={submit} className="flex w-1/3 shrink-0 flex-col overflow-y-auto px-0.5" inert={step !== "details"}>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
