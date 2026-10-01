import { randomUUID } from "node:crypto"

import { getAgencySecret } from "@/lib/server/agency-secrets"
import { googleAccessTokenForAgency } from "@/lib/server/google-gmail"
import type { CalendarBooking } from "@/lib/calendar-bookings"

const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

type GoogleCalendarEvent = {
  id?: string
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>
    createRequest?: { status?: { statusCode?: string } }
  }
}

export async function hasGoogleCalendarConnection(agencyId: string) {
  if (await getAgencySecret(agencyId, "GOOGLE_CALENDAR_CONNECTED", "") !== "true") return false
  try {
    return Boolean(await googleAccessTokenForAgency(agencyId))
  } catch {
    return false
  }
}

function meetUrl(event: GoogleCalendarEvent) {
  return event.hangoutLink || event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri || ""
}

async function calendarRequest<T>(agencyId: string, path: string, init: RequestInit): Promise<T> {
  const token = await googleAccessTokenForAgency(agencyId)
  if (!token) throw new Error("Google is not connected.")
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  })
  const result = await response.json().catch(() => ({})) as T & { error?: { message?: string } }
  if (!response.ok) throw new Error(result.error?.message || `Google Calendar request failed (${response.status}).`)
  return result
}

export async function saveGoogleBookingEvent(agencyId: string, booking: CalendarBooking, eventId?: string) {
  if (!await hasGoogleCalendarConnection(agencyId)) return null

  const start = new Date(booking.startsAt)
  const end = new Date(start.getTime() + booking.durationMinutes * 60_000)
  const body: Record<string, unknown> = {
    summary: `${booking.title} · ${booking.companyName}`,
    description: [
      `Company: ${booking.companyName}`,
      booking.projectName ? `Project: ${booking.projectName}` : "",
      "Scheduled in VisualCNS.",
    ].filter(Boolean).join("\n"),
    start: { dateTime: start.toISOString(), timeZone: booking.timeZone },
    end: { dateTime: end.toISOString(), timeZone: booking.timeZone },
    ...(booking.location ? { location: booking.location } : {}),
  }

  if (!eventId && !booking.meetingUrl) {
    body.conferenceData = {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    }
  }

  const path = eventId
    ? `/${encodeURIComponent(eventId)}?conferenceDataVersion=1`
    : "?conferenceDataVersion=1"
  let event = await calendarRequest<GoogleCalendarEvent>(agencyId, path, {
    method: eventId ? "PATCH" : "POST",
    body: JSON.stringify(body),
  })
  if (!eventId && body.conferenceData && event.id && !meetUrl(event)) {
    for (let attempt = 0; attempt < 4 && !meetUrl(event); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 750))
      event = await calendarRequest<GoogleCalendarEvent>(agencyId, `/${encodeURIComponent(event.id)}?conferenceDataVersion=1`, { method: "GET" })
    }
  }
  return { eventId: event.id || eventId || "", meetingUrl: meetUrl(event) }
}

export async function deleteGoogleBookingEvent(agencyId: string, eventId: string) {
  if (!eventId) return
  if (!await hasGoogleCalendarConnection(agencyId)) throw new Error("Reconnect Google Calendar to remove this booking from the calendar.")
  await calendarRequest<Record<string, never>>(agencyId, `/${encodeURIComponent(eventId)}`, { method: "DELETE" })
}
