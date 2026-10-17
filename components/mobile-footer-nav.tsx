"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment, type ComponentType, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export type MobileFooterNavItem = {
  key: string
  /** Text shown under the icon. Omit for an icon-only slot (e.g. a center create button). */
  label?: string
  /** Accessible name when there's no visible label. Defaults to `label`. */
  ariaLabel?: string
  icon?: ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void
  isActive?: boolean
  badge?: number
  /** Custom rendering for this slot instead of the default link/button, e.g. a menu trigger. Receives the shared item className to stay aligned with the other tabs. */
  render?: (props: { className: string }) => ReactNode
}

/** Floating pill tab bar shown on mobile only, replacing the floating Ngai composer. */
export function MobileFooterNav({ items, className }: { items: MobileFooterNavItem[]; className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className={cn(
        // 4rem tall plus a 0.5rem gap below: 4.5rem total, the space the dashboard reserves for it, so sticky footers sit flush on top.
        "fixed inset-x-4 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex h-16 max-w-md gap-1 rounded-full border border-border bg-background p-1.5 shadow-lg md:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const sharedClassName = "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full outline-none transition-colors focus-visible:bg-muted"

        if (item.render) {
          return <Fragment key={item.key}>{item.render({ className: sharedClassName })}</Fragment>
        }

        const Icon = item.icon
        const active = item.isActive ?? (item.href ? pathname === item.href || pathname?.startsWith(`${item.href}/`) : false)
        const body = (
          <>
            {Icon && <span className="relative inline-flex">
              <Icon className={cn("size-5", active ? "text-foreground" : "text-muted-foreground")} aria-hidden="true" />
              {item.badge && item.badge > 0 ? <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-button px-1 text-center text-[9px] font-bold leading-4 tabular-nums text-button-foreground" aria-hidden="true">{item.badge > 99 ? "99+" : item.badge}</span> : null}
            </span>}
            {item.label && (
              <span className={cn("text-[11px] font-semibold", active ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
            )}
          </>
        )

        return item.href ? (
          <Link key={item.key} href={item.href} onClick={item.onClick} aria-label={item.badge && item.badge > 0 ? `${item.ariaLabel ?? item.label}, ${item.badge} unread` : item.ariaLabel ?? item.label} className={cn(sharedClassName, active && "bg-muted")}>
            {body}
          </Link>
        ) : (
          <button key={item.key} type="button" onClick={item.onClick} aria-label={item.ariaLabel ?? item.label} className={cn(sharedClassName, active && "bg-muted")}>
            {body}
          </button>
        )
      })}
    </nav>
  )
}
