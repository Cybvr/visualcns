"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Copy, Loader2, Pencil, Play, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { MAX_LEADS_PER_RUN, SCHEDULE_FREQUENCIES, type LeadSchedule, type ScheduleDraft, type ScheduleFrequency } from "@/lib/lead-schedules"
import { markdownToHtml } from "@/lib/markdown"

type ScheduleForm = { name: string; query: string; pitch: string; frequency: ScheduleFrequency; limit: number; active: boolean }

const EMPTY_FORM: ScheduleForm = { name: "", query: "", pitch: "", frequency: "weekdays", limit: 10, active: true }

function frequencyLabel(value: ScheduleFrequency) {
  return SCHEDULE_FREQUENCIES.find((item) => item.value === value)?.label ?? value
}

function lastRunText(schedule: LeadSchedule) {
  const run = schedule.lastRun
  if (!run) return "Not run yet"
  const when = new Date(run.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
  if (run.error) return `${when}: ${run.error}`
  return `${when}: ${run.added} new lead${run.added === 1 ? "" : "s"}, ${run.drafted} email${run.drafted === 1 ? "" : "s"} drafted`
}

export default function SchedulesPage() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<LeadSchedule[] | null>(null)
  const [drafts, setDrafts] = useState<ScheduleDraft[]>([])
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<LeadSchedule | "new" | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<LeadSchedule | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [senders, setSenders] = useState<string[]>([])
  const [sender, setSender] = useState("")

  const call = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!user) throw new Error("Please sign in again.")
    const idToken = await user.getIdToken()
    const response = await fetch(path, {
      ...init,
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error((result as { error?: string }).error || "Something went wrong.")
    return result
  }, [user])

  const load = useCallback(async () => {
    try {
      const result = await call("/api/schedules") as { schedules: LeadSchedule[]; drafts: ScheduleDraft[] }
      setSchedules(result.schedules)
      setDrafts(result.drafts)
      setError(false)
    } catch {
      setError(true)
    }
  }, [call])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    fetch("/api/email/send", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { from?: string | null; senders?: string[] }) => {
        const options = Array.isArray(result.senders) && result.senders.length ? result.senders : result.from ? [result.from] : []
        setSenders(options)
        setSender((current) => current || options[0] || "")
      })
      .catch(() => undefined)
  }, [])

  async function save(form: ScheduleForm) {
    if (editing === "new") await call("/api/schedules", { method: "POST", body: JSON.stringify(form) })
    else if (editing) await call("/api/schedules", { method: "PATCH", body: JSON.stringify({ ...form, id: editing.id }) })
    setEditing(null)
    await load()
  }

  async function toggle(schedule: LeadSchedule, active: boolean) {
    setSchedules((current) => current?.map((item) => item.id === schedule.id ? { ...item, active } : item) ?? null)
    try {
      await call("/api/schedules", { method: "PATCH", body: JSON.stringify({ id: schedule.id, active }) })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the schedule.")
      await load()
    }
  }

  async function runNow(schedule: LeadSchedule) {
    setRunning(schedule.id)
    try {
      const { summary } = await call("/api/schedules/run", { method: "POST", body: JSON.stringify({ id: schedule.id }) }) as { summary: { added: number; drafted: number } }
      toast.success(`${summary.added} new lead${summary.added === 1 ? "" : "s"}, ${summary.drafted} email${summary.drafted === 1 ? "" : "s"} drafted.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The schedule could not run.")
    } finally {
      setRunning(null)
      await load()
    }
  }

  async function duplicate(schedule: LeadSchedule) {
    try {
      const { name, query, pitch, frequency, limit } = schedule
      await call("/api/schedules", { method: "POST", body: JSON.stringify({ name: `${name} copy`, query, pitch, frequency, limit, active: false }) })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy the schedule.")
    }
  }

  async function remove(schedule: LeadSchedule) {
    setConfirmDelete(null)
    try {
      await call(`/api/schedules?id=${encodeURIComponent(schedule.id)}`, { method: "DELETE" })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the schedule.")
    }
  }

  async function sendDraft(draft: ScheduleDraft, subject: string, body: string) {
    if (!sender) throw new Error("Set up a sending address in Email first.")
    await call("/api/email/send", {
      method: "POST",
      body: JSON.stringify({
        to: draft.to,
        type: "transactional",
        subject: subject.trim(),
        text: body.trim(),
        html: markdownToHtml(body.trim()),
        branded: true,
        from: sender,
        history: {
          to: draft.to,
          createdAt: new Date().toISOString(),
          recipients: [{ email: draft.to, name: draft.company || undefined }],
          companyName: draft.company || undefined,
        },
      }),
    })
    await call("/api/schedules/drafts", { method: "PATCH", body: JSON.stringify({ id: draft.id, status: "sent", subject, body }) })
    setDrafts((current) => current.filter((item) => item.id !== draft.id))
    toast.success(`Sent to ${draft.company || draft.to}.`)
  }

  async function discardDraft(draft: ScheduleDraft) {
    await call("/api/schedules/drafts", { method: "PATCH", body: JSON.stringify({ id: draft.id, status: "discarded" }) })
    setDrafts((current) => current.filter((item) => item.id !== draft.id))
  }

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-4 pb-12 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Schedules</h1>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden="true" />
          New schedule
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mt-10 text-sm text-destructive">Schedules unavailable. Refresh to try again.</p>
      ) : schedules === null ? (
        <div className="mt-10 flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>
      ) : schedules.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No schedules yet.</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {schedules.map((schedule) => (
            <li key={schedule.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{schedule.name}</p>
                <p className="truncate text-sm text-muted-foreground">{schedule.query} · {frequencyLabel(schedule.frequency)} · up to {schedule.limit}</p>
                <p className={`mt-1 truncate text-xs ${schedule.lastRun?.error ? "text-destructive" : "text-muted-foreground"}`}>{lastRunText(schedule)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Switch checked={schedule.active} onCheckedChange={(checked) => void toggle(schedule, checked)} aria-label={schedule.active ? "Pause schedule" : "Turn schedule on"} />
                <Button variant="ghost" size="sm" onClick={() => void runNow(schedule)} disabled={running !== null}>
                  {running === schedule.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                  Run now
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditing(schedule)} aria-label="Edit schedule"><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => void duplicate(schedule)} aria-label="Duplicate schedule"><Copy className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(schedule)} aria-label="Delete schedule"><Trash2 className="size-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {drafts.length > 0 && (
        <section className="mt-10">
          <SectionHeader title={`Waiting to send (${drafts.length})`}>
            {senders.length > 1 && (
              <Select value={sender} onValueChange={setSender}>
                <SelectTrigger className="w-auto min-w-56" aria-label="Send from"><SelectValue placeholder="Send from" /></SelectTrigger>
                <SelectContent>
                  {senders.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </SectionHeader>
          <div className="mt-4 space-y-4">
            {drafts.map((draft) => <DraftCard key={draft.id} draft={draft} onSend={sendDraft} onDiscard={discardDraft} />)}
          </div>
        </section>
      )}

      <ScheduleDialog schedule={editing} onClose={() => setEditing(null)} onSave={save} />

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
            <AlertDialogDescription>Leads it found stay in Leads. Its unsent drafts are removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && void remove(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

function DraftCard({ draft, onSend, onDiscard }: {
  draft: ScheduleDraft
  onSend: (draft: ScheduleDraft, subject: string, body: string) => Promise<void>
  onDiscard: (draft: ScheduleDraft) => Promise<void>
}) {
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)
  const [busy, setBusy] = useState<"send" | "discard" | null>(null)

  async function act(kind: "send" | "discard") {
    setBusy(kind)
    try {
      if (kind === "send") await onSend(draft, subject, body)
      else await onDiscard(draft)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't work. Try again.")
      setBusy(null)
    }
  }

  return (
    <article className="rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium">{draft.company}</p>
        <p className="text-xs text-muted-foreground">
          {draft.to}
          {draft.website && <> · <a href={draft.website} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">website</a></>}
          {" · "}{draft.scheduleName}
        </p>
      </div>
      <Input className="mt-3" value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Subject" />
      <Textarea className="mt-2 min-h-40" value={body} onChange={(event) => setBody(event.target.value)} aria-label="Message" />
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => void act("discard")} disabled={busy !== null}>
          {busy === "discard" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Discard
        </Button>
        <Button onClick={() => void act("send")} disabled={busy !== null || !subject.trim() || !body.trim()}>
          {busy === "send" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Send
        </Button>
      </div>
    </article>
  )
}

function ScheduleDialog({ schedule, onClose, onSave }: {
  schedule: LeadSchedule | "new" | null
  onClose: () => void
  onSave: (form: ScheduleForm) => Promise<void>
}) {
  const [form, setForm] = useState<ScheduleForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (schedule === null) return
    setForm(schedule === "new" ? EMPTY_FORM : {
      name: schedule.name,
      query: schedule.query,
      pitch: schedule.pitch,
      frequency: schedule.frequency,
      limit: schedule.limit,
      active: schedule.active,
    })
  }, [schedule])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.query.trim()) return
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the schedule.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={schedule !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{schedule === "new" ? "New schedule" : "Edit schedule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Name</Label>
            <Input id="schedule-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Lekki dentists" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-query">Google Maps search</Label>
            <Input id="schedule-query" value={form.query} onChange={(event) => setForm({ ...form, query: event.target.value })} placeholder="dental clinics in Lekki, Lagos" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-pitch">What you offer</Label>
            <Textarea id="schedule-pitch" className="min-h-28" value={form.pitch} onChange={(event) => setForm({ ...form, pitch: event.target.value })} placeholder="We run Instagram and Google ads for clinics and handle the booking page." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>How often</Label>
              <Select value={form.frequency} onValueChange={(value) => setForm({ ...form, frequency: value as ScheduleFrequency })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULE_FREQUENCIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-limit">New leads per run</Label>
              <Input
                id="schedule-limit"
                type="number"
                min={1}
                max={MAX_LEADS_PER_RUN}
                value={form.limit}
                onChange={(event) => setForm({ ...form, limit: Math.min(Math.max(Number(event.target.value) || 1, 1), MAX_LEADS_PER_RUN) })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="schedule-active" checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
            <Label htmlFor="schedule-active">On</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.name.trim() || !form.query.trim()}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
