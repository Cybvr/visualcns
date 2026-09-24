"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShareLinkField } from "@/components/dashboard/share-link-field"
import { TaskForm } from "@/components/dashboard/task-form"
import { getTask, updateTask, type Task } from "@/lib/tasks"

export default function TaskEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
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

  async function setPublic(value: boolean) {
    if (!task) return
    setSharing(true)
    setError(null)
    try {
      await updateTask(task.id, { shareEnabled: value })
      setTask((current) => current ? { ...current, shareEnabled: value } : current)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The public link could not be updated.")
    } finally {
      setSharing(false)
    }
  }

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

  const publicPath = `/share/tasks/${encodeURIComponent(task.id)}`

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push("/dashboard/tasks")}><ArrowLeft className="mr-2 size-4" />Back to tasks</Button>
        {task.shareEnabled && (
          <Button variant="outline" size="sm" asChild>
            <a href={publicPath} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 size-4" />Open public link</a>
          </Button>
        )}
      </div>

      <section className="mt-6">
        <h1 className="text-xl font-semibold">Edit task</h1>
        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
        <div className="mt-6">
          <TaskForm
            task={task}
            onSaved={(savedId) => router.replace(`/dashboard/tasks/${encodeURIComponent(savedId)}`)}
            onCancel={() => router.push("/dashboard/tasks")}
          />
        </div>
      </section>

      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-base font-semibold">Public sharing</h2>
        <p className="mt-1 text-sm text-muted-foreground">Anyone with the link can view this task without signing in.</p>
        <div className={`mt-4 ${sharing ? "pointer-events-none opacity-60" : ""}`}>
          <ShareLinkField enabled={Boolean(task.shareEnabled)} onEnabledChange={(value) => void setPublic(value)} path={publicPath} />
        </div>
      </section>
    </main>
  )
}
