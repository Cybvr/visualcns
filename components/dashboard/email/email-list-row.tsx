"use client"

import { CheckAvatar, CompactListRow, MobileListRow, shortListDate } from "@/components/dashboard/compact-list-row"
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
    <MobileListRow
      avatar={checked ? (
        <CheckAvatar />
      ) : (
        <span className={cn("flex size-12 items-center justify-center rounded-full text-lg font-semibold", avatarTone)}>{avatarInitials.slice(0, 1)}</span>
      )}
      onAvatarClick={canSelect ? () => onCheckedChange?.(!checked) : undefined}
      avatarPressed={canSelect ? checked : undefined}
      avatarLabel={`${checked ? "Deselect" : "Select"} ${subject || title}`}
      title={title}
      titleClassName={unread ? "font-bold" : "font-normal"}
      meta={date ? <time dateTime={date}>{shortListDate(date)}</time> : undefined}
      metaClassName={unread ? "font-semibold text-primary" : undefined}
      lines={[subject || "(No subject)", preview]}
      lineClassNames={[unread ? "font-semibold text-foreground" : "text-foreground/90"]}
      active={selected || checked}
      onClick={() => selectionMode && onCheckedChange ? onCheckedChange(!checked) : onOpen()}
      ariaLabel={unread ? `Unread. ${ariaLabel}` : ariaLabel}
    />
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
      className="px-2"
      mobile={false}
    />
    </>
  )
}
