"use client"

import { CheckAvatar, MobileListRow, shortListDate } from "@/components/dashboard/compact-list-row"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
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
  read?: boolean
  /** Short body snippet, shown on the mobile row. */
  preview?: string
}


/** Mobile mail row and the shared dashboard card on wider screens. */
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
  deleteLabel,
  deleteText = "Delete",
  ariaLabel,
  selectable = false,
  selectionMode = false,
  checked = false,
  onCheckedChange,
  unread = false,
  read = false,
  preview,
}: EmailListRowProps) {
  const canSelect = selectable && Boolean(onCheckedChange)
  const mobileRow = (
    <MobileListRow
      className={read ? "bg-muted" : undefined}
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
    <div className={cn("hidden sm:block", read && "bg-muted")}>
      <MobileDataCard
        surface="list"
        variant="inline"
        iconShape="circle"
        title={<span className={unread ? "font-semibold" : undefined}>{title}</span>}
        subtitle={<span className={unread ? "font-semibold text-foreground" : undefined}>{subject || "(No subject)"}</span>}
        description={preview}
        icon={<span className={cn("flex size-8 items-center justify-center rounded-full text-sm font-semibold", avatarTone)} aria-hidden="true">{avatarInitials.slice(0, 1)}</span>}
        trailing={date ? <time dateTime={date}>{shortListDate(date)}</time> : formattedDate || "No date"}
        selected={selected || checked}
        pressed={checked}
        onClick={() => selectionMode && onCheckedChange ? onCheckedChange(!checked) : onOpen()}
        ariaLabel={unread ? `Unread. ${ariaLabel}` : ariaLabel}
        menuLabel={`Options for ${subject || title}`}
        menu={canSelect || onDelete ? <>
          {canSelect && <DropdownMenuItem onSelect={() => onCheckedChange?.(!checked)}>{checked ? "Deselect" : "Select"}</DropdownMenuItem>}
          {onDelete && <DropdownMenuItem variant="destructive" onSelect={onDelete} aria-label={deleteLabel}>{deleteText}</DropdownMenuItem>}
        </> : undefined}
      />
    </div>
    </>
  )
}
