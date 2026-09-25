"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { getTasksByProjectId, type Task } from "@/lib/tasks"
import type { Project } from "@/lib/projects"
import { getPortalProjects, getPortalTasks, publishPortalProject, unpublishPortalProject, publishPortalTask, unpublishPortalTask } from "@/lib/portal-data"
import type { PortalProject, PortalTask } from "@/lib/portal-model"
import { getDocumentsForClient, setDocumentProject, type SharedDocument } from "@/lib/documents"
import type { CompanyPagePerson } from "@/components/company/company-page"
import { PortalTaskFeedback } from "./portal-task-feedback"

function PublishTask({ task, initial, people }: { task: Task; initial?: PortalTask; people: CompanyPagePerson[] }) {
  const [shared, setShared] = useState(Boolean(initial))
  const [instructions, setInstructions] = useState(initial?.instructions || "")
  const [assignee, setAssignee] = useState(initial?.assigneeUid || "")
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      if (shared) await publishPortalTask(task, instructions.trim(), assignee)
      else await unpublishPortalTask(task.id)
      toast.success(shared ? "Client task updated" : "Task hidden from clients")
    } catch { toast.error("Couldn’t update this task. Try again.") } finally { setSaving(false) }
  }
  return <div className="border-t border-border py-5"><div className="flex items-center justify-between gap-4"><Label htmlFor={`share-${task.id}`} className="leading-6">{task.name}</Label><Switch id={`share-${task.id}`} checked={shared} onCheckedChange={setShared} /></div>{shared && <div className="mt-4 space-y-3"><div><Label htmlFor={`assign-${task.id}`}>Assigned client</Label><select id={`assign-${task.id}`} value={assignee} onChange={e => setAssignee(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">View only · no assigned client</option>{people.filter(person => person.adminUser?.role === "client").map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div><div><Label htmlFor={`instructions-${task.id}`}>Client instructions</Label><Textarea id={`instructions-${task.id}`} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="What does the client need to do? Internal task notes stay private." maxLength={6000} className="mt-2" /></div></div>}<Button size="sm" variant="outline" className="mt-3" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save task sharing"}</Button>{initial && <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">Client feedback</summary><div className="mt-3"><PortalTaskFeedback task={initial} canAct /></div></details>}</div>
}

function ProjectSharing({ project, initial, people, files, onChanged }: { project: Project; initial?: PortalProject; people: CompanyPagePerson[]; files: SharedDocument[]; onChanged: () => void }) {
  const [shared, setShared] = useState(Boolean(initial))
  const [summary, setSummary] = useState(initial?.summary || "")
  const [tasks, setTasks] = useState<Task[]>([])
  const [publishedTasks, setPublishedTasks] = useState<PortalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    Promise.all([getTasksByProjectId(project.id), getPortalTasks(project.companyId, project.id)]).then(([items, sharedItems]) => { if (active) { setTasks(items); setPublishedTasks(sharedItems) } }).catch(() => { if (active) setError("Couldn’t load project tasks. Close and reopen to retry.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [project.id, project.companyId])
  async function save() {
    setSaving(true); setError("")
    try { if (shared) await publishPortalProject(project, summary.trim()); else await unpublishPortalProject(project.id); toast.success(shared ? "Project shared with clients" : "Project hidden from clients"); onChanged() }
    catch { setError("Couldn’t save project sharing. Try again.") } finally { setSaving(false) }
  }
  return <div className="space-y-5"><div className="flex items-center justify-between gap-4"><Label htmlFor="project-visible">Show this project on the company page</Label><Switch id="project-visible" checked={shared} onCheckedChange={setShared} /></div><div><Label htmlFor="client-summary">Client project summary</Label><Textarea id="client-summary" className="mt-2" value={summary} onChange={e => setSummary(e.target.value)} maxLength={2000} placeholder="A short update your client can see." /></div><Button disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save project sharing"}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {initial && <><h3 className="pt-3 text-sm font-semibold">Client tasks</h3>{loading ? <div className="space-y-2" role="status" aria-label="Loading client tasks"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : tasks.length ? tasks.map(task => <PublishTask key={task.id} task={task} initial={publishedTasks.find(item => item.id === task.id)} people={people} />) : null}
    {files.length ? files.map(file => <label key={file.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={file.projectId === project.id} onChange={async e => { try { await setDocumentProject(file.id, e.target.checked ? project.id : ""); onChanged() } catch { toast.error("Couldn’t update file sharing.") } }} />{file.title}{file.projectId && file.projectId !== project.id && <span className="text-xs text-muted-foreground">Assigned to another project</span>}</label>) : null}</>}
  </div>
}

/**
 * The client-portal publishing controls: pick a project, choose what the client
 * sees, share tasks and files. Rendered inside the company's Share dialog.
 * `active` gates the load so it only fetches while the dialog is open.
 */
export function PortalPublishingPanel({ companyId, projects, people, active }: { companyId: string; projects: Project[]; people: CompanyPagePerson[]; active: boolean }) {
  const [selected, setSelected] = useState(projects[0]?.id || "")
  const [published, setPublished] = useState<PortalProject[]>([])
  const [files, setFiles] = useState<SharedDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!active) return
    let live = true
    setLoading(true); setError("")
    Promise.all([getPortalProjects(companyId), getDocumentsForClient(companyId, "__agency_preview__")]).then(([items, docs]) => { if (live) { setPublished(items); setFiles(docs.filter(item => item.companyId === companyId)) } }).catch(() => { if (live) setError("Couldn’t load sharing settings. Close and reopen to retry.") }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [active, companyId, revision])
  const project = projects.find(item => item.id === selected)
  return <div className="space-y-4">{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : loading ? <div className="space-y-3" role="status" aria-label="Loading sharing settings"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-full" /><Skeleton className="h-16 w-full" /></div> : <><div className="grid gap-2"><Label htmlFor="portal-project">Project</Label><select id="portal-project" value={selected} onChange={e => setSelected(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose a project</option>{projects.map(item => <option key={item.id} value={item.id}>{item.title}{published.some(p => p.id === item.id) ? " · Shared" : ""}</option>)}</select></div>{project ? <ProjectSharing key={`${project.id}:${revision}`} project={project} initial={published.find(item => item.id === project.id)} people={people} files={files} onChanged={() => setRevision(n => n + 1)} /> : <p className="text-sm text-muted-foreground">Choose a project to share, or create one in the agency workspace.</p>}</>}</div>
}
