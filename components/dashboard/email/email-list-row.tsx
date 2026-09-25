"use client"

import { Trash2 } from "lucide-react"

import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  ariaLabel: string
  compact?: boolean
}

export function EmailListHeader({
  primaryLabel,
  dateLabel,
  compact = false,
}: {
  primaryLabel: string
  dateLabel: string
  compact?: boolean
}) {
  return (
    <div className="surface-table-header hidden h-10 items-center gap-3 border-b border-border px-2 sm:flex">
      <span className="size-8 shrink-0" aria-hidden="true" />
      {compact ? (
        <span className="min-w-0 flex-1">{primaryLabel}</span>
      ) : (
        <>
          <span className="w-[34%] shrink-0">{primaryLabel}</span>
          <span className="min-w-0 flex-1">Subject</span>
          <span className="w-24 shrink-0 text-right">{dateLabel}</span>
        </>
      )}
      <span className="w-8 shrink-0 text-right"><span className="sr-only">Actions</span></span>
    </div>
  )
}

// One compact row shape shared by inbox, sent, drafts and templates. Its density,
// avatar size and type roles mirror the dashboard's Users table.
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
  ariaLabel,
  compact = false,
}: EmailListRowProps) {
  return (
    <>
      <div className="mb-2 sm:hidden">
        <MobileDataCard
          title={title}
          subtitle={subject}
          trailing={formattedDate && date ? <time dateTime={date}>{formattedDate}</time> : undefined}
          icon={(
            <Avatar className={cn("size-9", avatarTone)} aria-hidden="true">
              <AvatarFallback className="bg-transparent font-medium">{avatarInitials}</AvatarFallback>
            </Avatar>
          )}
          selected={selected}
          onClick={onOpen}
          ariaLabel={ariaLabel}
          menuLabel={`Options for ${title}`}
          menu={onDelete ? <DropdownMenuItem variant="destructive" onSelect={onDelete}>Delete</DropdownMenuItem> : undefined}
        />
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen() } }}
        className={cn(
          "group hidden cursor-pointer items-center gap-3 border-b border-border p-2 outline-none transition-colors last:border-b-0 hover:bg-muted/50 focus-visible:bg-muted/50 sm:flex",
          selected && "bg-muted hover:bg-muted",
        )}
        aria-label={ariaLabel}
      >
        <Avatar className={cn("size-8 shrink-0", avatarTone)} aria-hidden="true">
          <AvatarFallback className="bg-transparent font-medium">{avatarInitials}</AvatarFallback>
        </Avatar>
        <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", !compact && "sm:contents")}>
          <div className={cn("flex min-w-0 items-center justify-between gap-2", !compact && "sm:w-[34%] sm:shrink-0 sm:justify-start")}>
            <span className="truncate font-medium text-foreground">{title}</span>
            {formattedDate && date ? <time dateTime={date} className={cn("shrink-0 text-muted-foreground", !compact && "sm:hidden")}>{formattedDate}</time> : null}
          </div>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{subject}</span>
        </div>
        {!compact && formattedDate && date ? <time dateTime={date} className="hidden w-24 shrink-0 text-right text-muted-foreground sm:block">{formattedDate}</time> : null}
        {onDelete ? (
          <button type="button" onClick={(event) => { event.stopPropagation(); onDelete() }} aria-label={deleteLabel} className="hidden size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 sm:inline-flex">
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        ) : <span className="hidden size-8 shrink-0 sm:block" aria-hidden="true" />}
      </div>
    </>
  )
}
