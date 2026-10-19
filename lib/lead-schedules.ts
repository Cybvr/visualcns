/** Shared by the Schedules page and lib/server/lead-schedules.ts. */

export const SCHEDULE_FREQUENCIES = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Once a week" },
] as const

export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number]["value"]

export const MAX_LEADS_PER_RUN = 20

export type ScheduleRunSummary = { at: string; found: number; added: number; drafted: number; error?: string }

/** A saved Google Maps search that adds new businesses to Leads and drafts a first email to each. */
export type LeadSchedule = {
  id: string
  agencyId: string
  createdBy: string
  name: string
  /** What you'd type into Google Maps, e.g. "dental clinics in Lekki, Lagos". */
  query: string
  /** What the agency offers and how the email should read. */
  pitch: string
  frequency: ScheduleFrequency
  /** New leads per run. */
  limit: number
  active: boolean
  lastRunAt: string
  lastRun: ScheduleRunSummary | null
  createdAt: string
  updatedAt: string
}

export type ScheduleDraft = {
  id: string
  agencyId: string
  scheduleId: string
  scheduleName: string
  leadId: string
  to: string
  company: string
  website: string
  subject: string
  /** Plain text, paragraphs split by blank lines. */
  body: string
  status: "pending" | "sent" | "discarded"
  createdAt: string
}
