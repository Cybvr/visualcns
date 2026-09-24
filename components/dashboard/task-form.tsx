"use client"

import type React from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2, Check, ChevronsUpDown, Plus } from "lucide-react"
import {
  createTask,
  updateTask,
  taskStatusMeta,
  taskPriorityMeta,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/tasks"
import { getProjects, getProjectsByCompanyId, createProject, type Project } from "@/lib/projects"
import { getUsers, type AppUser } from "@/lib/users"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { taskContentHtml } from "@/components/dashboard/task-content"

type FormState = {
  name: string
  companyId: string
  projectId: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  content: string
}

const EMPTY_FORM: FormState = {
  name: "",
  companyId: "",
  projectId: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
  content: "",
}

function normalizeOptionLabel(value?: string | null) {
  return (value ?? "").trim().toLowerCase()
}

function normalizeTaskStatus(value?: string | null): TaskStatus {
  const normalized = normalizeOptionLabel(value).replace(/[ _]+/g, "-")
  if (["in-progress", "inprogress", "doing", "active"].includes(normalized)) return "in-progress"
  if (["review", "in-review", "inreview"].includes(normalized)) return "review"
  if (["done", "complete", "completed"].includes(normalized)) return "done"
  return "todo"
}

interface TaskFormProps {
  task?: Task | null
  /**
   * When set (client dashboard), the task is locked to this client: no client
   * picker, and only their projects load. Omit for the admin form.
   */
  fixedClient?: { companyId: string; clientName: string }
  /**
   * Seed values for a NEW task (ignored when editing). Lets a board column's
   * "+ New" open the form with that column's status preselected.
   */
  defaults?: { status?: TaskStatus }
  onSaved: (id: string) => void
  onCancel: () => void
}

export function TaskForm({ task, fixedClient, defaults, onSaved, onCancel }: TaskFormProps) {
  const isEdit = Boolean(task)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [clients, setClients] = useState<AppUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  
  const [projectOpen, setProjectOpen] = useState(false)
  const [projectQuery, setProjectQuery] = useState("")

  useEffect(() => {
    if (fixedClient) {
      // Client-scoped: reading all users is admin-only, so just load their projects.
      getProjectsByCompanyId(fixedClient.companyId)
        .then(setProjects)
        .catch((err) => console.error("Error loading form options:", err))
        .finally(() => setOptionsLoading(false))
      return
    }
    Promise.all([getUsers(), getProjects()])
      .then(([users, allProjects]) => {
        setClients(users.filter((u) => u.companyId))
        setProjects(allProjects)
      })
      .catch((err) => console.error("Error loading form options:", err))
      .finally(() => setOptionsLoading(false))
    // Depend on the id, not the object, so a new object literal each render doesn't refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedClient?.companyId])

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name ?? "",
        companyId: task.companyId ?? fixedClient?.companyId ?? "",
        projectId: task.projectId ?? "",
        status: normalizeTaskStatus(task.status),
        priority: task.priority ?? EMPTY_FORM.priority,
        dueDate: task.dueDate ?? "",
        content: task.content ?? "",
      })
    } else {
      setForm({
        ...EMPTY_FORM,
        companyId: fixedClient?.companyId ?? "",
        status: defaults?.status ?? EMPTY_FORM.status,
      })
    }
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, fixedClient?.companyId, defaults?.status])

  useEffect(() => {
    if (!task || optionsLoading) return

    setForm((prev) => {
      if (prev.companyId && prev.projectId) return prev

      let nextCompanyId = prev.companyId
      let nextProjectId = prev.projectId

      if (!nextProjectId && task.project) {
        const matchingProjects = projects.filter((project) => {
          if (nextCompanyId && project.companyId !== nextCompanyId) return false
          return normalizeOptionLabel(project.title) === normalizeOptionLabel(task.project)
        })
        const matchedProject = matchingProjects[0]
        if (matchedProject) {
          nextProjectId = matchedProject.id
          if (!nextCompanyId) nextCompanyId = matchedProject.companyId
        }
      }

      if (!nextCompanyId) {
        const matchedClient = clients.find((client) =>
          [client.company, client.displayName, client.email, client.companyId].some(
            (value) => normalizeOptionLabel(String(value ?? "")) === normalizeOptionLabel(task.client),
          ),
        )
        if (matchedClient?.companyId) nextCompanyId = matchedClient.companyId
      }

      if (nextCompanyId === prev.companyId && nextProjectId === prev.projectId) return prev
      return {
        ...prev,
        companyId: nextCompanyId,
        projectId: nextProjectId,
      }
    })
  }, [clients, optionsLoading, projects, task])

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const clientOptions = Array.from(
    new Map(
      clients.map((u) => [
        u.companyId as string,
        {
          companyId: u.companyId as string,
          label: u.company || u.displayName || u.email || (u.companyId as string),
        },
      ]),
    ).values(),
  )

  const selectedClientFallback =
    form.companyId && !clientOptions.some((option) => option.companyId === form.companyId)
      ? {
          companyId: form.companyId,
          label: task?.client || form.companyId,
        }
      : null

  const visibleClientOptions = selectedClientFallback ? [selectedClientFallback, ...clientOptions] : clientOptions

  // Only offer projects that belong to the chosen client.
  const clientProjects = projects.filter((p) => !form.companyId || p.companyId === form.companyId)

  async function handleCreateProject() {
    if (!form.companyId || !projectQuery.trim()) return
    setSaving(true)
    try {
      const title = projectQuery.trim()
      const clientUser = clients.find((c) => c.companyId === form.companyId)
      const clientName = fixedClient?.clientName || clientUser?.company || clientUser?.displayName || form.companyId
      const newProjectId = await createProject({
        companyId: form.companyId,
        client: clientName,
        title: title,
        service: "General",
        status: "in-progress",
        progress: 0,
        dueDate: "",
      })

      const newProject: Project = {
        id: newProjectId,
        companyId: form.companyId,
        client: clientName,
        title,
        service: "General",
        status: "in-progress",
        progress: 0,
        dueDate: "",
      }
      setProjects((prev) => [...prev, newProject])
      set("projectId", newProjectId)
      setProjectOpen(false)
      setProjectQuery("")
    } catch (err) {
      console.error("Failed to create project", err)
      setError("Failed to create project.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setError(null)

    if (!form.name.trim()) {
      setError("Task name is required.")
      return
    }
    if (!form.companyId) {
      setError("Pick a client.")
      return
    }
    if (!form.projectId) {
      setError("Pick a project.")
      return
    }

    const clientUser = clients.find((c) => c.companyId === form.companyId)
    const project = projects.find((p) => p.id === form.projectId)
    const payload = {
      name: form.name.trim(),
      companyId: form.companyId,
      client:
        fixedClient?.clientName || clientUser?.company || clientUser?.displayName || task?.client || form.companyId,
      projectId: form.projectId,
      project: project?.title || task?.project || "",
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate.trim(),
      content: form.content,
    }

    setSaving(true)
    try {
      if (isEdit && task) {
        await updateTask(task.id, payload)
        onSaved(task.id)
      } else {
        const id = await createTask(payload)
        onSaved(id)
      }
    } catch (err) {
      console.error("Error saving task:", err)
      setError(err instanceof Error ? err.message : "Failed to save task.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Task name</Label>
          <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>

        <div className={fixedClient ? "grid gap-3" : "grid gap-3 md:grid-cols-2"}>
          {!fixedClient && (
          <div className="space-y-1.5">
            <Label htmlFor="companyId">Client</Label>
            <Select
              value={form.companyId || undefined}
              onValueChange={(v) => {
                setForm((prev) => ({
                  ...prev,
                  companyId: v,
                  // Clear the project if it belongs to a different client.
                  projectId: projects.find((p) => p.id === prev.projectId)?.companyId === v ? prev.projectId : "",
                }))
              }}
            >
              <SelectTrigger id="companyId" className="w-full">
                <SelectValue placeholder={optionsLoading ? "Loading..." : "Select a client"} />
              </SelectTrigger>
              <SelectContent>
                {[...visibleClientOptions].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })).map((c) => (
                  <SelectItem key={c.companyId} value={c.companyId}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}
          <div className="space-y-1.5 flex flex-col">
            <Label htmlFor="projectId" className="mb-1">Project</Label>
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="projectId"
                  variant="outline"
                  role="combobox"
                  aria-expanded={projectOpen}
                  className="w-full justify-between px-3 font-normal"
                  disabled={!form.companyId || optionsLoading}
                >
                  <span className="truncate">
                    {(() => {
                      const selected = clientProjects.find((p) => p.id === form.projectId)
                      if (selected) return selected.title
                      if (optionsLoading) return "Loading..."
                      if (form.projectId) return task?.project || "Unknown project"
                      if (form.companyId) return "Select a project"
                      return "Pick a client first"
                    })()}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full min-w-[300px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search projects..." 
                    value={projectQuery} 
                    onValueChange={setProjectQuery} 
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="flex flex-col items-center gap-3 p-4 text-center text-sm">
                        <p className="text-muted-foreground">No project found.</p>
                        {projectQuery && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.preventDefault()
                              handleCreateProject()
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create "{projectQuery}"
                          </Button>
                        )}
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {[...clientProjects].sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" })).map((project) => (
                        <CommandItem
                          key={project.id}
                          value={project.title}
                          onSelect={(currentValue) => {
                            const p = clientProjects.find((x) => x.title.toLowerCase() === currentValue.toLowerCase())
                            if (p) set("projectId", p.id)
                            setProjectOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              form.projectId === project.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {project.title}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={form.status || undefined} onValueChange={(v) => set("status", v as TaskStatus)}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue>{taskStatusMeta[form.status]?.label ?? "Select status"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(taskStatusMeta) as TaskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {taskStatusMeta[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <Select value={form.priority || undefined} onValueChange={(v) => set("priority", v as TaskPriority)}>
              <SelectTrigger id="priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(taskPriorityMeta) as TaskPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {taskPriorityMeta[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Content</Label>
          <RichTextEditor
            value={taskContentHtml(form.content)}
            onChange={(content) => set("content", content)}
            placeholder="Notes, links, details of the work..."
            compact
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Task"}
        </Button>
      </div>
    </form>
  )
}
