import { useState } from "react"
import { ListTodo } from "lucide-react"
import { toast } from "sonner"

import { SectionAddButton } from "@/components/company/section-add-button"
import { CollectionView } from "@/components/dashboard/collection-view"
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
    <div id="tasks" className="scroll-mt-20">
      <CollectionView
        className=""
        items={tasks}
        loading={loading}
        getKey={(task) => task.id}
        searchFields={(task) => [task.name, task.project, (taskStatusMeta[task.status] ?? taskStatusMeta.todo).label, task.dueDate]}
        searchPlaceholder="Search tasks"
        viewKey="tasks"
        actions={<SectionAddButton label="New task" onClick={openAdd} />}
        empty={{
          icon: ListTodo,
          title: "No tasks yet",
          description: "Add a task to start tracking work.",
          action: <SectionAddButton label="New task" onClick={openAdd} />,
        }}
        card={(task) => {
          const status = (taskStatusMeta[task.status] ?? taskStatusMeta.todo).label
          const priority = (taskPriorityMeta[task.priority] ?? taskPriorityMeta.medium).label
          return {
            icon: <ListTodo className="size-4 text-muted-foreground" aria-hidden="true" />,
            title: task.name || "Untitled task",
            subtitle: task.dueDate ? `Due ${task.dueDate}` : formatTimestamp(task.updatedAt ?? task.createdAt),
            preview: (
              <div className="flex size-full flex-col items-center justify-center gap-1 p-4 text-center">
                <span className="text-lg font-semibold tracking-[-0.02em] text-foreground">{status}</span>
                <span className="text-xs text-muted-foreground">{priority} priority</span>
              </div>
            ),
            onClick: () => openEdit(task.id),
            ariaLabel: `Open ${task.name || "task"}`,
            menuLabel: `Options for ${task.name || "task"}`,
            menu: (
              <>
                <DropdownMenuItem disabled={emailingId !== null} onSelect={() => emailCompanyTask(task)}>Email task</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openEdit(task.id)}>Edit task</DropdownMenuItem>
                {canDuplicate && <DropdownMenuItem disabled={duplicatingId !== null} onSelect={() => void handleDuplicate(task)}>Duplicate task</DropdownMenuItem>}
                <DropdownMenuItem variant="destructive" disabled={deleting === task.id} onSelect={() => setMobileDeleteTarget(task)}>Delete task</DropdownMenuItem>
              </>
            ),
          }
        }}
        row={(task) => ({
          subtitle: [(taskStatusMeta[task.status] ?? taskStatusMeta.todo).label, task.project].filter(Boolean).join(" · "),
          trailing: task.dueDate ? `Due ${task.dueDate}` : undefined,
        })}
      />

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
    </div>
  )
}
