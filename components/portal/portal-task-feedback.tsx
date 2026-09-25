"use client"

import { useEffect, useState, type FormEvent } from "react"
import { collection, addDoc, getDocs, query, serverTimestamp, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { PortalTask } from "@/lib/portal-model"
import { tsToMillis } from "@/lib/tasks"
import { getCurrentAgencyId } from "@/lib/agency-scope"

export function PortalTaskFeedback({ task, canAct }: { task: PortalTask; canAct: boolean }) {
  const { user, appUser } = useAuth()
  const [comments, setComments] = useState<{ id: string; body: string; authorName: string; createdAt?: unknown }[]>([])
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    getCurrentAgencyId().then((agencyId) => getDocs(query(collection(db, "portalComments"), where("agencyId", "==", agencyId), where("companyId", "==", task.companyId), where("taskId", "==", task.id)))).then(snapshot => {
      if (active) { setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as { id: string; body: string; authorName: string; createdAt?: unknown }).sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt))); setError("") }
    }).catch(() => { if (active) setError("Couldn’t load feedback. Try again.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [task.companyId, task.id, revision])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!body.trim() || !user || saving) return
    setSaving(true); setError("")
    try {
      await addDoc(collection(db, "portalComments"), { agencyId: task.agencyId || await getCurrentAgencyId(), companyId: task.companyId, taskId: task.id, authorUid: user.uid, authorName: appUser?.displayName || "Client", body: body.trim(), createdAt: serverTimestamp() })
      setBody(""); setRevision(n => n + 1)
    } catch { setError("Couldn’t send your feedback. Your message is still here; try again.") } finally { setSaving(false) }
  }
  return <div className="border-t border-border pt-4"><h3 className="text-xs font-semibold">Feedback</h3>{loading ? <p role="status" className="my-3 text-xs text-muted-foreground">Loading feedback…</p> : <div className="my-4 space-y-4">{comments.map(comment => <div key={comment.id}><p className="text-xs font-medium">{comment.authorName}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{comment.body}</p></div>)}{!comments.length && <p className="text-xs text-muted-foreground">No feedback yet.</p>}</div>}{error && <div role="alert" className="my-3 text-sm text-destructive">{error}<button onClick={() => setRevision(n => n + 1)} className="ml-2 underline">Retry</button></div>}{canAct && <form onSubmit={submit} className="space-y-3"><label htmlFor={`feedback-${task.id}`} className="sr-only">Your feedback</label><Textarea id={`feedback-${task.id}`} value={body} onChange={e => setBody(e.target.value)} maxLength={4000} placeholder="Share feedback or ask a question…" /><Button size="sm" disabled={saving || !body.trim()}>{saving ? "Sending…" : "Send feedback"}</Button></form>}</div>
}
