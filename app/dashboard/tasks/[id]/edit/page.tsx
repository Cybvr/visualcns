"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TaskForm } from "@/components/dashboard/task-form"
import { getTask, type Task } from "@/lib/tasks"

export default function TaskEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getTask(id)
      .then((found) => {
        setTask(found)
        if (!found) setError("This task could not be found.")
      })
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : "This task could not be loaded."))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" /></div>
  }

  if (!task) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Button variant="ghost" onClick={() => router.push("/dashboard/tasks")}><ArrowLeft className="mr-2 size-4" />Back to tasks</Button>
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">{error || "This task could not be found."}</CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4 sm:px-6">
      <Button variant="ghost" onClick={() => router.push(`/dashboard/tasks/${encodeURIComponent(task.id)}`)}>
        <ArrowLeft className="mr-2 size-4" />Back to task
      </Button>
      <Card className="mt-4">
        <CardHeader className="border-b border-border">
          <CardTitle>Edit task</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <TaskForm
            task={task}
            onSaved={(savedId) => router.replace(`/dashboard/tasks/${encodeURIComponent(savedId)}`)}
            onCancel={() => router.push(`/dashboard/tasks/${encodeURIComponent(task.id)}`)}
          />
        </CardContent>
      </Card>
    </main>
  )
}
