import { useState, useEffect } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { CheckCircle2, Columns3, List, ListTodo, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

// ... keep existing imports ...
import { Button } from "@/components/ui/button"
import { ContextualEmailButton } from "@/components/dashboard/contextual-email-button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { TaskEditorSheet } from "@/components/dashboard/task-editor-sheet"
import { Badge, InlineDate, InlineProject, InlineSelect, InlineText } from "@/components/inline-table-cells"
import { taskPriorityMeta, taskStatusMeta, type Task, type TaskPriority, type TaskStatus } from "@/lib/tasks"
import { type Project } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { portalPath } from "@/lib/portal-model"

const STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "review", "done"]
const STATUS_OPTIONS = STATUS_ORDER
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high"]

function RowActions({
  task,
  onEdit,
  onDelete,
  deleting,
  companyId,
  clientName,
}: {
  task: Task
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
  companyId: string
  clientName: string
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <ContextualEmailButton
        label="Notify client"
        icon={false}
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        context={{
          companyId,
          companyName: clientName,
          projectId: task.projectId,
          projectName: task.project,
          documentType: "task",
          documentId: task.id,
          documentTitle: task.name,
          subject: `Task update: ${task.name}`,
          ctaText: "View tasks",
          ctaUrl: `${portalPath(companyId)}/tasks`,
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        onClick={onEdit}
        aria-label="Edit task"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes &quot;{task.name}&quot;. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  )
}

function BoardCard({
  task,
  onEdit,
  isOverlay = false,
}: {
  task: Task
  onEdit: () => void
  isOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging && !isOverlay) onEdit() }}
      className={cn(
        "relative flex cursor-grab items-start gap-2 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing touch-none",
        isDragging && !isOverlay ? "opacity-30 border-dashed" : "border-border/60",
        isOverlay && "cursor-grabbing rotate-2 scale-105 shadow-lg border-border"
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#c25171] text-white">
          <CheckCircle2 className="h-3 w-3" strokeWidth={3} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium leading-tight text-foreground">{task.name}</div>
          {task.project && <div className="mt-1 truncate text-xs text-muted-foreground">{task.project}</div>}
        </div>
      </div>
    </div>
  )
}

function DroppableColumn({
  status,
  label,
  count,
  className,
  children,
  onAdd,
}: {
  status: string
  label: string
  count: number
  className: string
  children: React.ReactNode
  onAdd: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-3 rounded-xl p-2 transition-colors min-w-[280px]",
        isOver ? "bg-muted/40" : "bg-transparent",
        status === "todo" && "bg-[#faf9f8]",
        status === "in-progress" && "bg-[#f4f7f9]",
        status === "review" && "bg-[#fdfcf6]"
      )}
    >
      <div className="flex items-center gap-2 px-2 pt-1 pb-2">
        <Badge className={cn("text-[13px]", className)}>{label}</Badge>
        <span className="text-[13px] font-medium text-muted-foreground">{count}</span>
      </div>
      <div className="flex min-h-[150px] flex-col gap-2">
        {children}
        <AddRow label="New page" onClick={onAdd} />
      </div>
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

export function TasksView({
  tasks,
  projects,
  companyId,
  clientName,
  deleting,
  onDelete,
  onPatch,
  onSaved,
}: TasksViewProps) {
  const [view, setView] = useState<"board" | "table">("board")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState<{ status?: TaskStatus } | null>(null)
  
  // Local state for optimistic updates during drag
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // Sync prop changes (e.g. from server) to local state, but don't overwrite if dragging
  useEffect(() => {
    if (!activeTask) {
      setOptimisticTasks(tasks)
    }
  }, [tasks, activeTask])

  const formOpen = editingId !== null || adding !== null
  const editingTask = editingId ? tasks.find((t) => t.id === editingId) ?? null : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    setActiveTask(active.data.current?.task as Task)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus

    const task = optimisticTasks.find((t: Task) => t.id === taskId)
    if (task && task.status !== newStatus) {
      // Optimistic local update
      setOptimisticTasks((prev: Task[]) => prev.map((t: Task) => (t.id === taskId ? { ...t, status: newStatus } : t)))
      // Trigger API
      onPatch(taskId, { status: newStatus })
    }
  }

  function openAdd(status?: TaskStatus) {
    setEditingId(null)
    setAdding({ status })
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
      <div className="flex items-center justify-start">
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setView("board")}
            aria-pressed={view === "board"}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              view === "board" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Board
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              view === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      <div className="mt-3">
        {view === "board" ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="scrollbar-none flex gap-4 overflow-x-auto pb-4">
              {STATUS_ORDER.map((status) => {
                const meta = taskStatusMeta[status]
                const items = optimisticTasks.filter((t: Task) => t.status === status)
                return (
                  <DroppableColumn
                    key={status}
                    status={status}
                    label={meta.label}
                    className={meta.className}
                    count={items.length}
                    onAdd={() => openAdd(status)}
                  >
                    {items.map((t) => (
                      <BoardCard
                        key={t.id}
                        task={t}
                        onEdit={() => openEdit(t.id)}
                      />
                    ))}
                  </DroppableColumn>
                )
              })}
            </div>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeTask ? (
                <BoardCard
                  task={activeTask}
                  onEdit={() => openEdit(activeTask.id)}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>

        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-[88px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <ListTodo className="mx-auto mb-2 size-6 text-muted-foreground/60" aria-hidden="true" />
                      <p className="font-bold">No tasks yet</p>
                      <p className="mt-1 text-xs font-normal text-muted-foreground">
                        Add a task to start tracking work.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        <InlineText value={t.name} onCommit={(name) => onPatch(t.id, { name })} />
                      </TableCell>
                      <TableCell>
                        <InlineProject
                          projectId={t.projectId}
                          projects={projects}
                          onChange={(p) => onPatch(t.id, { projectId: p.id, project: p.title })}
                        />
                      </TableCell>
                      <TableCell>
                        <InlineSelect
                          value={t.priority}
                          options={PRIORITY_OPTIONS}
                          onChange={(priority) => onPatch(t.id, { priority })}
                          renderOption={(p) => taskPriorityMeta[p].label}
                          trigger={
                            <Badge className={(taskPriorityMeta[t.priority] ?? taskPriorityMeta.medium).className}>
                              {(taskPriorityMeta[t.priority] ?? taskPriorityMeta.medium).label}
                            </Badge>
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <InlineSelect
                          value={t.status}
                          options={STATUS_OPTIONS}
                          onChange={(status) => onPatch(t.id, { status })}
                          renderOption={(s) => taskStatusMeta[s].label}
                          trigger={
                            <Badge className={(taskStatusMeta[t.status] ?? taskStatusMeta.todo).className}>
                              {(taskStatusMeta[t.status] ?? taskStatusMeta.todo).label}
                            </Badge>
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <InlineDate value={t.dueDate} onCommit={(dueDate) => onPatch(t.id, { dueDate })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <RowActions
                            task={t}
                            onEdit={() => openEdit(t.id)}
                            onDelete={() => onDelete(t.id)}
                            deleting={deleting === t.id}
                            companyId={companyId}
                            clientName={clientName}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <button
                      type="button"
                      onClick={() => openAdd()}
                      className="flex w-full items-center gap-1.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New task
                    </button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <TaskEditorSheet
        open={formOpen}
        task={editingTask}
        companyId={companyId}
        clientName={clientName}
        defaults={adding ?? undefined}
        onClose={closeForm}
        onSaved={onSaved}
      />
    </section>
  )
}
