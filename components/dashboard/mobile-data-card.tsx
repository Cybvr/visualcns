import Link from "next/link"
import { EllipsisVertical } from "lucide-react"
import type { ReactNode } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type MobileDataCardProps = {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  imageUrl?: string
  imageAlt?: string
  menu?: ReactNode
  menuLabel?: string
  selected?: boolean
  href?: string
  onClick?: () => void
  ariaLabel?: string
}

export function MobileDataCard({
  title,
  subtitle,
  icon,
  imageUrl,
  imageAlt = "",
  menu,
  menuLabel = "More options",
  selected = false,
  href,
  onClick,
  ariaLabel,
}: MobileDataCardProps) {
  const content = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-card">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={imageAlt} className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          icon
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{title}</p>
        {/* div, not p: the dashboard-body rule forces p to inherit its font size */}
        {subtitle !== undefined && <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
    </>
  )

  const cardClassName = cn(
    "relative flex items-center gap-2 rounded-sm p-3 transition-colors",
    selected ? "bg-muted" : "bg-card hover:bg-muted/30",
    (href || onClick) && "cursor-pointer",
  )

  return (
    <div className={cardClassName}>
      {href ? (
        <Link
          href={href}
          aria-label={ariaLabel}
          className="absolute inset-0 z-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          className="absolute inset-0 z-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : null}
      <div className="pointer-events-none relative z-0 flex min-w-0 flex-1 items-center gap-3">{content}</div>
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
