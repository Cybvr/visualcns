"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { createComment, deleteComment, getCommentsByTaskId, type Comment } from "@/lib/comments"
import { formatTimestamp } from "@/lib/tasks"

/** Initials for the avatar bubble, from a display name or an email. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

/**
 * The comment thread on one task. Anyone who can open the task can post, and a
 * comment can only be removed by whoever wrote it, or by an admin.
 */
export function TaskComments({ taskId, companyId }: { taskId: string; companyId: string }) {
  const { user, appUser, isAdmin } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState("")
  const [posting, setPosting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchComments() {
      setLoading(true)
      try {
        const found = await getCommentsByTaskId(taskId)
        if (!cancelled) setComments(found)
      } catch (caughtError) {
        console.error("Error loading comments:", caughtError)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchComments()
    return () => {
      cancelled = true
    }
  }, [taskId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = body.trim()
    if (!text || !user) return

    setPosting(true)
    setError(null)
    try {
      const authorName = appUser?.displayName || appUser?.company || user.displayName || user.email || "Someone"
      const id = await createComment({
        taskId,
        companyId,
        authorUid: user.uid,
        authorName,
        body: text,
      })
      setComments((current) => [...current, { id, taskId, companyId, authorUid: user.uid, authorName, body: text }])
      setBody("")
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The comment could not be posted.")
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(id: string) {
    setRemoving(id)
    setError(null)
    try {
      await deleteComment(id)
      setComments((current) => current.filter((comment) => comment.id !== id))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The comment could not be deleted.")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <section className="mt-8 border-t border-border pt-5">
      <h3 className="text-sm font-semibold">
        Comments
        {comments.length > 0 && <span className="ml-1.5 font-normal text-muted-foreground">{comments.length}</span>}
      </h3>

      {loading ? (
        <div className="space-y-3 py-4" role="status" aria-label="Loading comments">
          <Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-1/2" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                {initials(comment.authorName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium">{comment.authorName}</span>
                  {comment.createdAt && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatTimestamp(comment.createdAt)}
                    </span>
                  )}
                  {(isAdmin || comment.authorUid === user?.uid) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      disabled={removing === comment.id}
                      aria-label="Delete comment"
                      className="ml-auto shrink-0 text-muted-foreground outline-none transition-colors hover:text-destructive focus-visible:text-destructive"
                    >
                      {removing === comment.id ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      )}
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Leave a comment"
          rows={3}
          maxLength={2000}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={posting || !body.trim()}>
            {posting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {posting ? "Posting" : "Comment"}
          </Button>
        </div>
      </form>
    </section>
  )
}
