import type { Invoice } from "./billing"
import { formatMoney } from "./money"
import { invoiceBalance } from "./portal-model"

// Shared by the invoice editor (manual reminders) and the daily job (automatic
// ones), so both say the same thing. No Firebase imports: this runs on the server too.

const DAY = 24 * 60 * 60 * 1000

/** Automatic reminders: a few days before, on the due date, then a week and two weeks late. */
export type ReminderStage = "before" | "due" | "after-7" | "after-14"

/** Today as YYYY-MM-DD in UTC, matching how due dates are stored. */
export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Whole days from today to the due date: 3 means due in three days, -7 means a week late. */
export function daysUntilDue(dueOn: string, today = todayIso()): number | null {
  const due = Date.parse(`${dueOn}T00:00:00Z`)
  const now = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(due) || Number.isNaN(now)) return null
  return Math.round((due - now) / DAY)
}

/** Still owed and already with the client. */
export function invoiceIsOpen(invoice: Invoice): boolean {
  return (invoice.status === "sent" || invoice.status === "overdue") && invoiceBalance(invoice) > 0
}

/**
 * Which automatic reminder is due today, if any. Each stage covers a window so a
 * missed day still sends it, and only the current stage is sent, never a backlog.
 */
export function reminderStageFor(invoice: Invoice, today = todayIso()): ReminderStage | null {
  if (!invoiceIsOpen(invoice) || !invoice.dueOn) return null
  const days = daysUntilDue(invoice.dueOn, today)
  if (days === null || days > 3) return null
  if (days > 0) return "before"
  if (days > -7) return "due"
  if (days > -14) return "after-7"
  return "after-14"
}

function readableDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

export function reminderSubject(invoice: Invoice, today = todayIso()): string {
  const days = invoice.dueOn ? daysUntilDue(invoice.dueOn, today) : null
  const number = invoice.invoiceNumber || "your invoice"
  if (days === null) return `Reminder: Invoice ${number}`
  if (days < 0) return `Reminder: Invoice ${number} is overdue`
  if (days === 0) return `Reminder: Invoice ${number} is due today`
  return `Reminder: Invoice ${number} is due ${readableDate(invoice.dueOn)}`
}

export function reminderBody(invoice: Invoice, today = todayIso()): string {
  const name = invoice.billTo?.name?.trim() || "there"
  const number = invoice.invoiceNumber || "your invoice"
  const owed = formatMoney(invoiceBalance(invoice), invoice.currency)
  const days = invoice.dueOn ? daysUntilDue(invoice.dueOn, today) : null
  const when = days === null
    ? ""
    : days < 0
      ? ` was due on ${readableDate(invoice.dueOn)}`
      : days === 0
        ? " is due today"
        : ` is due on ${readableDate(invoice.dueOn)}`
  return `Hi ${name},\n\nThis is a friendly reminder that invoice ${number} for ${owed}${when}. You can view and pay it using the button below.\n\nIf you've already paid, thank you, and please ignore this email.\n\nBest regards`
}
