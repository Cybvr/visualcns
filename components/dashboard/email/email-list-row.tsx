"use client"

import { EllipsisVertical } from "lucide-react"

import { CheckAvatar, MobileListRow, shortListDate } from "@/components/dashboard/compact-list-row"
import { hasItemActions, ItemActionsMenu } from "@/components/dashboard/item-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  const actions = {
    noun: "email",
    name: subject || title,
    extra: canSelect || onDelete ? <>
      {canSelect && <DropdownMenuItem onSelect={() => onCheckedChange?.(!checked)}>{checked ? "Deselect" : "Select"}</DropdownMenuItem>}
      {canSelect && onDelete && <DropdownMenuSeparator />}
      {onDelete && <DropdownMenuItem variant="destructive" onSelect={onDelete} aria-label={deleteLabel}>{deleteText}</DropdownMenuItem>}
    </> : undefined,
  }
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
    <div className={cn("relative hidden min-w-0 items-center gap-3 border-b border-border px-4 py-3 sm:flex", (selected || checked || read) && "bg-muted")}> 
      <button type="button" onClick={() => selectionMode && onCheckedChange ? onCheckedChange(!checked) : onOpen()} aria-label={unread ? `Unread. ${ariaLabel}` : ariaLabel} aria-pressed={checked} className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      {canSelect && (
        <input
          type="checkbox"
          checked={checked}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onCheckedChange?.(event.target.checked)}
          aria-label={`${checked ? "Deselect" : "Select"} ${subject || title}`}
          className="relative z-10 size-4 shrink-0 accent-primary"
        />
      )}
      <span className={cn("pointer-events-none relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold", avatarTone)} aria-hidden="true">{avatarInitials.slice(0, 1)}</span>
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-baseline gap-3">
        <p className={cn("w-40 shrink-0 truncate text-sm text-foreground", unread && "font-semibold")}>{title}</p>
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground"><span className={cn("text-foreground", unread && "font-semibold")}>{subject || "(No subject)"}</span>{preview && <><span> — </span>{preview}</>}</p>
      </div>
      <time dateTime={date ?? undefined} className={cn("relative z-10 w-24 shrink-0 text-right text-xs font-semibold tabular-nums", unread ? "text-foreground" : "text-muted-foreground")}>{date ? shortListDate(date) : formattedDate || "No date"}</time>
      {hasItemActions(actions) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Options for ${subject || title}`} title={`Options for ${subject || title}`} className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              <EllipsisVertical className="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end"><ItemActionsMenu actions={actions} /></DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
    </>
  )
}
