import { useState } from "react"
import { ListTodo, Plus } from "lucide-react"
import { toast } from "sonner"

import { CompactListRow, CompactListSkeleton, MOBILE_LIST_CARD } from "@/components/dashboard/compact-list-row"
import { MobileCardsSkeleton } from "@/components/dashboard/collection-skeletons"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { TaskEditorSheet } from "@/components/dashboard/task-editor-sheet"
import { useTaskEmail } from "@/components/dashboard/use-task-email"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { duplicateTask, formatTimestamp, taskPriorityMeta, taskStatusMeta, type Task, type TaskStatus } from "@/lib/tasks"
import { type Project } from "@/lib/projects"

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

export function TasksView({ tasks, companyId, clientName, canDuplicate = true, loading = false, deleting, onDelete, onSaved }: TasksViewProps) {
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

      <div className="mt-3 hidden sm:block">
        {loading ? <MobileCardsSkeleton /> : tasks.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <ListTodo className="mx-auto mb-2 size-6 text-muted-foreground/60" aria-hidden="true" />
            <p className="font-bold">No tasks yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add a task to start tracking work.</p>
          </div>
        ) : <div className="space-y-2">
          {tasks.map((task) => (
            <MobileDataCard
              key={task.id}
              surface="muted"
              icon={<ListTodo className="size-5 text-muted-foreground" aria-hidden="true" />}
              title={task.name || "Untitled task"}
              subtitle={task.project || "No project"}
              description={[(taskStatusMeta[task.status] ?? taskStatusMeta.todo).label, (taskPriorityMeta[task.priority] ?? taskPriorityMeta.medium).label, task.dueDate && `Due ${task.dueDate}`].filter(Boolean).join(" · ")}
              onClick={() => openEdit(task.id)}
              ariaLabel={`Open ${task.name || "task"}`}
              menuLabel={`Options for ${task.name || "task"}`}
              menu={<>
                <DropdownMenuItem disabled={emailingId !== null} onSelect={() => emailCompanyTask(task)}>Email task</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openEdit(task.id)}>Edit task</DropdownMenuItem>
                {canDuplicate && <DropdownMenuItem disabled={duplicatingId !== null} onSelect={() => void handleDuplicate(task)}>Duplicate task</DropdownMenuItem>}
                <DropdownMenuItem variant="destructive" disabled={deleting === task.id} onSelect={() => setMobileDeleteTarget(task)}>Delete task</DropdownMenuItem>
              </>}
            />
          ))}
        </div>}
      </div>

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
