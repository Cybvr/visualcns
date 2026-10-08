"use client"

import Link from "next/link"
import { EllipsisVertical } from "lucide-react"
import { useEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type MobileDataCardProps = {
  title: ReactNode
  subtitle?: ReactNode
  description?: ReactNode
  surface?: "card" | "muted" | "list"
  icon?: ReactNode
  iconShape?: "square" | "circle"
  variant?: "default" | "task" | "inline"
  imageUrl?: string
  imageAlt?: string
  menu?: ReactNode
  menuLabel?: string
  trailing?: ReactNode
  selected?: boolean
  href?: string
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  onLongPress?: () => void
  ariaLabel?: string
  pressed?: boolean
}

export function MobileDataCard({
  title,
  subtitle,
  description,
  surface = "card",
  icon,
  iconShape = "square",
  variant = "default",
  imageUrl,
  imageAlt = "",
  menu,
  menuLabel = "More options",
  trailing,
  selected = false,
  href,
  onClick,
  onLongPress,
  ariaLabel,
  pressed,
}: MobileDataCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStart = useRef({ x: 0, y: 0 })
  const longPressTriggered = useRef(false)
  const lastPointerType = useRef("")

  function cancelLongPress() {
    if (longPressTimer.current !== null) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  useEffect(() => () => {
    if (longPressTimer.current !== null) clearTimeout(longPressTimer.current)
  }, [])

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    lastPointerType.current = event.pointerType
    longPressTriggered.current = false
    if (event.pointerType !== "touch" || !onLongPress) return
    pressStart.current = { x: event.clientX, y: event.clientY }
    cancelLongPress()
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      onLongPress()
    }, 500)
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (longPressTimer.current !== null && Math.hypot(event.clientX - pressStart.current.x, event.clientY - pressStart.current.y) > 10) {
      cancelLongPress()
    }
  }

  const content = (
    <>
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-card",
          iconShape === "circle" && "rounded-full bg-transparent",
          variant === "task" && "max-sm:size-20 max-sm:rounded-[22px] max-sm:bg-muted/45 max-sm:[&>svg]:size-8",
          variant === "inline" && "size-8",
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={imageAlt} className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          icon
        )}
      </span>
      {variant === "inline" ? (
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <p className="w-32 max-w-[38%] shrink-0 truncate text-sm text-foreground lg:w-40">{title}</p>
          <div className="flex min-w-0 flex-1 items-baseline gap-1">
            {subtitle !== undefined && <span className="max-w-[70%] shrink-0 truncate text-sm text-foreground">{subtitle}</span>}
            {description !== undefined && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">— {description}</span>}
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm text-foreground", variant === "task" && "max-sm:text-lg max-sm:font-semibold max-sm:tracking-tight")}>
            {title}
          </p>
          {/* div, not p: the dashboard-body rule forces p to inherit its font size */}
          {subtitle !== undefined && (
            <div className={cn("mt-0.5 truncate text-xs text-muted-foreground", variant === "task" && "max-sm:mt-1 max-sm:text-sm")}>
              {subtitle}
            </div>
          )}
          {description !== undefined && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      )}
    </>
  )

  const cardClassName = cn(
    "relative flex items-center gap-2 rounded-sm p-3 transition-colors",
    surface === "muted" && "rounded-xl",
    surface === "list" && "rounded-none border-b border-border",
    variant === "inline" && "gap-3 px-3 py-2",
    variant === "task" && "max-sm:gap-5 max-sm:rounded-none max-sm:border-b max-sm:border-border max-sm:bg-transparent max-sm:px-0 max-sm:py-5 max-sm:hover:bg-transparent",
    selected && (surface === "muted" ? "bg-muted" : surface === "list" ? "border-primary bg-transparent" : "bg-muted/50"),
    !selected && (surface === "muted" ? "bg-muted/50 hover:bg-muted" : surface === "list" ? "bg-transparent hover:bg-transparent" : "bg-card hover:bg-muted/50"),
    (href || onClick) && "cursor-pointer",
  )

  return (
    <div className={cardClassName}>
      {href ? (
        <Link
          href={href}
          aria-label={ariaLabel}
          className={cn("absolute inset-0 z-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring", surface === "muted" && "rounded-xl", surface === "list" && "rounded-none")}
        />
      ) : onClick ? (
        <button
          type="button"
          onClick={(event) => {
            if (longPressTriggered.current) {
              longPressTriggered.current = false
              return
            }
            onClick(event)
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={cancelLongPress}
          onPointerCancel={() => { cancelLongPress(); longPressTriggered.current = false }}
          onPointerLeave={cancelLongPress}
          onKeyDown={() => { cancelLongPress(); longPressTriggered.current = false }}
          onContextMenu={(event) => { if (onLongPress && lastPointerType.current === "touch") event.preventDefault() }}
          aria-label={ariaLabel}
          aria-pressed={pressed}
          className={cn("absolute inset-0 z-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring", surface === "muted" && "rounded-xl", surface === "list" && "rounded-none")}
        />
      ) : null}
      <div className="pointer-events-none relative z-0 flex min-w-0 flex-1 items-center gap-3">{content}</div>
      {trailing !== undefined && (
        <div className="relative z-0 shrink-0 text-right text-xs text-muted-foreground">{trailing}</div>
      )}
      {menu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={menuLabel}
              title={menuLabel}
              className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-transparent text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <EllipsisVertical className="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
