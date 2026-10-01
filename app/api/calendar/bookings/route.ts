import { NextRequest, NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { requireAgencyId } from "@/lib/require-agency-id"
import type { CalendarBooking } from "@/lib/calendar-bookings"
import { deleteGoogleBookingEvent, saveGoogleBookingEvent } from "@/lib/server/google-calendar"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

class Refused extends Error {
  status: number
  constructor(message: string, status = 403) {
    super(message)
    this.status = status
  }
}

type Caller = { uid: string; data: Record<string, unknown>; agencyId: string; db: ReturnType<typeof adminServices>["db"] }
type Input = {
  id?: unknown
  companyId?: unknown
  projectId?: unknown
  title?: unknown
  startsAt?: unknown
  durationMinutes?: unknown
  timeZone?: unknown
  location?: unknown
  meetingUrl?: unknown
  staffNotes?: unknown
  status?: unknown
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

function failure(error: unknown) {
  if (error instanceof Refused) return json({ error: error.message }, error.status)
  console.error("Calendar bookings failed", error)
  return json({ error: "Bookings couldn’t be loaded. Try again." }, 500)
}

async function getCaller(request: NextRequest): Promise<Caller> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Refused("Please sign in again.", 401)
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) throw new Refused("Please sign in again.", 401)
  const snapshot = await db.collection("users").doc(decoded.uid).get()
  if (!snapshot.exists) throw new Refused("Your account is not set up yet.", 403)
  const data = snapshot.data() || {}
  let agencyId = ""
  try { agencyId = requireAgencyId(data) } catch { throw new Refused("Your account has no agency assigned.", 403) }
  return { uid: decoded.uid, data, agencyId, db }
}

function isStaff(caller: Caller) {
  return caller.data.role === "admin" || caller.data.role === "superadmin"
}

async function companyFor(caller: Caller, companyId: string) {
  if (!companyId) throw new Refused("Choose a company.", 400)
  const snapshot = await caller.db.collection("organizations").doc(companyId).get()
  const company = snapshot.data()
  if (!snapshot.exists || company?.agencyId !== caller.agencyId) throw new Refused("That company couldn’t be found.", 404)
  if (!isStaff(caller)) {
    const memberships = [caller.data.companyId, ...(Array.isArray(caller.data.companyIds) ? caller.data.companyIds : [])]
    if (!memberships.includes(companyId)) throw new Refused("You can’t view bookings for this company.", 403)
  }
  return company
}

async function serialize(snapshot: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot, includeStaffNotes: boolean, includeProviderDetails = false): Promise<CalendarBooking> {
  const data = snapshot.data() || {}
  const { staffNotes, googleCalendarEventId, googleCalendarId, ...publicData } = data
  return {
    ...publicData,
    id: snapshot.id,
    ...(includeStaffNotes && typeof staffNotes === "string" ? { staffNotes } : {}),
    ...(includeProviderDetails ? { googleCalendarEventId, googleCalendarId } : {}),
  } as CalendarBooking
}

async function validateStaffBooking(caller: Caller, input: Input, current?: CalendarBooking): Promise<Omit<CalendarBooking, "id">> {
  const companyId = clean(input.companyId, 160) || current?.companyId || ""
  const company = await companyFor(caller, companyId)
  const title = clean(input.title, 140) || current?.title || ""
  const startsAtValue = clean(input.startsAt, 80) || current?.startsAt || ""
  const startsAtDate = new Date(startsAtValue)
  const durationMinutes = Number(input.durationMinutes ?? current?.durationMinutes)
  const timeZone = clean(input.timeZone, 80) || current?.timeZone || "Africa/Lagos"
  if (!title) throw new Refused("Add a booking title.", 400)
  if (!startsAtValue || Number.isNaN(startsAtDate.getTime())) throw new Refused("Choose a valid date and time.", 400)
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) throw new Refused("Duration must be between 15 minutes and 8 hours.", 400)
  try { new Intl.DateTimeFormat("en", { timeZone }) } catch { throw new Refused("Choose a valid time zone.", 400) }

  const projectId = input.projectId === undefined ? current?.projectId || "" : clean(input.projectId, 160)
  let projectName = ""
  if (projectId) {
    const projectSnapshot = await caller.db.collection("projects").doc(projectId).get()
    const project = projectSnapshot.data()
    if (!projectSnapshot.exists || project?.agencyId !== caller.agencyId || project.companyId !== companyId) {
      throw new Refused("Choose a project belonging to this company.", 400)
    }
    projectName = String(project.title || "")
  }

  const meetingUrl = clean(input.meetingUrl, 500)
  if (meetingUrl) {
    try {
      const url = new URL(meetingUrl)
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error()
    } catch { throw new Refused("Enter a valid meeting link.", 400) }
  }
  const now = new Date().toISOString()
  return {
    agencyId: caller.agencyId,
    companyId,
    companyName: String(company.name || caller.data.company || "Company"),
    projectId: projectId || "",
    projectName: projectName || "",
    title,
    startsAt: startsAtDate.toISOString(),
    durationMinutes,
    timeZone,
    location: input.location === undefined ? current?.location || "" : clean(input.location, 200),
    meetingUrl: input.meetingUrl === undefined ? current?.meetingUrl || "" : meetingUrl,
    staffNotes: input.staffNotes === undefined ? current?.staffNotes || "" : clean(input.staffNotes, 2000),
    status: input.status === "completed" ? "completed" : "scheduled",
    createdBy: current?.createdBy || caller.uid,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  }
}

