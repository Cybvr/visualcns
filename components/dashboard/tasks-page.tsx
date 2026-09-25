"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ListTodo, Maximize2, Pencil, Plus, Trash2, Loader2 } from "lucide-react"
import {
  getTasks,
  deleteTask,
  taskStatusMeta,
  taskPriorityMeta,
  tsToMillis,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/tasks"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { Badge } from "@/components/inline-table-cells"
import { EmptySearchState, FirstRunState } from "@/components/dashboard/empty-state"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { Checkbox } from "@/components/ui/checkbox"
import { useRowSelection } from "@/hooks/use-row-selection"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

// The form (and its rich text editor) only shows inside a sheet, so load it on demand.
const TaskForm = dynamic(() => import("@/components/dashboard/task-form").then((m) => m.TaskForm))

const STATUS_RANK: Record<TaskStatus, number> = { todo: 0, "in-progress": 1, review: 2, done: 3 }
const PRIORITY_RANK: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 }

const TASK_SORTS: SortOption<Task>[] = [
  {
    value: "createdAt",
    label: "Date created",
    get: (t) => tsToMillis(t.createdAt),
    ascLabel: "Oldest",
    descLabel: "Newest",
  },
  { value: "name", label: "Task", get: (t) => t.name, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "client", label: "Client", get: (t) => t.client || t.companyId, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "project", label: "Project", get: (t) => t.project, ascLabel: "A–Z", descLabel: "Z–A" },
  { value: "status", label: "Status", get: (t) => STATUS_RANK[t.status] ?? 0, ascLabel: "To do first", descLabel: "Done first" },
  {
    value: "priority",
    label: "Priority",
    get: (t) => PRIORITY_RANK[t.priority] ?? 0,
    ascLabel: "Lowest",
    descLabel: "Highest",
  },
  { value: "dueDate", label: "Due date", get: (t) => t.dueDate, ascLabel: "Soonest", descLabel: "Latest" },
]

function searchTask(t: Task) {
  return [t.name, t.client, t.companyId, t.project, taskStatusMeta[t.status]?.label, taskPriorityMeta[t.priority]?.label]
}

export default function TasksAdminPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function fetchData() {
    setError(null)
    try {
      const taskData = await getTasks()
      // Newest first, like Notion's default
      taskData.sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt))
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

  const { results: visibleTasks, bar } = useFilterBar({
    items: tasks,
    search: searchTask,
    sorts: TASK_SORTS,
    defaultSort: "createdAt",
    defaultDirection: "desc",
  })

  const selection = useRowSelection(visibleTasks, (t) => t.id)

  async function handleBulkDelete() {
    const ids = selection.selectedIds
    if (ids.length === 0 || bulkDeleting) return
    setBulkDeleting(true)
    try {
      await Promise.all(ids.map((id) => deleteTask(id)))
      const removed = new Set(ids)
      setTasks((prev) => prev.filter((t) => !removed.has(t.id)))
      if (selectedId && removed.has(selectedId)) setSelectedId(null)
      selection.clear()
    } catch (err) {
      console.error("Error deleting tasks:", err)
    } finally {
      setBulkDeleting(false)
    }
  }

  const selectedTask =
    typeof selectedId === "string" && selectedId !== "new" ? tasks.find((t) => t.id === selectedId) ?? null : null

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <FilterBar
        {...bar}
        placeholder="Search tasks"
        actions={
          <Button variant="ghost" className="bg-transparent text-foreground hover:bg-transparent" onClick={() => setSelectedId("new")}><Plus className="h-4 w-4" />Add Task</Button>
        }
      />

      {loading ? (
        <DashboardPageSkeleton rows={6} />
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <FirstRunState
          label="Task"
          title="Let's add your first task"
          description="Tasks are the individual pieces of work inside a project. Assign one, give it a due date, and it shows up on the client's board too."
          action={<Button onClick={() => setSelectedId("new")}>New Task</Button>}
        />
      ) : (
        <>
          {visibleTasks.length === 0 ? (
            <EmptySearchState label="No tasks match your search." />
          ) : (
            <>
              <ul className="space-y-2 sm:hidden">
                {visibleTasks.map((t) => (
                  <li key={t.id}>
                    <MobileDataCard
                      title={t.name || "Untitled task"}
                      subtitle={[t.client || t.companyId, t.project, taskStatusMeta[t.status]?.label].filter(Boolean).join(" · ") || undefined}
                      icon={<ListTodo className="size-5 text-muted-foreground" aria-hidden="true" />}
                      onClick={() => setSelectedId(t.id)}
                      ariaLabel={`Open ${t.name || "task"}`}
                      menuLabel={`Options for ${t.name || "task"}`}
                      menu={
                        <>
                          <DropdownMenuItem onSelect={() => setSelectedId(t.id)}>Edit task</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDeleteId(t.id)}>Delete task</DropdownMenuItem>
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>

              <div className="hidden rounded-lg border border-border sm:block">
              <TableBulkBar
                count={selection.selectedCount}
                noun="task"
                deleting={bulkDeleting}
                onClear={selection.clear}
                onDelete={handleBulkDelete}
              />
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Select all tasks"
                        checked={selection.allSelected}
                        indeterminate={selection.someSelected}
                        onChange={selection.toggleAll}
                      />
                    </TableHead>
                    <TableHead className="w-[40%]">Task</TableHead>
                    <TableHead className="w-[18%]">Client</TableHead>
                    <TableHead className="w-[24%]">Project</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTasks.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(t.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${t.name || "task"}`}
                          checked={selection.isSelected(t.id)}
                          onChange={(event) => selection.toggle(t.id, (event.nativeEvent as MouseEvent).shiftKey)}
                        />
                      </TableCell>
                      <TableCell className="max-w-0 font-medium">
                        <button
                          type="button"
                          className="w-full truncate rounded px-1 py-0.5 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedId(t.id)}
                        >
                          {t.name || "Untitled task"}
                        </button>
                      </TableCell>
                      <TableCell className="max-w-0 truncate text-muted-foreground">{t.client || t.companyId || "—"}</TableCell>
                      <TableCell className="max-w-0 truncate text-muted-foreground">{t.project || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge className={(taskStatusMeta[t.status] ?? taskStatusMeta.todo).className}>
                          {(taskStatusMeta[t.status] ?? taskStatusMeta.todo).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedId(t.id)}
                            aria-label="Edit task"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                aria-label="Delete task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete task?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently deletes &quot;{t.name || "this task"}&quot;. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(t.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleting === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes &quot;{visibleTasks.find((task) => task.id === deleteId)?.name || "this task"}&quot;. This cannot be undone.
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

      <Sheet open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="inset-y-2 right-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-lg border sm:max-w-lg">
          <SheetHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle>{selectedId === "new" ? "New task" : "Edit task"}</SheetTitle>
                <SheetDescription>
                  {selectedId === "new" ? "Create a task for any client." : selectedTask?.name ?? ""}
                </SheetDescription>
              </div>
              {selectedTask && (
                <Button variant="ghost" size="icon" asChild className="shrink-0" title="Open full task page">
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
