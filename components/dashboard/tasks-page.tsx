"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Mail, Maximize2, Trash2, Loader2 } from "lucide-react"
import {
  duplicateTask,
  getTasks,
  deleteTask,
  taskStatusMeta,
  taskPriorityMeta,
  formatTimestamp,
  tsToMillis,
  type Task,
} from "@/lib/tasks"
import { CompactListRow, CompactListSkeleton } from "@/components/dashboard/compact-list-row"
import { useRecordTitle } from "@/components/dashboard/page-title-context"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { TaskForm } from "@/components/dashboard/task-form"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useTaskEmail } from "@/components/dashboard/use-task-email"

function searchTask(t: Task) {
  return [t.name, t.client, t.companyId, t.project, taskStatusMeta[t.status]?.label, taskPriorityMeta[t.priority]?.label]
}

const taskSorts: SortOption<Task>[] = [
  { value: "updatedAt", label: "Last modified", get: (task) => Math.max(tsToMillis(task.updatedAt), tsToMillis(task.createdAt)), ascLabel: "Oldest", descLabel: "Newest" },
  { value: "name", label: "Name", get: (task) => task.name, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "client", label: "Client", get: (task) => task.client || task.companyId, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "status", label: "Status", get: (task) => taskStatusMeta[task.status]?.label, ascLabel: "A–Z", descLabel: "Z–A" },
]

