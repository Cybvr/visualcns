"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import type { ReactNode } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { cn } from "@/lib/utils"

type CompactListRowProps = {
  title: ReactNode
  /** Text the mobile avatar initial comes from. Defaults to the title when it is a string. */
  avatarText?: string
  /** Short text on the right of the mobile row, like a date or amount. */
  meta?: ReactNode
  /** Set false when the caller renders its own MobileListRow. */
  mobile?: boolean
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

const AVATAR_TONES = [
  "bg-cyan-200 text-cyan-950",
  "bg-sky-200 text-sky-950",
  "bg-rose-200 text-rose-950",
  "bg-slate-300 text-slate-900",
  "bg-amber-200 text-amber-950",
  "bg-emerald-200 text-emerald-950",
  "bg-violet-200 text-violet-950",
]

/** Stable colour for an avatar, picked from its text. */
export function avatarTone(value: string) {
  const total = Array.from(value).reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return AVATAR_TONES[total % AVATAR_TONES.length]
}

/**
 * Mobile: rows sit together in one rounded card. Put this on the list (ul) that holds the rows.
 * Rows render no border of their own on mobile, so the card's dividers do the separating.
 */
export const MOBILE_LIST_CARD = "max-sm:overflow-hidden max-sm:rounded-2xl max-sm:border max-sm:border-border max-sm:bg-card max-sm:divide-y max-sm:divide-border"

/**
 * Short date for the right of a mobile row: the time today, the weekday this week,
 * otherwise day and month (plus the year when it isn't this year).
 */
export function shortListDate(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === "" || value === 0) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date)
  }
  if (date < now && now.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000) {
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date)
  }
  return new Intl.DateTimeFormat(undefined, date.getFullYear() === now.getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }).format(date)
}

/** Avatar shown in place of the usual one while a row is selected. */
export function CheckAvatar() {
  return (
    <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
      <Check className="size-5" />
    </span>
  )
}

/** Round avatar showing the first letter of its text. */
export function InitialAvatar({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("flex size-12 items-center justify-center rounded-full text-lg font-semibold", avatarTone(text), className)} aria-hidden="true">
      {text.trim().charAt(0).toUpperCase() || "•"}
    </span>
  )
}

type MobileListRowProps = {
  className?: string
  avatar: ReactNode
  /** Menu opened by tapping the avatar. */
  avatarMenu?: ReactNode
  /** Or: what tapping the avatar does, like selecting the row. */
  onAvatarClick?: () => void
  avatarPressed?: boolean
  avatarLabel?: string
  title: ReactNode
  titleClassName?: string
  meta?: ReactNode
  metaClassName?: string
  /** Lines under the title; empty ones are skipped. */
  lines?: ReactNode[]
  lineClassNames?: string[]
  trailing?: ReactNode
  active?: boolean
  href?: string
  onClick?: () => void
  ariaLabel?: string
}

/** Mobile list row: avatar, title with meta on the right, then a line or two. Only shows below sm. */
export function MobileListRow({ className, avatar, avatarMenu, onAvatarClick, avatarPressed, avatarLabel = "More options", title, titleClassName, meta, metaClassName, lines = [], lineClassNames = [], trailing, active, href, onClick, ariaLabel }: MobileListRowProps) {
  const body = (
    <>
      <span className="flex items-baseline gap-2">
        <span className={cn("min-w-0 flex-1 truncate text-base font-medium text-foreground", titleClassName)}>{title}</span>
        {meta !== undefined && meta !== null && <span className={cn("shrink-0 text-xs tabular-nums text-muted-foreground", metaClassName)}>{meta}</span>}
      </span>
      {lines.map((line, index) => line !== undefined && line !== null && line !== "" && (
        <span key={index} className={cn("mt-0.5 block truncate text-sm text-muted-foreground", lineClassNames[index])}>{line}</span>
      ))}
    </>
  )
  const bodyClass = "flex min-h-12 min-w-0 flex-1 flex-col justify-center text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const avatarButtonClass = "shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div data-mobile-row className={cn("flex items-center gap-3 px-4 py-3.5 sm:hidden", className, active && "bg-muted/60")}>
      {avatarMenu ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={avatarLabel} title={avatarLabel} className={avatarButtonClass}>{avatar}</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">{avatarMenu}</DropdownMenuContent>
        </DropdownMenu>
      ) : onAvatarClick ? (
        <button type="button" onClick={onAvatarClick} aria-label={avatarLabel} aria-pressed={avatarPressed} className={avatarButtonClass}>{avatar}</button>
      ) : (
        <div className="shrink-0">{avatar}</div>
      )}
      {href ? (
        <Link href={href} aria-label={ariaLabel} aria-current={active ? "true" : undefined} className={bodyClass}>{body}</Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} aria-label={ariaLabel} aria-current={active ? "true" : undefined} className={bodyClass}>{body}</button>
      ) : (
        <div className="min-w-0 flex-1">{body}</div>
      )}
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  )
}

/** One list item: the shared data card on desktop, and the compact row on mobile. */
export function CompactListRow({ title, avatarText, meta, subtitle, mobileSubtitle, leading, trailing, menu, menuLabel = "More options", active, href, onClick, ariaLabel, className, mobile = true }: CompactListRowProps) {
  const avatarSource = avatarText ?? (typeof title === "string" ? title : "")
  const mobileRow = mobile && (
    <MobileListRow
      avatar={leading ?? <InitialAvatar text={avatarSource} />}
      avatarMenu={menu}
      avatarLabel={menuLabel}
      title={title}
      meta={meta}
      lines={[mobileSubtitle ?? subtitle]}
      trailing={trailing}
      active={active}
      href={href}
      onClick={onClick}
      ariaLabel={ariaLabel}
    />
  )

  return (
    <>
    {mobileRow}
    <div className={cn("hidden sm:mb-2 sm:block", className)}>
      <MobileDataCard
        surface="muted"
        iconShape="circle"
        icon={leading ?? <InitialAvatar text={avatarSource} className="size-11" />}
        title={title}
        subtitle={subtitle}
        trailing={trailing ?? meta}
        menu={menu}
        menuLabel={menuLabel}
        selected={active}
        href={href}
        onClick={onClick}
        ariaLabel={ariaLabel}
      />
    </div>
    </>
  )
}

/** Data-only placeholder with the same spacing as CompactListRow. */
export function CompactListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading list" aria-busy="true" className="sm:space-y-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex min-h-[60px] items-center gap-2 border-b border-border/60 px-1 py-2 max-sm:gap-3 max-sm:border-0 max-sm:px-0 max-sm:py-3 sm:min-h-[68px] sm:gap-3 sm:rounded-xl sm:border-0 sm:bg-muted/50 sm:p-3">
          <Skeleton className="size-12 shrink-0 rounded-full sm:size-11" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-[min(70%,15rem)]" />
            <Skeleton className="h-3 w-[min(40%,7rem)]" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-full max-sm:hidden" />
        </div>
      ))}
    </div>
  )
}
