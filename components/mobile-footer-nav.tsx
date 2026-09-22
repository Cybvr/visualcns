"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

export type MobileFooterNavItem = {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void
  isActive?: boolean
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
        const Icon = item.icon
        const active = item.isActive ?? (item.href ? pathname === item.href || pathname?.startsWith(`${item.href}/`) : false)
        const body = (
          <>
            <Icon className={cn("size-5", active ? "text-foreground" : "text-muted-foreground")} aria-hidden="true" />
            <span className={cn("text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
          </>
        )
        const sharedClassName = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 outline-none transition-colors focus-visible:bg-muted"

        return item.href ? (
          <Link key={item.key} href={item.href} onClick={item.onClick} className={sharedClassName}>
            {body}
          </Link>
        ) : (
          <button key={item.key} type="button" onClick={item.onClick} className={sharedClassName}>
            {body}
          </button>
        )
      })}
    </nav>
  )
}
