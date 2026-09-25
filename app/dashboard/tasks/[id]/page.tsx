"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ExternalLink, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { ShareLinkField } from "@/components/dashboard/share-link-field"
import { TaskForm } from "@/components/dashboard/task-form"
import { getTask, updateTask, type Task } from "@/lib/tasks"

export default function TaskEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareEnabled, setShareEnabled] = useState(false)
  const [shareSaving, setShareSaving] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getTask(id)
      .then((found) => {
        setTask(found)
        setShareEnabled(Boolean(found?.shareEnabled))
        if (!found) setError("This task could not be found.")
      })
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : "This task could not be loaded."))
      .finally(() => setLoading(false))
  }, [id])

  function openShare() {
    if (!task) return
    setShareEnabled(Boolean(task.shareEnabled))
    setShareError(null)
    setShareOpen(true)
  }

  async function saveSharing() {
    if (!task) return
    setShareSaving(true)
    setShareError(null)
    try {
      await updateTask(task.id, { shareEnabled })
      setTask((current) => current ? { ...current, shareEnabled } : current)
      setShareOpen(false)
    } catch (caughtError) {
      setShareError(caughtError instanceof Error ? caughtError.message : "The task sharing settings could not be updated.")
    } finally {
      setShareSaving(false)
    }
  }

  if (loading) {
    return <DashboardPageSkeleton variant="detail" />
  }

  if (!task) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">{error || "This task could not be found."}</CardContent>
        </Card>
      </main>
    )
  }

  const publicPath = `/share/tasks/${encodeURIComponent(task.id)}`

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/tasks")}>
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back to tasks
        </Button>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={openShare}>
            <Share2 className="mr-2 size-4" aria-hidden="true" />
            Share
          </Button>
          {task.shareEnabled && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicPath} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 size-4" />Open public link</a>
            </Button>
          )}
        </div>
      </div>

      <section className="mt-6">
        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
        <div className={error ? "mt-6" : undefined}>
          <TaskForm
            task={task}
            onSaved={(savedId) => router.replace(`/dashboard/tasks/${encodeURIComponent(savedId)}`)}
            onCancel={() => router.push("/dashboard/tasks")}
          />
        </div>
      </section>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share task</DialogTitle>
            <DialogDescription>Control access to this task with a public link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ShareLinkField enabled={shareEnabled} onEnabledChange={setShareEnabled} path={publicPath} />
            {shareError && <p className="text-sm text-destructive" role="alert">{shareError}</p>}
            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={() => void saveSharing()} disabled={shareSaving}>
                {shareSaving ? "Saving" : "Save sharing"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
