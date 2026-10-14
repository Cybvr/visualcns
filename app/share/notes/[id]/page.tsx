"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { DocumentActions } from "@/components/dashboard/document-actions"
import { TaskContent } from "@/components/dashboard/task-content"
import { Skeleton } from "@/components/ui/skeleton"
import { getSharedNote, noteBodyHtml, type Note } from "@/lib/notes"

const TASK_LIST = "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_li>label]:flex [&_ul[data-type=taskList]_li>label]:h-[1lh] [&_ul[data-type=taskList]_li>label]:items-center [&_ul[data-type=taskList]_li>label]:shrink-0 [&_ul[data-type=taskList]_li>div]:min-w-0 [&_ul[data-type=taskList]_li>div]:flex-1 [&_ul[data-type=taskList]_li[data-checked=true]>div]:line-through [&_ul[data-type=taskList]_li>div>p]:my-0 [&_input[type=checkbox]]:pointer-events-none [&_input[type=checkbox]]:size-4 [&_input[type=checkbox]]:accent-primary [&_img]:max-w-full [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left"

/** No login required: a note is readable by anyone with its link once sharing is on. */
export default function SharedNotePage() {
  const { id } = useParams<{ id: string }>()
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let active = true
    getSharedNote(id)
      .then((found) => {
        if (active) {
          setNote(found)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setNote(null)
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [id])

  if (loading) {
    return <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16" role="status" aria-label="Loading shared note"><div className="mx-auto max-w-3xl space-y-5"><Skeleton className="h-10 w-28 ml-auto" /><div className="space-y-5 rounded-xl border border-border bg-background p-6 sm:p-8"><Skeleton className="h-9 w-2/3" /><Skeleton className="h-32 w-full" /><Skeleton className="h-4 w-4/5" /></div></div></main>
  }

  if (!note) {
    return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4"><p className="text-sm text-muted-foreground">This note link is no longer available.</p></main>
  }

  const title = note.title.trim() || "Untitled note"
  const updated = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : ""

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex justify-end print:hidden">
          <DocumentActions title={title} />
        </div>
        <article className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <header className="border-b border-border px-6 py-7 sm:px-8">
            <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {updated && <p className="mt-2 text-sm text-muted-foreground">Updated {updated}</p>}
          </header>
          <div className="px-6 py-7 sm:px-8">
            <TaskContent value={noteBodyHtml(note.body)} className={`text-foreground ${TASK_LIST}`} />
          </div>
        </article>
        <p className="mt-6 text-center text-xs text-muted-foreground print:hidden">Shared by VisualHQ</p>
      </div>
    </main>
  )
}
