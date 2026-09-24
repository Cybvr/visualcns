"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ExternalLink, Loader2, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/inline-table-cells"
import { ShareLinkField } from "@/components/dashboard/share-link-field"
import { TaskEditorSheet } from "@/components/dashboard/task-editor-sheet"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { taskContentHtml } from "@/components/dashboard/task-content"
import { getTask, taskPriorityMeta, taskStatusMeta, updateTask, type Task } from "@/lib/tasks"

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [contentDraft, setContentDraft] = useState("")
  const [savingContent, setSavingContent] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTask = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const found = await getTask(id)
      setTask(found)
      setContentDraft(found?.content ?? "")
      if (!found) setError("This task could not be found.")
    } catch (caughtError) {
      setTask(null)
      setError(caughtError instanceof Error ? caughtError.message : "This task could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadTask()
  }, [loadTask])

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

  async function saveContent() {
    if (!task) return
    setSavingContent(true)
    setError(null)
    try {
      await updateTask(task.id, { content: contentDraft })
      setTask((current) => current ? { ...current, content: contentDraft } : current)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The task content could not be saved.")
    } finally {
      setSavingContent(false)
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

  const status = taskStatusMeta[task.status] ?? taskStatusMeta.todo
  const priority = taskPriorityMeta[task.priority] ?? taskPriorityMeta.medium
  const publicPath = `/share/tasks/${encodeURIComponent(task.id)}`

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-12 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push("/dashboard/tasks")}><ArrowLeft className="mr-2 size-4" />Back to tasks</Button>
        <div className="flex items-center gap-2">
          {task.shareEnabled && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicPath} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 size-4" />Open public link</a>
            </Button>
          )}
          <Button size="sm" onClick={() => setEditing(true)}><Pencil className="mr-2 size-4" />Edit task</Button>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader className="gap-3 border-b border-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{task.client || "Task"}{task.project ? ` · ${task.project}` : ""}</p>
              <CardTitle className="mt-1 break-words text-2xl">{task.name || "Untitled task"}</CardTitle>
            </div>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client</p><p className="mt-1 truncate text-sm">{task.client || "—"}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project</p><p className="mt-1 truncate text-sm">{task.project || "—"}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority</p><Badge className={priority.className}>{priority.label}</Badge></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Due</p><p className="mt-1 text-sm">{task.dueDate || "No due date"}</p></div>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Details</h2>
            <RichTextEditor
              value={taskContentHtml(contentDraft)}
              onChange={setContentDraft}
              placeholder="Notes, links, details of the work..."
              compact
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={() => void saveContent()} disabled={savingContent}>
                {savingContent && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save details
              </Button>
            </div>
          </section>

          <section className="space-y-2 border-t border-border pt-5">
            <h2 className="text-sm font-semibold">Public sharing</h2>
            <p className="text-sm text-muted-foreground">Anyone with the link can view this task without signing in.</p>
            <div className={sharing ? "pointer-events-none opacity-60" : undefined}>
              <ShareLinkField enabled={Boolean(task.shareEnabled)} onEnabledChange={(value) => void setPublic(value)} path={publicPath} />
            </div>
          </section>
        </CardContent>
      </Card>

      <TaskEditorSheet
        open={editing}
        task={task}
        companyId={task.companyId}
        clientName={task.client || task.companyId}
        onClose={() => setEditing(false)}
        onSaved={loadTask}
      />
    </main>
  )
}
