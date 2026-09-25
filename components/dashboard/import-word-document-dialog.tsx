"use client"

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { FileUp, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { companyDocumentKindMeta, createCompanyDocument, deleteCompanyDocument, type CompanyDocumentKind } from "@/lib/company-documents"
import { markdownToHtml } from "@/lib/markdown"
import { getProjects, type Project } from "@/lib/projects"
import { getUsers, type AppUser } from "@/lib/users"

const ACCEPTED = ".docx,.md,.markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown"

function isMarkdown(name: string) {
  return /\.(md|markdown)$/i.test(name)
}

function isDocx(name: string) {
  return /\.docx$/i.test(name)
}

function fileTitle(name: string) {
  return name.replace(/\.(docx|md|markdown)$/i, "") || name
}

async function fileToHtml(file: File) {
  if (isMarkdown(file.name)) return markdownToHtml(await file.text()).trim()
  // mammoth is large; only download it when someone actually imports a .docx.
  const { default: mammoth } = await import("mammoth")
  return (await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })).value.trim()
}

export function ImportWordDocumentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState<CompanyDocumentKind>("other")
  const [companyId, setCompanyId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [clients, setClients] = useState<AppUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setOptionsLoading(true)
    Promise.all([getUsers(), getProjects()])
      .then(([userList, projectList]) => {
        if (!active) return
        const seen = new Set<string>()
        setClients(userList.filter((user) => {
          if (!user.companyId || seen.has(user.companyId)) return false
          seen.add(user.companyId)
          return true
        }))
        setProjects(projectList)
      })
      .catch(() => { if (active) setError("Couldn’t load companies and projects.") })
      .finally(() => { if (active) setOptionsLoading(false) })
    return () => { active = false }
  }, [open])

  useEffect(() => {
    if (open) return
    setFiles([])
    setTitle("")
    setKind("other")
    setCompanyId("")
    setProjectId("")
    setError(null)
  }, [open])

  const companyOptions: ComboboxOption[] = useMemo(
    () => clients.map((client) => ({
      value: client.companyId as string,
      label: client.company || client.displayName || client.email || (client.companyId as string),
    })).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })),
    [clients],
  )

  const projectOptions: ComboboxOption[] = useMemo(
    () => projects
      .filter((project) => !companyId || project.companyId === companyId)
      .map((project) => ({ value: project.id, label: project.title }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })),
    [companyId, projects],
  )

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? [])
    if (nextFiles.length === 0) return
    const invalidFile = nextFiles.find((nextFile) => !isDocx(nextFile.name) && !isMarkdown(nextFile.name))
    if (invalidFile) {
      setFiles([])
      setError(`“${invalidFile.name}” isn’t a supported file. Choose .docx, .md, or .markdown files.`)
      return
    }
    setFiles(nextFiles)
    setTitle((current) => nextFiles.length === 1 ? current || fileTitle(nextFiles[0].name) : "")
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (importing) return
    if (files.length === 0) { setError("Choose one or more Word or Markdown files first."); return }
    const trimmedTitle = title.trim()
    if (files.length === 1 && !trimmedTitle) { setError("Give this document a title."); return }
    if (!companyId) { setError("Choose which company this document is for."); return }

    setImporting(true)
    setError(null)
    const createdIds: string[] = []
    try {
      const client = clients.find((entry) => entry.companyId === companyId)
      const project = projects.find((entry) => entry.id === projectId)
      for (const file of files) {
        const body = await fileToHtml(file)
        if (!body) throw new Error(`empty-document:${file.name}`)
        const id = await createCompanyDocument({
          title: files.length === 1 ? trimmedTitle : fileTitle(file.name),
          companyId,
          client: client?.company || client?.displayName || "",
          projectId: projectId || "",
          project: project?.title || "",
          kind,
          status: "draft",
          summary: `Imported from ${file.name}`,
          body,
          shareEnabled: false,
        })
        createdIds.push(id)
      }
      onOpenChange(false)
      router.push(`/dashboard/documents/${createdIds[0]}/edit`)
    } catch {
      await Promise.allSettled(createdIds.map((id) => deleteCompanyDocument(id)))
      setError(files.length > 1
        ? "Couldn’t import these files. No documents were created. Check the files and try again."
        : "Couldn’t import this file. Try another .docx, .md, or .markdown file.")
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import document</DialogTitle>
          <DialogDescription>Bring one or more Word .docx or Markdown .md/.markdown files into Documents as editable drafts.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="import-file">Word or Markdown files</Label>
            <Input id="import-file" type="file" accept={ACCEPTED} multiple onChange={chooseFile} disabled={importing} />
            {files.length > 0 && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>{files.length} {files.length === 1 ? "file" : "files"} selected.</p>
                {files.length === 1
                  ? <p className="truncate">{files[0].name}</p>
                  : <ul className="max-h-24 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2">
                    {files.map((selectedFile, index) => <li key={`${selectedFile.name}-${selectedFile.lastModified}-${index}`} className="truncate">{selectedFile.name}</li>)}
                  </ul>}
              </div>
            )}
          </div>
          {files.length <= 1
            ? <div className="space-y-2">
              <Label htmlFor="import-title">Title</Label>
              <Input id="import-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Client proposal" required />
            </div>
            : <p className="text-sm text-muted-foreground">Each imported document will use its filename as the title.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="import-kind">Type</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as CompanyDocumentKind)}>
                <SelectTrigger id="import-kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(companyDocumentKindMeta).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-company">Company</Label>
              <Combobox
                id="import-company"
                options={companyOptions}
                value={companyId}
                onChange={(next) => {
                  setCompanyId(next)
                  setProjectId((current) => projects.find((project) => project.id === current)?.companyId === next ? current : "")
                }}
                loading={optionsLoading}
                placeholder="Choose a company"
                searchPlaceholder="Search companies..."
                emptyText="No company found."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-project">Project</Label>
            <Combobox
              id="import-project"
              options={projectOptions}
              value={projectId}
              onChange={setProjectId}
              disabled={!companyId}
              loading={optionsLoading}
              placeholder={companyId ? "Not tied to a project" : "Choose a company first"}
              searchPlaceholder="Search projects..."
              emptyText="No project found."
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Cancel</Button>
            <Button type="submit" disabled={importing}>
              {importing ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <FileUp className="mr-2 size-4" aria-hidden="true" />}
              {importing ? "Importing" : files.length > 1 ? "Import documents" : "Import document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
