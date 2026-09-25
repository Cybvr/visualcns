import { useState } from "react"
import { ListTodo, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

import { ContextualEmailButton } from "@/components/dashboard/contextual-email-button"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { TaskEditorSheet } from "@/components/dashboard/task-editor-sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge, InlineDate, InlineProject, InlineSelect, InlineText } from "@/components/inline-table-cells"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { taskPriorityMeta, taskStatusMeta, type Task, type TaskPriority, type TaskStatus } from "@/lib/tasks"
import { type Project } from "@/lib/projects"
import { portalPath } from "@/lib/portal-model"

const STATUS_OPTIONS: TaskStatus[] = ["todo", "in-progress", "review", "done"]
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high"]

function RowActions({ task, onEdit, onDelete, deleting, companyId, clientName }: { task: Task; onEdit: () => void; onDelete: () => void; deleting: boolean; companyId: string; clientName: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <ContextualEmailButton
        label="Notify client"
        icon={false}
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        context={{ companyId, companyName: clientName, projectId: task.projectId, projectName: task.project, documentType: "task", documentId: task.id, documentTitle: task.name, subject: `Task update: ${task.name}`, ctaText: "View tasks", ctaUrl: `${portalPath(companyId)}/tasks` }}
      />
      <button type="button" onClick={onEdit} aria-label="Edit task" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground">
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
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
  deleting: string | null
  onDelete: (id: string) => void
  onPatch: (id: string, patch: Partial<Task>) => void
  onSaved: () => void
}

export function TasksView({ tasks, projects, companyId, clientName, deleting, onDelete, onPatch, onSaved }: TasksViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState<{ status?: TaskStatus } | null>(null)
  const [mobileDeleteTarget, setMobileDeleteTarget] = useState<Task | null>(null)
  const editingTask = editingId ? tasks.find((task) => task.id === editingId) ?? null : null

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
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <ListTodo className="mx-auto mb-2 size-6 text-muted-foreground/60" aria-hidden="true" />
            <p className="font-bold">No tasks yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add a task to start tracking work.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const status = taskStatusMeta[task.status] ?? taskStatusMeta.todo
              const priority = taskPriorityMeta[task.priority] ?? taskPriorityMeta.medium
              return (
                <MobileDataCard
                  key={task.id}
                  variant="task"
                  icon={<ListTodo className="size-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />}
                  title={task.name}
                  subtitle={<span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span>{task.project || "No project"}</span><span>·</span><span>{status.label}</span><span>·</span><span>{priority.label}</span>{task.dueDate && <><span>·</span><span>Due {task.dueDate}</span></>}</span>}
                  menuLabel={`Options for ${task.name}`}
                  menu={<><DropdownMenuItem onSelect={() => openEdit(task.id)}>Edit task</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setMobileDeleteTarget(task)}>Delete task</DropdownMenuItem></>}
                />
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-3 hidden overflow-x-auto rounded-lg border border-border sm:block">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32%]">Task</TableHead>
              <TableHead className="w-[24%]">Project</TableHead>
              <TableHead className="w-[14%]">Priority</TableHead>
              <TableHead className="w-[14%]">Status</TableHead>
              <TableHead className="w-[10%]">Due</TableHead>
              <TableHead className="w-24 text-right"><span className="sr-only">Actions</span></TableHead>
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
                  <TableCell><div className="flex justify-end"><RowActions task={task} onEdit={() => openEdit(task.id)} onDelete={() => onDelete(task.id)} deleting={deleting === task.id} companyId={companyId} clientName={clientName} /></div></TableCell>
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
