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
  /** Custom rendering for this slot instead of the default link/button, e.g. a menu trigger. Receives the shared item className to stay aligned with the other tabs. */
  render?: (props: { className: string }) => ReactNode
}

/** Bottom tab bar shown on mobile only, replacing the floating Ngai composer. */
export function MobileFooterNav({ items, className }: { items: MobileFooterNavItem[]; className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const sharedClassName = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 outline-none transition-colors focus-visible:bg-muted"

        if (item.render) {
          return <Fragment key={item.key}>{item.render({ className: sharedClassName })}</Fragment>
        }

        const Icon = item.icon
        const active = item.isActive ?? (item.href ? pathname === item.href || pathname?.startsWith(`${item.href}/`) : false)
        const body = (
          <>
            {Icon && <Icon className={cn("size-5", active ? "text-foreground" : "text-muted-foreground")} aria-hidden="true" />}
            {item.label && (
              <span className={cn("text-[11px] font-semibold", active ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
            )}
          </>
        )

        return item.href ? (
          <Link key={item.key} href={item.href} onClick={item.onClick} aria-label={item.ariaLabel ?? item.label} className={sharedClassName}>
            {body}
          </Link>
        ) : (
          <button key={item.key} type="button" onClick={item.onClick} aria-label={item.ariaLabel ?? item.label} className={sharedClassName}>
            {body}
          </button>
        )
      })}
    </nav>
  )
}
