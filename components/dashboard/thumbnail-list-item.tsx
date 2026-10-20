"use client"

import Link from "next/link"
import { EllipsisVertical } from "lucide-react"
import type { MouseEvent, ReactNode } from "react"

import { hasItemActions, ItemActionsMenu, type ItemActions } from "@/components/dashboard/item-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type ThumbnailListItemProps = {
  title: ReactNode
  subtitle?: ReactNode
  description?: ReactNode
  /** A wide media preview, normally an image or video thumbnail. */
  preview?: ReactNode
  imageUrl?: string
  imageAlt?: string
  icon?: ReactNode
  trailing?: ReactNode
  actions?: ItemActions
  menuLabel?: string
  href?: string
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  ariaLabel?: string
  /** "sm" is a smaller thumbnail, for narrow columns. */
  size?: "default" | "sm"
}

/** A media-first list item: large thumbnail, content column, then actions. */
export function ThumbnailListItem({
  title,
  subtitle,
  description,
  preview,
  imageUrl,
  imageAlt = "",
  icon,
  trailing,
  actions,
  menuLabel = "More options",
  href,
  onClick,
  ariaLabel,
  size = "default",
}: ThumbnailListItemProps) {
  const overlayClass = "absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className={cn("relative flex min-w-0 items-center rounded-xl bg-muted/50 transition-colors hover:bg-muted", size === "sm" ? "gap-3 p-2 pr-1" : "gap-3 p-3", (href || onClick) && "cursor-pointer")}>
      {href ? <Link href={href} aria-label={ariaLabel} className={overlayClass} /> : onClick ? <button type="button" onClick={onClick} aria-label={ariaLabel} className={overlayClass} /> : null}
      <div className={cn("pointer-events-none relative flex aspect-[4/3] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-border", size === "sm" ? "w-16 [&_svg]:size-6" : "w-28 sm:w-32")}>
        {preview ?? (imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={imageAlt} loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : icon)}
      </div>
      <div className="pointer-events-none relative min-w-0 flex-1">
        {/* div, not p: the dashboard-body rule forces p to inherit its font size. */}
        <div className={cn("text-sm font-medium text-foreground", size === "sm" ? "truncate" : "line-clamp-2")}>{title}</div>
        {subtitle !== undefined && <div className={size === "sm" ? "surface-caption mt-0.5 truncate" : "mt-1 line-clamp-2 text-sm text-muted-foreground"}>{subtitle}</div>}
        {description !== undefined && <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{description}</div>}
      </div>
      {trailing !== undefined && <div className="relative shrink-0">{trailing}</div>}
      {hasItemActions(actions) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={menuLabel} title={menuLabel} className="relative z-10 flex size-8 shrink-0 [&_svg]:size-4 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring">
              <EllipsisVertical className="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end"><ItemActionsMenu actions={actions} /></DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
