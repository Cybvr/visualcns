import Link from "next/link"
import { EllipsisVertical } from "lucide-react"
import type { ReactNode } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type GridCardProps = {
  title: ReactNode
  /** A short line under the preview, such as a date. */
  subtitle?: ReactNode
  /** Small icon beside the title. */
  icon?: ReactNode
  /** Fills the preview tile. Falls back to `imageUrl`, then to `placeholder`. */
  preview?: ReactNode
  imageUrl?: string
  imageAlt?: string
  /** Large icon shown in the preview tile when there is no image. */
  placeholder?: ReactNode
  menu?: ReactNode
  menuLabel?: string
  selected?: boolean
  href?: string
  onClick?: () => void
  ariaLabel?: string
}

/**
 * One tile in a grid view: icon and title on top with a corner menu, then a
 * preview. Shared by the companies, contacts, documents, and projects pages.
 */
export function GridCard({
  title,
  subtitle,
  icon,
  preview,
  imageUrl,
  imageAlt = "",
  placeholder,
  menu,
  menuLabel = "More options",
  selected = false,
  href,
  onClick,
  ariaLabel,
}: GridCardProps) {
  const overlayClass = "absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl bg-muted/60 p-3 transition-colors hover:bg-muted",
        selected && "bg-muted ring-2 ring-primary/60",
        (href || onClick) && "cursor-pointer",
      )}
    >
      {href ? (
        <Link href={href} aria-label={ariaLabel} className={overlayClass} />
      ) : onClick ? (
        <button type="button" onClick={onClick} aria-label={ariaLabel} className={overlayClass} />
      ) : null}

      <div className="flex min-h-9 items-center gap-2.5 pl-1">
        {icon && <span className="pointer-events-none relative flex shrink-0 items-center">{icon}</span>}
        <p className="pointer-events-none relative min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</p>
        {menu && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={menuLabel}
                title={menuLabel}
                className="relative z-10 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <EllipsisVertical className="size-5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="pointer-events-none relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-background">
        {preview ??
          (imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={imageAlt} loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
          ) : (
            placeholder
          ))}
      </div>
      {subtitle !== undefined && <p className="pointer-events-none relative truncate px-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

/** The grid that holds GridCards: two across on phones (or one, with `single`), more on wider screens. */
export function GridCardList({ children, single = false }: { children: ReactNode; single?: boolean }) {
  return <div className={cn("grid gap-3 sm:grid-cols-3 lg:grid-cols-4", single ? "grid-cols-1" : "grid-cols-2")}>{children}</div>
}
