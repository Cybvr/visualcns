"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { collection, addDoc, getDocs, query, serverTimestamp, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { PortalTask } from "@/lib/portal-model"
import { tsToMillis } from "@/lib/tasks"
import { getCurrentTenantId } from "@/lib/tenancy"
import { usePortalKey } from "./portal-shell"

type Comment = { id: string; body: string; authorName: string; createdAt?: unknown }

/** Remember the name a link visitor typed, so they don't retype it each time. */
const NAME_KEY = "portalVisitorName"
function recallName() { try { return localStorage.getItem(NAME_KEY) || "" } catch { return "" } }
function rememberName(name: string) { try { localStorage.setItem(NAME_KEY, name) } catch { /* storage unavailable */ } }

export function PortalTaskFeedback({ task, canAct }: { task: PortalTask; canAct: boolean }) {
  const { user, appUser } = useAuth()
  const portalKey = usePortalKey()
  // A link visitor (no account) writes through the server using the link's key.
  const viaLink = Boolean(portalKey) && !appUser
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)

  useEffect(() => { setName(recallName()) }, [])

  const load = useCallback(async () => {
    if (viaLink) {
      const response = await fetch(`/api/portal/public/comments?key=${encodeURIComponent(portalKey)}&taskId=${encodeURIComponent(task.id)}`, { cache: "no-store" })
      if (!response.ok) throw new Error()
      const data = await response.json() as { comments?: Comment[] }
      return (data.comments || []).map(c => ({ ...c, createdAt: typeof c.createdAt === "number" ? c.createdAt : 0 }))
    }
    const tenantId = await getCurrentTenantId()
    const snapshot = await getDocs(query(collection(db, "portalComments"), where("tenantId", "==", tenantId), where("companyId", "==", task.companyId), where("taskId", "==", task.id)))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Comment).sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt))
  }, [viaLink, portalKey, task.id, task.companyId])

  useEffect(() => {
    let active = true
    setLoading(true)
    load().then(rows => { if (active) { setComments(rows); setError("") } })
      .catch(() => { if (active) setError("Couldn’t load feedback. Try again.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [load, revision])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!body.trim() || saving) return
    setSaving(true); setError("")
    try {
      if (viaLink) {
        const authorName = name.trim() || "Client"
        rememberName(authorName)
        const response = await fetch("/api/portal/public/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: portalKey, taskId: task.id, body: body.trim(), authorName }),
        })
        if (!response.ok) throw new Error()
      } else {
        if (!user) return
        await addDoc(collection(db, "portalComments"), { tenantId: task.tenantId || await getCurrentTenantId(), companyId: task.companyId, taskId: task.id, authorUid: user.uid, authorName: appUser?.displayName || "Client", body: body.trim(), createdAt: serverTimestamp() })
      }
      setBody(""); setRevision(n => n + 1)
    } catch { setError("Couldn’t send your feedback. Your message is still here; try again.") } finally { setSaving(false) }
  }

  return <div className="border-t border-border pt-4"><h3 className="text-xs font-semibold">Feedback</h3>{loading ? <p role="status" className="my-3 text-xs text-muted-foreground">Loading feedback…</p> : <div className="my-4 space-y-4">{comments.map(comment => <div key={comment.id}><p className="text-xs font-medium">{comment.authorName}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{comment.body}</p></div>)}{!comments.length && <p className="text-xs text-muted-foreground">No feedback yet.</p>}</div>}{error && <div role="alert" className="my-3 text-sm text-destructive">{error}<button onClick={() => setRevision(n => n + 1)} className="ml-2 underline">Retry</button></div>}{canAct && <form onSubmit={submit} className="space-y-3">{viaLink && <div><label htmlFor={`name-${task.id}`} className="sr-only">Your name</label><Input id={`name-${task.id}`} value={name} onChange={e => setName(e.target.value)} maxLength={200} placeholder="Your name" /></div>}<label htmlFor={`feedback-${task.id}`} className="sr-only">Your feedback</label><Textarea id={`feedback-${task.id}`} value={body} onChange={e => setBody(e.target.value)} maxLength={4000} placeholder="Share feedback or ask a question…" /><Button size="sm" disabled={saving || !body.trim()}>{saving ? "Sending…" : "Send feedback"}</Button></form>}</div>
}
