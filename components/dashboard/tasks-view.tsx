import { useState } from "react"
import { Copy, ListTodo, Loader2, Mail, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { CompactListRow, CompactListSkeleton, MOBILE_LIST_CARD } from "@/components/dashboard/compact-list-row"
import { TableRowsSkeleton } from "@/components/dashboard/collection-skeletons"
import { TaskEditorSheet } from "@/components/dashboard/task-editor-sheet"
import { useTaskEmail } from "@/components/dashboard/use-task-email"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge, InlineDate, InlineProject, InlineSelect, InlineText } from "@/components/inline-table-cells"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { duplicateTask, formatTimestamp, taskPriorityMeta, taskStatusMeta, type Task, type TaskPriority, type TaskStatus } from "@/lib/tasks"
import { type Project } from "@/lib/projects"

const STATUS_OPTIONS: TaskStatus[] = ["todo", "in-progress", "review", "done"]
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high"]

function RowActions({ task, onEmail, onEdit, onDuplicate, onDelete, canDuplicate, emailing, duplicating, deleting }: { task: Task; onEmail: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; canDuplicate: boolean; emailing: boolean; duplicating: boolean; deleting: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button type="button" onClick={onEmail} disabled={emailing} aria-label={`Email ${task.name}`} title="Email task" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        {emailing ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Mail className="size-3.5" aria-hidden="true" />}
      </button>
      <button type="button" onClick={onEdit} aria-label="Edit task" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground">
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
      {canDuplicate && (
        <button type="button" onClick={onDuplicate} disabled={duplicating} aria-label={`Duplicate ${task.name}`} title="Duplicate task" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {duplicating ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        </button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button type="button" disabled={deleting} aria-label="Delete task" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50">
            {deleting ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes &quot;{task.name}&quot;. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface TasksViewProps {
  tasks: Task[]
  projects: Project[]
  companyId: string
  clientName: string
  canDuplicate?: boolean
  loading?: boolean
  deleting: string | null
  onDelete: (id: string) => void
  onPatch: (id: string, patch: Partial<Task>) => void
  onSaved: () => void | Promise<void>
}

export function TasksView({ tasks, projects, companyId, clientName, canDuplicate = true, loading = false, deleting, onDelete, onPatch, onSaved }: TasksViewProps) {
  const { emailTask, emailDialog, emailingId } = useTaskEmail()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState<{ status?: TaskStatus } | null>(null)
  const [mobileDeleteTarget, setMobileDeleteTarget] = useState<Task | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const editingTask = editingId ? tasks.find((task) => task.id === editingId) ?? null : null

  async function handleDuplicate(task: Task) {
    if (duplicatingId) return
    setDuplicatingId(task.id)
    try {
      await duplicateTask(task, companyId, clientName)
      await onSaved()
      toast.success("Task duplicated")
    } catch {
      toast.error("Couldn’t duplicate the task. Try again.")
    } finally {
      setDuplicatingId(null)
    }
  }

  function openAdd() {
    setEditingId(null)
    setAdding({})
  }

  function openEdit(id: string) {
    setAdding(null)
    setEditingId(id)
  }

  function closeForm() {
    setEditingId(null)
    setAdding(null)
  }

  function emailCompanyTask(task: Task) {
    emailTask({ ...task, companyId, client: clientName })
  }

  return (
    <section id="tasks" className="mt-4 scroll-mt-20">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Tasks</h2>
        <button type="button" onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <Plus className="size-4" aria-hidden="true" />
          New task
        </button>
      </div>

      <div className="mt-3 sm:hidden">
        {loading ? <CompactListSkeleton /> : tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <ListTodo className="mx-auto mb-2 size-6 text-muted-foreground/60" aria-hidden="true" />
            <p className="font-bold">No tasks yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add a task to start tracking work.</p>
          </div>
        ) : (
          <ul className={MOBILE_LIST_CARD}>
            {tasks.map((task) => {
              return (
                <li key={task.id}>
                  <CompactListRow
                    title={task.name || "Untitled task"}
                    meta={(taskStatusMeta[task.status] ?? taskStatusMeta.todo).label}
                    subtitle={[task.project, task.dueDate ? `Due ${task.dueDate}` : formatTimestamp(task.updatedAt ?? task.createdAt)].filter(Boolean).join(" · ")}
                    onClick={() => openEdit(task.id)}
                    ariaLabel={`Open ${task.name || "task"}`}
                    menuLabel={`Options for ${task.name}`}
                    menu={<><DropdownMenuItem disabled={emailingId !== null} onSelect={() => emailCompanyTask(task)}>Email task</DropdownMenuItem><DropdownMenuItem onSelect={() => openEdit(task.id)}>Edit task</DropdownMenuItem>{canDuplicate && <DropdownMenuItem disabled={duplicatingId !== null} onSelect={() => void handleDuplicate(task)}>Duplicate task</DropdownMenuItem>}<DropdownMenuItem variant="destructive" onSelect={() => setMobileDeleteTarget(task)}>Delete task</DropdownMenuItem></>}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {loading ? <div className="mt-3 hidden sm:block"><TableRowsSkeleton headers={["Task", "Project", "Priority", "Status", "Due", ""]} /></div> : <div className="mt-3 hidden overflow-x-auto rounded-lg border border-border sm:block">
        <Table className="w-full min-w-[960px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className={canDuplicate ? "w-[25%]" : "w-[28%]"}>Task</TableHead>
              <TableHead className="w-[20%]">Project</TableHead>
              <TableHead className="w-[12%]">Priority</TableHead>
              <TableHead className="w-[12%]">Status</TableHead>
              <TableHead className="w-[16%]">Due</TableHead>
              <TableHead className={canDuplicate ? "w-[15%] text-right" : "w-[12%] text-right"}><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <ListTodo className="mx-auto mb-2 size-6 text-muted-foreground/60" aria-hidden="true" />
                  <p className="font-bold">No tasks yet</p>
                  <p className="mt-1 text-xs font-normal text-muted-foreground">Add a task to start tracking work.</p>
                </TableCell>
              </TableRow>
            ) : tasks.map((task) => {
              const status = taskStatusMeta[task.status] ?? taskStatusMeta.todo
              const priority = taskPriorityMeta[task.priority] ?? taskPriorityMeta.medium
              return (
                <TableRow key={task.id}>
                  <TableCell className="max-w-0 font-medium"><InlineText value={task.name} onCommit={(name) => onPatch(task.id, { name })} /></TableCell>
                  <TableCell className="max-w-0"><InlineProject projectId={task.projectId} projects={projects} onChange={(project) => onPatch(task.id, { projectId: project.id, project: project.title })} /></TableCell>
                  <TableCell><InlineSelect value={task.priority} options={PRIORITY_OPTIONS} onChange={(value) => onPatch(task.id, { priority: value })} renderOption={(value) => taskPriorityMeta[value].label} trigger={<Badge className={priority.className}>{priority.label}</Badge>} /></TableCell>
                  <TableCell><InlineSelect value={task.status} options={STATUS_OPTIONS} onChange={(value) => onPatch(task.id, { status: value })} renderOption={(value) => taskStatusMeta[value].label} trigger={<Badge className={status.className}>{status.label}</Badge>} /></TableCell>
                  <TableCell><InlineDate value={task.dueDate} onCommit={(dueDate) => onPatch(task.id, { dueDate })} /></TableCell>
                  <TableCell><div className="flex justify-end"><RowActions task={task} onEmail={() => emailCompanyTask(task)} onEdit={() => openEdit(task.id)} onDuplicate={() => void handleDuplicate(task)} onDelete={() => onDelete(task.id)} canDuplicate={canDuplicate} emailing={emailingId === task.id} duplicating={duplicatingId === task.id} deleting={deleting === task.id} /></div></TableCell>
                </TableRow>
              )
            })}
            <TableRow>
              <TableCell colSpan={6} className="p-0">
                <button type="button" onClick={openAdd} className="flex w-full items-center gap-1.5 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"><Plus className="size-3.5" aria-hidden="true" />New task</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      }

      {emailDialog}

      <AlertDialog open={mobileDeleteTarget !== null} onOpenChange={(open) => !open && setMobileDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes &quot;{mobileDeleteTarget?.name}&quot;. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (mobileDeleteTarget) onDelete(mobileDeleteTarget.id); setMobileDeleteTarget(null) }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskEditorSheet open={editingId !== null || adding !== null} task={editingTask} companyId={companyId} clientName={clientName} defaults={adding ?? undefined} onClose={closeForm} onSaved={onSaved} />
    </section>
  )
}
