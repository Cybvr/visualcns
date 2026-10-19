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
}: ThumbnailListItemProps) {
  const overlayClass = "absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className={cn("relative flex min-w-0 items-center gap-3 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted", (href || onClick) && "cursor-pointer")}>
      {href ? <Link href={href} aria-label={ariaLabel} className={overlayClass} /> : onClick ? <button type="button" onClick={onClick} aria-label={ariaLabel} className={overlayClass} /> : null}
      <div className="pointer-events-none relative flex aspect-[4/3] w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background sm:w-32">
        {preview ?? (imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={imageAlt} loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : icon)}
      </div>
      <div className="pointer-events-none relative min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-foreground">{title}</p>
        {subtitle !== undefined && <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{subtitle}</div>}
        {description !== undefined && <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{description}</div>}
      </div>
      {trailing !== undefined && <div className="relative shrink-0">{trailing}</div>}
      {hasItemActions(actions) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={menuLabel} title={menuLabel} className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring">
              <EllipsisVertical className="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end"><ItemActionsMenu actions={actions} /></DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
