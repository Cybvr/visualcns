"use client"

import Link from "next/link"
import { EllipsisVertical } from "lucide-react"
import type { ReactNode } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type CompactListRowProps = {
  title: ReactNode
  subtitle?: ReactNode
  mobileSubtitle?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  menu?: ReactNode
  menuLabel?: string
  active?: boolean
  href?: string
  onClick?: () => void
  ariaLabel?: string
  className?: string
}

/** The same quiet, two-line list row for desktop panes and narrow screens. */
export function CompactListRow({ title, subtitle, mobileSubtitle, leading, trailing, menu, menuLabel = "More options", active, href, onClick, ariaLabel, className }: CompactListRowProps) {
  const content = (
    <>
      <span className={cn("sidebar-nav-label block truncate font-medium text-sidebar-foreground/70", active && "text-sidebar-accent-foreground")}>{title}</span>
      {mobileSubtitle !== undefined ? (
        <>
          <span className="block truncate text-[11px] font-normal leading-tight text-muted-foreground sm:hidden">{mobileSubtitle}</span>
          {subtitle !== undefined && <span className="hidden truncate text-[11px] font-normal leading-tight text-muted-foreground sm:block">{subtitle}</span>}
        </>
      ) : subtitle !== undefined && <span className="block truncate text-[11px] font-normal leading-tight text-muted-foreground">{subtitle}</span>}
    </>
  )

  return (
    <div className={cn("flex min-h-12 items-center gap-2 border-b border-border/60 px-1 py-2 transition-colors hover:bg-muted/50", active && "bg-muted/50", className)}>
      {leading && <div className="shrink-0">{leading}</div>}
      {href ? (
        <Link href={href} aria-label={ariaLabel} aria-current={active ? "true" : undefined} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} aria-label={ariaLabel} aria-current={active ? "true" : undefined} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</button>
      ) : (
        <div className="min-w-0 flex-1">{content}</div>
      )}
      {trailing && <div className="shrink-0">{trailing}</div>}
      {menu && <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={menuLabel} title={menuLabel} className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <EllipsisVertical className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
      </DropdownMenu>}
    </div>
  )
}

/** Data-only placeholder with the same spacing as CompactListRow. */
export function CompactListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading list" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex min-h-[60px] items-center gap-2 border-b border-border/60 px-1 py-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-[min(70%,15rem)]" />
            <Skeleton className="h-3 w-[min(40%,7rem)]" />
          </div>
          <Skeleton className="size-11 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  )
}
