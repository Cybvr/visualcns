"use client"

import Link from "next/link"
import { Maximize2 } from "lucide-react"

import { TaskForm } from "@/components/dashboard/task-form"
import { TaskComments } from "@/components/dashboard/task-comments"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Task, TaskStatus } from "@/lib/tasks"

export function TaskEditorSheet({
  open,
  task,
  companyId,
  clientName,
  defaults,
  onClose,
  onSaved,
}: {
  open: boolean
  task?: Task | null
  companyId: string
  clientName: string
  defaults?: { status?: TaskStatus }
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        className="inset-y-2 right-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-lg border sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle>{task ? "Edit task" : "New task"}</SheetTitle>
              <SheetDescription>
                {task
                  ? "Update the details of this task."
                  : "Add a task to your board. It will show up under the chosen status."}
              </SheetDescription>
            </div>
            {task && (
              <Button variant="ghost" size="icon" asChild className="mr-8 shrink-0" title="Open full task page">
                <Link href={`/dashboard/tasks/${encodeURIComponent(task.id)}`} aria-label="Open full task page">
                  <Maximize2 className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="p-4">
          {open && (
            <TaskForm
              key={task?.id ?? `new-${defaults?.status ?? "todo"}`}
              task={task}
              fixedClient={{ companyId, clientName }}
              defaults={defaults}
              onSaved={() => {
                onClose()
                onSaved()
              }}
              onCancel={onClose}
            />
          )}

          {/* Only an existing task has an id to hang a thread off. */}
          {open && task && <TaskComments taskId={task.id} companyId={task.companyId || companyId} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
