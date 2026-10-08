"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarDays, MapPin } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
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
        <div className="space-y-2">
          {bookings.map((booking) => (
            <MobileDataCard
              key={booking.id}
              surface="muted"
              icon={<CalendarDays className="size-5 text-muted-foreground" aria-hidden="true" />}
              title={booking.title}
              subtitle={`${readableDate(booking)} · ${bookingTime(booking)} · ${booking.durationMinutes} min${booking.projectName ? ` · ${booking.projectName}` : ""}`}
              description={booking.location ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{booking.location}</span> : undefined}
              menuLabel={`Actions for ${booking.title}`}
              menu={booking.meetingUrl || canCancel ? <>
                {booking.meetingUrl && <DropdownMenuItem asChild><a href={booking.meetingUrl} target="_blank" rel="noreferrer">Join meeting</a></DropdownMenuItem>}
                {canCancel && <DropdownMenuItem onSelect={() => setCancelTarget(booking)}>Cancel booking</DropdownMenuItem>}
              </> : undefined}
            />
          ))}
        </div>
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
