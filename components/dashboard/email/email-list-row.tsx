"use client"

import { Check } from "lucide-react"

import { CompactListRow } from "@/components/dashboard/compact-list-row"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type EmailListRowProps = {
  title: string
  subject: string
  date?: string | null
  formattedDate?: string
  avatarInitials: string
  avatarTone: string
  selected?: boolean
  onOpen: () => void
  onDelete?: () => void
  deleteLabel: string
  deleteText?: string
  ariaLabel: string
  compact?: boolean
  selectable?: boolean
  selectionMode?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  unread?: boolean
  /** Short body snippet, shown on the mobile row. */
  preview?: string
}

/** Today shows the time, this week the weekday, older the day and month. */
function shortListDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date)
  }
  if (now.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000 && date < now) {
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date)
  }
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(date)
}

export function EmailListHeader({ primaryLabel, dateLabel, selectable = false }: {
  primaryLabel: string
  dateLabel: string
  compact?: boolean
  selectable?: boolean
}) {
  return (
    <div className="surface-table-header hidden h-10 items-center gap-3 border-b border-border px-2 sm:flex">
      {selectable && <span className="size-4 shrink-0" aria-hidden="true" />}
      <span className="min-w-0 flex-1">Subject</span>
      <span className="shrink-0">{primaryLabel} · {dateLabel}</span>
      <span className="w-11 shrink-0" aria-hidden="true" />
    </div>
  )
}

/** Shared list treatment for inbox, sent, drafts, templates and other dashboard lists. */
export function EmailListRow({
  title,
  subject,
  date,
  formattedDate,
  avatarInitials,
  avatarTone,
  selected,
  onOpen,
  onDelete,
  deleteText = "Delete",
  ariaLabel,
  selectable = false,
  selectionMode = false,
  checked = false,
  onCheckedChange,
  unread = false,
  preview,
}: EmailListRowProps) {
  const selectionControl = selectable && onCheckedChange ? (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
      aria-label={`Select ${subject || title}`}
      className={cn("size-4 shrink-0 accent-primary", !selectionMode && "max-sm:hidden")}
    />
  ) : undefined

  const canSelect = selectable && Boolean(onCheckedChange)
  const mobileRow = (
    <div data-mobile-row className={cn("flex items-start gap-3 px-4 py-4 sm:hidden", (selected || checked) && "bg-muted/60")}>
      <button
        type="button"
        onClick={() => canSelect && onCheckedChange?.(!checked)}
        aria-label={canSelect ? `${checked ? "Deselect" : "Select"} ${subject || title}` : undefined}
        aria-pressed={canSelect ? checked : undefined}
        tabIndex={canSelect ? 0 : -1}
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
          checked ? "bg-primary text-primary-foreground" : avatarTone,
        )}
      >
        {checked ? <Check className="size-5" aria-hidden="true" /> : avatarInitials.slice(0, 1)}
      </button>
      <button
        type="button"
        onClick={() => selectionMode && onCheckedChange ? onCheckedChange(!checked) : onOpen()}
        aria-label={unread ? `Unread. ${ariaLabel}` : ariaLabel}
        className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-base", unread ? "font-bold text-foreground" : "text-foreground")}>{title}</span>
          {date && (
            <time dateTime={date} className={cn("shrink-0 text-xs tabular-nums", unread ? "font-semibold text-primary" : "text-muted-foreground")}>
              {shortListDate(date)}
            </time>
          )}
        </span>
        <span className={cn("mt-0.5 block truncate text-sm", unread ? "font-semibold text-foreground" : "text-foreground/90")}>{subject || "(No subject)"}</span>
        {preview && <span className="mt-0.5 block truncate text-sm text-muted-foreground">{preview}</span>}
      </button>
    </div>
  )

  return (
    <>
    {mobileRow}
    <CompactListRow
      title={<span className={unread ? "font-bold text-foreground" : undefined}>{subject || "(No subject)"}</span>}
      subtitle={`${title} · ${formattedDate || "No date"}`}
      mobileSubtitle={date && formattedDate ? <time dateTime={date}>{formattedDate}</time> : "No date"}
      active={selected}
      leading={selectionControl}
      onClick={() => selectionMode && onCheckedChange ? onCheckedChange(!checked) : onOpen()}
      ariaLabel={unread ? `Unread. ${ariaLabel}` : ariaLabel}
      menuLabel={`Options for ${subject || title}`}
      menu={onDelete ? <DropdownMenuItem variant="destructive" onSelect={onDelete}>{deleteText}</DropdownMenuItem> : undefined}
      className="px-2 max-sm:hidden"
    />
    </>
  )
}
