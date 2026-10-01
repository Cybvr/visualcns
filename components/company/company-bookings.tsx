"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarDays, MapPin, Video } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { bookingTime, type CalendarBooking } from "@/lib/calendar-bookings"

function readableDate(booking: CalendarBooking) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: booking.timeZone,
  }).format(new Date(booking.startsAt))
}

export function CompanyBookings({ companyId, canCancel = false }: { companyId: string; canCancel?: boolean }) {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState<CalendarBooking | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/calendar/bookings?companyId=${encodeURIComponent(companyId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Bookings couldn’t be loaded.")
      const upcoming = (Array.isArray(result.bookings) ? result.bookings : [])
        .filter((booking: CalendarBooking) => booking.status === "scheduled" && Date.parse(booking.startsAt) > Date.now())
      setBookings(upcoming)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bookings couldn’t be loaded.")
    } finally {
      setLoading(false)
    }
  }, [companyId, user])

  useEffect(() => { void load() }, [load])

  async function cancelBooking() {
    if (!user || !cancelTarget || cancelling) return
    setCancelling(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/calendar/bookings", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: cancelTarget.id, status: "cancelled" }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "The booking couldn’t be cancelled.")
      setBookings((current) => current.filter((booking) => booking.id !== cancelTarget.id))
      toast.success("Booking cancelled")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The booking couldn’t be cancelled.")
    } finally {
      setCancelling(false)
      setCancelTarget(null)
    }
  }

  if (!loading && bookings.length === 0) return null

  return (
    <section className="mb-8 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-semibold">Upcoming bookings</h2>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading bookings…</p>
      ) : (
        <ul className="divide-y divide-border">
          {bookings.map((booking) => (
            <li key={booking.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-1 last:pb-1">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{booking.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {readableDate(booking)} · {bookingTime(booking)} · {booking.durationMinutes} min
                  {booking.projectName ? ` · ${booking.projectName}` : ""}
                </p>
                {(booking.location || booking.meetingUrl) && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {booking.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{booking.location}</span>}
                    {booking.meetingUrl && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={booking.meetingUrl} target="_blank" rel="noreferrer"><Video className="size-3.5" />Join</a>}
                  </p>
                )}
              </div>
              {canCancel && <Button variant="outline" size="sm" onClick={() => setCancelTarget(booking)}>Cancel</Button>}
            </li>
          ))}
        </ul>
      )}
      <AlertDialog open={cancelTarget !== null} onOpenChange={(open) => !open && !cancelling && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>{cancelTarget?.title} will be cancelled for your company.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep booking</AlertDialogCancel>
            <AlertDialogAction disabled={cancelling} onClick={(event) => { event.preventDefault(); void cancelBooking() }}>{cancelling ? "Cancelling…" : "Cancel booking"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
