"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { CheckSquare, ChevronLeft, ChevronRight, Clock3, MapPin, Pencil, Plus, Video } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CompactListSkeleton } from "@/components/dashboard/compact-list-row"
import { getOrganizations, type Organization } from "@/lib/organizations"
import { getProjects, type Project } from "@/lib/projects"
import { getTasks, type Task } from "@/lib/tasks"
import { bookingTime, type CalendarBooking } from "@/lib/calendar-bookings"

type BookingDraft = {
  title: string
  companyId: string
  projectId: string
  startsAt: string
  durationMinutes: string
  location: string
  meetingUrl: string
  staffNotes: string
}

const EMPTY_DRAFT: BookingDraft = { title: "", companyId: "", projectId: "", startsAt: "", durationMinutes: "60", location: "", meetingUrl: "", staffNotes: "" }
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
type CalendarFilter = "both" | "bookings" | "tasks"

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function localDateTime(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

function readableDate(date: Date, options: Intl.DateTimeFormatOptions = { dateStyle: "full" }) {
  return new Intl.DateTimeFormat(undefined, options).format(date)
}

function bookingsForDate(bookings: CalendarBooking[], key: string) {
  return bookings.filter((booking) => dateKey(new Date(booking.startsAt)) === key)
}

function taskDueDateKey(task: Task) {
  if (!task.dueDate) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) return task.dueDate
  const date = new Date(task.dueDate)
  return Number.isNaN(date.getTime()) ? "" : dateKey(date)
}

function tasksForDate(tasks: Task[], key: string) {
  return tasks.filter((task) => taskDueDateKey(task) === key)
}

