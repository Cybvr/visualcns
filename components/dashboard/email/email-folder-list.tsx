import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const MOBILE_LIST_CARD = "max-sm:overflow-hidden max-sm:rounded-2xl max-sm:border max-sm:border-border max-sm:bg-card max-sm:[&>[data-mobile-row]~[data-mobile-row]]:border-t max-sm:[&>[data-mobile-row]~[data-mobile-row]]:border-border"

/** A folder's list as the Inbox shows it: the bar with select-all, count and actions, then the empty message or the rows. */
export function EmailFolderList({
  label,
  selectedCount = 0,
  allChecked,
  onToggleAll,
  selectAllLabel,
  actions,
  empty,
  children,
}: {
  /** What the bar says when nothing is ticked, such as "3 unread" or "12 sent". */
  label: string
  selectedCount?: number
  allChecked?: boolean
  /** Leave out for a folder whose rows can't be ticked. */
  onToggleAll?: (checked: boolean) => void
  selectAllLabel?: string
  actions?: ReactNode
  /** Shown in place of the rows when there are none to show. */
  empty?: ReactNode
  children?: ReactNode
}) {
  return (
    <>
      <div className={cn("flex min-h-12 items-center gap-1 border-b border-border px-2 py-1.5", onToggleAll && selectedCount === 0 && "max-sm:hidden")}>
        {onToggleAll && (
          <input
            type="checkbox"
            checked={Boolean(allChecked)}
            onChange={(event) => onToggleAll(event.target.checked)}
            aria-label={selectAllLabel}
            className={cn("ml-1 size-4 shrink-0 accent-primary", selectedCount === 0 && "max-sm:hidden")}
          />
        )}
        <span className="mr-auto px-2 text-xs text-muted-foreground">{selectedCount > 0 ? `${selectedCount} selected` : label}</span>
        {actions}
      </div>
      {empty ?? <div className={MOBILE_LIST_CARD}>{children}</div>}
    </>
  )
}

/** The message a folder shows when it has nothing in it, or nothing matches the search. */
export function EmailFolderEmpty({ icon, title, text }: { icon?: ReactNode; title: string; text?: string }) {
  if (!icon) return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{title}</div>
  return (
    <div className="px-4 py-10 text-center">
      {icon}
      <p className="mt-3 text-sm font-medium">{title}</p>
      {text && <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>}
    </div>
  )
}
