export type CalendarBookingStatus = "scheduled" | "cancelled" | "completed"

export type CalendarBooking = {
  id: string
  agencyId: string
  companyId: string
  companyName: string
  projectId?: string
  projectName?: string
  title: string
  startsAt: string
  durationMinutes: number
  timeZone: string
  location?: string
  meetingUrl?: string
  /** Google Calendar event used to keep the booking and Meet link in sync. */
  googleCalendarEventId?: string
  googleCalendarId?: string
  /** Only staff receive this field from the API. */
  staffNotes?: string
  status: CalendarBookingStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  cancelledAt?: string
}

export function bookingEnd(booking: CalendarBooking) {
  return new Date(new Date(booking.startsAt).getTime() + booking.durationMinutes * 60_000)
}

export function bookingTime(booking: CalendarBooking, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: booking.timeZone,
    ...options,
  }).format(new Date(booking.startsAt))
}