export async function GET(request: NextRequest) {
  try {
    const caller = await getCaller(request)
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || ""
    const staff = isStaff(caller)
    if (!staff && !companyId) throw new Refused("Choose a company.", 400)
    if (companyId) await companyFor(caller, companyId)

    const query = companyId
      ? caller.db.collection("calendarBookings").where("companyId", "==", companyId)
      : caller.db.collection("calendarBookings").where("agencyId", "==", caller.agencyId)
    const snapshot = await query.get()
    const matchingDocs = snapshot.docs.filter((item) => {
      const data = item.data()
      return data.agencyId === caller.agencyId && (!companyId || data.companyId === companyId)
    })
    const bookings = await Promise.all(matchingDocs.map((item) => serialize(item, staff)))
    bookings.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    return json({ bookings })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const caller = await getCaller(request)
    if (!isStaff(caller)) throw new Refused("Only staff can create bookings.")
    const input = (await request.json().catch(() => ({}))) as Input
    const booking = await validateStaffBooking(caller, input)
    const ref = await caller.db.collection("calendarBookings").add(booking)
    let savedBooking: CalendarBooking = { ...booking, id: ref.id }
    let warning = ""
    try {
      const event = await saveGoogleBookingEvent(caller.agencyId, savedBooking)
      if (event) {
        const providerFields = {
          googleCalendarEventId: event.eventId,
          googleCalendarId: "primary",
          ...(!savedBooking.meetingUrl && event.meetingUrl ? { meetingUrl: event.meetingUrl } : {}),
        }
        await ref.update(providerFields)
        savedBooking = { ...savedBooking, ...providerFields }
        if (!savedBooking.meetingUrl) warning = "The booking was saved, but Google hasn’t returned its Meet link yet."
      } else if (!savedBooking.meetingUrl) {
        warning = "The booking was saved. Reconnect Google in Settings → Integrations to add Meet links automatically."
      }
    } catch (error) {
      console.error("Google Calendar booking sync failed", error)
      warning = "The booking was saved, but Google Calendar couldn’t create its event. Check Settings → Integrations."
    }
    return json({ booking: savedBooking, ...(warning ? { warning } : {}) })
  } catch (error) {
    return failure(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const caller = await getCaller(request)
    const input = (await request.json().catch(() => ({}))) as Input
    const id = clean(input.id, 160)
    if (!id) throw new Refused("Choose a booking.", 400)
    const ref = caller.db.collection("calendarBookings").doc(id)
    const snapshot = await ref.get()
    const current = snapshot.exists ? await serialize(snapshot, true, true) : null
    if (!current || current.agencyId !== caller.agencyId) throw new Refused("That booking couldn’t be found.", 404)

    if (!isStaff(caller)) {
      if (input.status !== "cancelled") throw new Refused("Companies can only cancel bookings.", 403)
      await companyFor(caller, current.companyId)
      if (current.status !== "scheduled" || Date.parse(current.startsAt) <= Date.now()) {
        throw new Refused("Only upcoming bookings can be cancelled.", 409)
      }
      const cancelledAt = new Date().toISOString()
      await ref.update({ status: "cancelled", cancelledAt, updatedAt: cancelledAt })
      let warning = ""
      try { await deleteGoogleBookingEvent(caller.agencyId, current.googleCalendarEventId || "") } catch (error) {
        console.error("Google Calendar booking cancellation failed", error)
        warning = "The booking was cancelled here, but its Google Calendar event could not be removed."
      }
      return json({ booking: { ...current, status: "cancelled", cancelledAt, updatedAt: cancelledAt, staffNotes: undefined }, ...(warning ? { warning } : {}) })
    }

    const booking = await validateStaffBooking(caller, input, current)
    const status = input.status === "cancelled" ? "cancelled" : booking.status
    const patch = { ...booking, status, ...(status === "cancelled" ? { cancelledAt: new Date().toISOString() } : { cancelledAt: "" }) }
    await ref.update(patch)
    let savedBooking: CalendarBooking = { ...current, ...patch, id }
    let warning = ""
    if (status === "cancelled") {
      try { await deleteGoogleBookingEvent(caller.agencyId, current.googleCalendarEventId || "") } catch (error) {
        console.error("Google Calendar booking cancellation failed", error)
        warning = "The booking was cancelled here, but its Google Calendar event could not be removed."
      }
    } else {
      try {
        const event = await saveGoogleBookingEvent(caller.agencyId, savedBooking, current.googleCalendarEventId)
        if (event) {
          const providerFields = {
            googleCalendarEventId: event.eventId,
            googleCalendarId: "primary",
            ...(!savedBooking.meetingUrl && event.meetingUrl ? { meetingUrl: event.meetingUrl } : {}),
          }
          await ref.update(providerFields)
          savedBooking = { ...savedBooking, ...providerFields }
          if (!savedBooking.meetingUrl) warning = "The booking was saved, but Google hasn’t returned its Meet link yet."
        } else if (!savedBooking.meetingUrl && !current.googleCalendarEventId) {
          warning = "The booking was saved. Reconnect Google in Settings → Integrations to add Meet links automatically."
        }
      } catch (error) {
        console.error("Google Calendar booking sync failed", error)
        warning = "The booking was saved, but Google Calendar couldn’t update its event. Check Settings → Integrations."
      }
    }
    return json({ booking: savedBooking, ...(warning ? { warning } : {}) })
  } catch (error) {
    return failure(error)
  }
}