function TaskContentPane({
  selectedId,
  selectedTask,
  deleting,
  emailTask,
  emailingId,
  setDeleteId,
  handleSaved,
  setSelectedId,
}: {
  selectedId: string | "new" | null
  selectedTask: Task | null
  deleting: string | null
  emailTask: (task: Task) => void
  emailingId: string | null
  setDeleteId: (id: string) => void
  handleSaved: () => Promise<void>
  setSelectedId: (id: string | "new" | null) => void
}) {
  return (
    <aside className="sticky top-16 hidden h-[calc(100svh-5rem)] min-h-0 min-w-0 flex-col overflow-hidden lg:flex">
      <div className="flex h-16 items-center justify-between gap-3 border-b border-border py-0">
        <div className="min-w-0">
          {selectedId !== null && (
            <h2 className="sidebar-nav-label truncate font-medium text-sidebar-foreground/70">
              {selectedId === "new" ? "New task" : selectedTask?.name}
            </h2>
          )}
        </div>
        {selectedTask && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Email task"
              aria-label="Email task"
              onClick={() => emailTask(selectedTask)}
              disabled={emailingId !== null}
            >
              {emailingId === selectedTask.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Mail className="size-4" aria-hidden="true" />}
            </Button>
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Open full task page">
              <Link href={`/dashboard/tasks/${encodeURIComponent(selectedTask.id)}`} aria-label="Open full task page">
                <Maximize2 className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-5">
        {selectedId === null ? (
          <div className="min-h-[23rem]" aria-hidden="true" />
        ) : (
          <TaskForm
            key={selectedId}
            task={selectedId === "new" ? null : selectedTask}
            leadingAction={selectedTask ? (
              <Button
                type="button"
                variant="destructive"
                className="shrink-0"
                disabled={deleting === selectedTask.id}
                onClick={() => setDeleteId(selectedTask.id)}
                aria-label="Delete task"
              >
                {deleting === selectedTask.id ? <Loader2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            ) : undefined}
            onSaved={handleSaved}
            onCancel={() => setSelectedId(null)}
          />
        )}
      </div>
    </aside>
  )
}

export default function TasksAdminPage() {
  const { emailTask, emailDialog, emailingId } = useTaskEmail()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useUrlSelection("task")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  async function fetchData() {
    setError(null)
    try {
      const taskData = await getTasks()
      // Newest first, like Notion's default
      taskData.sort((a, b) => Math.max(tsToMillis(b.updatedAt), tsToMillis(b.createdAt)) - Math.max(tsToMillis(a.updatedAt), tsToMillis(a.createdAt)))
      setTasks(taskData)
    } catch (err) {
      console.error("Error fetching tasks:", err)
      setError(err instanceof Error ? err.message : "Failed to load tasks.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)")
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      if (selectedId === id) setSelectedId(null)
      if (deleteId === id) setDeleteId(null)
    } catch (err) {
      console.error("Error deleting task:", err)
    } finally {
      setDeleting(null)
    }
  }

  async function handleSaved() {
    await fetchData()
    setSelectedId(null)
  }

  async function handleDuplicate(task: Task) {
    if (duplicatingId) return
    setDuplicatingId(task.id)
    try {
      await duplicateTask(task)
      await fetchData()
      toast.success("Task duplicated")
    } catch {
      toast.error("Couldn’t duplicate the task. Try again.")
    } finally {
      setDuplicatingId(null)
    }
  }

  const { results: visibleTasks, bar } = useFilterBar({
    items: tasks,
    search: searchTask,
    sorts: taskSorts,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })

  const selectedTask =
    typeof selectedId === "string" && selectedId !== "new" ? tasks.find((t) => t.id === selectedId) ?? null : null
  useRecordTitle(selectedId === "new" ? "New task" : selectedTask?.name || null)

  const taskFilter = (
    <TableFilterBar
      {...bar}
      placeholder="Search tasks"
      createAction={{ label: "New task", onClick: () => setSelectedId("new") }}
    />
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      {loading ? (
        <div className="lg:grid lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)] lg:items-start lg:gap-6">
          <div className="min-w-0">{taskFilter}<CompactListSkeleton /></div>
          <div className="hidden min-h-[34rem] lg:block" aria-hidden="true" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <>
          <div className="lg:max-w-[30rem]">{taskFilter}</div>
          <FirstRunState
            label="Task"
            title="Let's add your first task"
            description="Tasks are the individual pieces of work inside a project. Assign one, give it a due date, and it shows up on the client's board too."
            action={<Button onClick={() => setSelectedId("new")}>New Task</Button>}
          />
        </>
      ) : (
        <>
          {visibleTasks.length === 0 ? (
            <>
              <div className="lg:max-w-[30rem]">{taskFilter}</div>
              <EmptySearchState label="No tasks match your search." />
            </>
          ) : (
            <>
              <div className="lg:grid lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)] lg:items-start lg:gap-6">
                <div className="min-w-0">
                  {taskFilter}
                  <ul>
                    {visibleTasks.map((t) => (
                      <li key={t.id}>
                        <CompactListRow
                          title={t.name || "Untitled task"}
                          subtitle={[t.reminder ? "Reminder" : null, t.project || t.client || t.companyId, taskStatusMeta[t.status]?.label, t.dueDate || formatTimestamp(t.updatedAt ?? t.createdAt)].filter(Boolean).join(" · ")}
                          mobileSubtitle={formatTimestamp(t.updatedAt ?? t.createdAt)}
                          onClick={() => setSelectedId(t.id)}
                          active={selectedId === t.id}
                          ariaLabel={`Open ${t.name || "task"}`}
                          menuLabel={`Options for ${t.name || "task"}`}
                          menu={
                            <>
                              <DropdownMenuItem onSelect={() => emailTask(t)}>Email task</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setSelectedId(t.id)}>Edit task</DropdownMenuItem>
                              <DropdownMenuItem disabled={duplicatingId !== null} onSelect={() => void handleDuplicate(t)}>Duplicate task</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setDeleteId(t.id)}>Delete task</DropdownMenuItem>
                            </>
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
                <TaskContentPane
                  selectedId={selectedId}
                  selectedTask={selectedTask}
                  deleting={deleting}
                  emailTask={emailTask}
                  emailingId={emailingId}
                  setDeleteId={(id) => setDeleteId(id)}
                  handleSaved={handleSaved}
                  setSelectedId={setSelectedId}
                />
              </div>
            </>
          )}
        </>
      )}

      {emailDialog}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes &quot;{tasks.find((task) => task.id === deleteId)?.name || "this task"}&quot;. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && void handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteId && deleting === deleteId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={selectedId !== null && (!isDesktop || tasks.length === 0 || visibleTasks.length === 0)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="inset-y-2 right-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-lg border sm:max-w-lg">
          <SheetHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle>{selectedId === "new" ? "New task" : "Edit task"}</SheetTitle>
                {selectedId === "new" && <SheetDescription>Create a task for any client.</SheetDescription>}
              </div>
              {selectedTask && (
                <Button variant="ghost" size="icon" className="absolute top-2 right-16 z-10" title="Email task" aria-label="Email task" onClick={() => emailTask(selectedTask)} disabled={emailingId !== null}>
                  {emailingId === selectedTask.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Mail className="size-4" aria-hidden="true" />}
                </Button>
              )}
              {selectedTask && (
                <Button variant="ghost" size="icon" asChild className="absolute top-2 right-8 z-10" title="Open full task page">
                  <Link href={`/dashboard/tasks/${encodeURIComponent(selectedTask.id)}`} aria-label="Open full task page">
                    <Maximize2 className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="p-4">
            {selectedId !== null && (
              <TaskForm
                key={selectedId}
                task={selectedId === "new" ? null : selectedTask}
                leadingAction={selectedTask ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="shrink-0"
                    disabled={deleting === selectedTask.id}
                    onClick={() => setDeleteId(selectedTask.id)}
                    aria-label="Delete task"
                  >
                    {deleting === selectedTask.id ? <Loader2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                ) : undefined}
                onSaved={handleSaved}
                onCancel={() => setSelectedId(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}