export function CalendarPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>("both")
  const [companies, setCompanies] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<CalendarBooking | null>(null)
  const [draft, setDraft] = useState<BookingDraft>(EMPTY_DRAFT)
  const [cancelTarget, setCancelTarget] = useState<CalendarBooking | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError("")
    try {
      const token = await user.getIdToken()
      const [response, nextCompanies, nextProjects, nextTasks] = await Promise.all([
        fetch("/api/calendar/bookings", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        getOrganizations(),
        getProjects(),
        getTasks().catch(() => []),
      ])
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Bookings couldn’t be loaded.")
      setBookings(Array.isArray(result.bookings) ? result.bookings : [])
      setCompanies(nextCompanies)
      setProjects(nextProjects)
      setTasks(nextTasks)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Bookings couldn’t be loaded.")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  const cells = useMemo(() => monthCells(month), [month])
  const selectedBookings = useMemo(() => calendarFilter === "tasks" ? [] : bookingsForDate(bookings, selectedDate), [bookings, calendarFilter, selectedDate])
  const selectedTasks = useMemo(() => calendarFilter === "bookings" ? [] : tasksForDate(tasks, selectedDate), [calendarFilter, selectedDate, tasks])
  const companyProjects = useMemo(() => projects.filter((project) => project.companyId === draft.companyId), [draft.companyId, projects])

  function newBooking(date = selectedDate) {
    const company = companies[0]
    setEditing(null)
    setDraft({ ...EMPTY_DRAFT, companyId: company?.id || "", startsAt: `${date}T09:00` })
    setFormOpen(true)
  }

  function editBooking(booking: CalendarBooking) {
    setEditing(booking)
    setDraft({
      title: booking.title,
      companyId: booking.companyId,
      projectId: booking.projectId || "",
      startsAt: localDateTime(booking.startsAt),
      durationMinutes: String(booking.durationMinutes),
      location: booking.location || "",
      meetingUrl: booking.meetingUrl || "",
      staffNotes: booking.staffNotes || "",
    })
    setFormOpen(true)
  }

  async function saveBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || saving) return
    setSaving(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/calendar/bookings", {
        method: editing ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: editing.id } : {}),
          ...draft,
          startsAt: new Date(draft.startsAt).toISOString(),
          durationMinutes: Number(draft.durationMinutes),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos",
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "The booking couldn’t be saved.")
      setBookings((current) => editing
        ? current.map((booking) => booking.id === editing.id ? result.booking : booking)
        : [...current, result.booking])
      setSelectedDate(dateKey(new Date(result.booking.startsAt)))
      setMonth(new Date(new Date(result.booking.startsAt).getFullYear(), new Date(result.booking.startsAt).getMonth(), 1))
      setFormOpen(false)
      if (result.warning) toast.warning(result.warning)
      else toast.success(editing ? "Booking updated" : "Booking created")
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "The booking couldn’t be saved.")
    } finally {
      setSaving(false)
    }
  }

  async function cancelBooking() {
    if (!user || !cancelTarget) return
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/calendar/bookings", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: cancelTarget.id, status: "cancelled" }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "The booking couldn’t be cancelled.")
      setBookings((current) => current.map((booking) => booking.id === cancelTarget.id ? result.booking : booking))
      toast.success("Booking cancelled")
    } catch (cancelError) {
      toast.error(cancelError instanceof Error ? cancelError.message : "The booking couldn’t be cancelled.")
    } finally {
      setCancelTarget(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-4 pb-12 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
          <h2 className="min-w-40 text-lg font-semibold">{readableDate(month, { month: "long", year: "numeric" })}</h2>
          <Button variant="outline" size="icon" aria-label="Next month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
          <Button variant="ghost" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(dateKey(today)) }}>Today</Button>
        </div>
        {calendarFilter !== "tasks" && <Button onClick={() => newBooking()}><Plus className="size-4" />New booking</Button>}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Show</span>
        <div role="group" aria-label="Filter calendar items" className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          {([ ["both", "All"], ["bookings", "Bookings"], ["tasks", "Tasks"] ] as const).map(([value, label]) => (
            <Button key={value} type="button" size="sm" variant={calendarFilter === value ? "secondary" : "ghost"} aria-pressed={calendarFilter === value} onClick={() => setCalendarFilter(value)}>{label}</Button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 p-5 text-sm text-destructive">{error}</div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {WEEKDAYS.map((day) => <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day) => {
                const key = dateKey(day)
                const dayBookings = calendarFilter === "tasks" ? [] : bookingsForDate(bookings, key)
                const dayTasks = calendarFilter === "bookings" ? [] : tasksForDate(tasks, key)
                const itemCount = dayBookings.length + dayTasks.length
                const isCurrentMonth = day.getMonth() === month.getMonth()
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={`min-h-20 border-b border-r border-border p-1.5 text-left transition-colors sm:min-h-28 sm:p-2 ${selectedDate === key ? "bg-muted/50" : "hover:bg-muted/30"} ${isCurrentMonth ? "" : "text-muted-foreground/50"}`}
                  >
                    <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${key === dateKey(new Date()) ? "bg-primary text-primary-foreground" : ""}`}>{day.getDate()}</span>
                    <span className="mt-1 hidden space-y-1 sm:block">
                      {loading ? <span className="block h-3 w-3/4 animate-pulse rounded-md bg-accent" /> : dayTasks.slice(0, 2).map((task) => (
                        <span key={task.id} className={`block truncate rounded px-1.5 py-0.5 text-left text-xs ${task.status === "done" ? "bg-muted text-muted-foreground line-through" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
                          Task · {task.name}
                        </span>
                      ))}
                      {!loading && dayBookings.slice(0, Math.max(0, 2 - Math.min(dayTasks.length, 2))).map((booking) => (
                        <span key={booking.id} className={`block truncate rounded px-1.5 py-0.5 text-left text-xs ${booking.status === "scheduled" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground line-through"}`}>
                          {bookingTime(booking)} {booking.title}
                        </span>
                      ))}
                      {!loading && itemCount > 2 && <span className="block px-1 text-[11px] text-muted-foreground">+{itemCount - 2} more</span>}
                    </span>
                    {loading ? <span className="mx-auto mt-1 block size-1.5 animate-pulse rounded-full bg-accent sm:hidden" /> : itemCount > 0 && <span className="mt-1 flex justify-center gap-0.5 sm:hidden">{dayTasks.slice(0, 3).map((task) => <span key={`task-${task.id}`} className={`size-1.5 rounded-full ${task.status === "done" ? "bg-muted-foreground" : "bg-emerald-500"}`} />)}{dayBookings.slice(0, Math.max(0, 3 - dayTasks.length)).map((booking) => <span key={`booking-${booking.id}`} className={`size-1.5 rounded-full ${booking.status === "scheduled" ? "bg-primary" : "bg-muted-foreground"}`} />)}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">{readableDate(new Date(`${selectedDate}T12:00:00`))}</h3>
              {calendarFilter !== "tasks" && <Button variant="ghost" size="sm" onClick={() => newBooking(selectedDate)}><Plus className="size-4" />Add booking</Button>}
            </div>
            {loading ? (
              <CompactListSkeleton rows={3} />
            ) : selectedBookings.length === 0 && selectedTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No calendar items on this day.</div>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border">
                {selectedTasks.map((task) => (
                  <div key={`task-${task.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><CheckSquare className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/dashboard/tasks/${encodeURIComponent(task.id)}`} className={`truncate font-medium hover:underline ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.name}</Link>
                      <p className="mt-1 truncate text-sm text-muted-foreground">Task · {task.client || "No company"}{task.project ? ` · ${task.project}` : ""}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{task.status === "done" ? "Done" : task.status === "in-progress" ? "In progress" : task.status === "review" ? "In review" : "Backlog"}</span>
                  </div>
                ))}
                {selectedBookings.map((booking) => (
                  <div key={booking.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-medium ${booking.status === "cancelled" ? "text-muted-foreground line-through" : ""}`}>{booking.title}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{booking.companyName}{booking.projectName ? ` · ${booking.projectName}` : ""}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{bookingTime(booking)} · {booking.durationMinutes} min</span>
                        {booking.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{booking.location}</span>}
                        {booking.meetingUrl && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={booking.meetingUrl} target="_blank" rel="noreferrer"><Video className="size-3.5" />Join</a>}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${booking.status === "scheduled" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{booking.status === "scheduled" ? "Scheduled" : booking.status}</span>
                    {booking.status === "scheduled" && <Button variant="ghost" size="icon" aria-label={`Edit ${booking.title}`} onClick={() => editBooking(booking)}><Pencil className="size-4" /></Button>}
                    {booking.status === "scheduled" && <Button variant="outline" size="sm" onClick={() => setCancelTarget(booking)}>Cancel</Button>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit booking" : "New booking"}</DialogTitle>
            <DialogDescription>Google Meet links are added automatically when Calendar is connected. Staff notes remain private.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveBooking} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="booking-title">Title</Label><Input id="booking-title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required maxLength={140} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Company</Label><Select value={draft.companyId} onValueChange={(companyId) => setDraft((current) => ({ ...current, companyId, projectId: "" }))}><SelectTrigger><SelectValue placeholder="Choose a company" /></SelectTrigger><SelectContent>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Project (optional)</Label><Select value={draft.projectId || "none"} onValueChange={(projectId) => setDraft((current) => ({ ...current, projectId: projectId === "none" ? "" : projectId }))}><SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger><SelectContent><SelectItem value="none">No project</SelectItem>{companyProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="booking-start">Date and time</Label><Input id="booking-start" type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft((current) => ({ ...current, startsAt: event.target.value }))} required /></div>
              <div className="space-y-1.5"><Label htmlFor="booking-duration">Duration</Label><Select value={draft.durationMinutes} onValueChange={(durationMinutes) => setDraft((current) => ({ ...current, durationMinutes }))}><SelectTrigger id="booking-duration"><SelectValue /></SelectTrigger><SelectContent>{[15, 30, 45, 60, 90, 120, 180, 240, 480].map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hour${minutes === 60 ? "" : "s"}`}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="booking-location">Location</Label><Input id="booking-location" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} maxLength={200} placeholder="Office or address" /></div>
              <div className="space-y-1.5"><Label htmlFor="booking-link">Meeting link</Label><Input id="booking-link" type="url" value={draft.meetingUrl} onChange={(event) => setDraft((current) => ({ ...current, meetingUrl: event.target.value }))} placeholder="Leave blank to create a Google Meet link" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="booking-notes">Staff-only notes</Label><Textarea id="booking-notes" value={draft.staffNotes} onChange={(event) => setDraft((current) => ({ ...current, staffNotes: event.target.value }))} maxLength={2000} rows={3} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !draft.companyId}>{saving ? "Saving…" : editing ? "Save changes" : "Create booking"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cancel this booking?</AlertDialogTitle><AlertDialogDescription>This will tell the company the booking is cancelled. You can’t undo this action.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep booking</AlertDialogCancel><AlertDialogAction onClick={() => void cancelBooking()}>Cancel booking</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
