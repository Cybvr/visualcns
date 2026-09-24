import Link from "next/link"
import { EllipsisVertical } from "lucide-react"
import type { ReactNode } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type MobileDataCardProps = {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  variant?: "default" | "task"
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
  variant = "default",
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
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-card",
          variant === "task" && "max-sm:size-20 max-sm:rounded-[22px] max-sm:bg-muted/45 max-sm:[&>svg]:size-8",
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={imageAlt} className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          icon
        )}
      </span>
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
      </div>
    </>
  )

  const cardClassName = cn(
    "relative flex items-center gap-2 rounded-sm p-3 transition-colors",
    variant === "task" && "max-sm:gap-5 max-sm:rounded-none max-sm:border-b max-sm:border-border max-sm:bg-transparent max-sm:px-0 max-sm:py-5 max-sm:hover:bg-transparent",
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
