import Link from "next/link"
import { File, MoreHorizontal, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

/** Badge tints per document kind, shared by every surface that lists documents. */
export const DOC_BADGE = {
  document: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  invoice: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  contract: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  estimate: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
}

/**
 * A Drive-style document tile: a tall preview area with a muted file glyph, then
 * a coloured badge, title and subtitle. Reused by the company page and the
 * client portal. Pass `href` to render a link, or `onClick` for a button.
 */
export function DocTile({
  icon: Icon,
  badgeClass,
  title,
  subtitle,
  href,
  onClick,
  menu,
  menuLabel,
}: {
  /** Footer badge icon; defaults to a plain file. */
  icon?: LucideIcon
  badgeClass: string
  title: string
  subtitle: string
  href?: string
  onClick?: () => void
  menu?: ReactNode
  menuLabel?: string
}) {
  const BadgeIcon = Icon ?? File
  const className =
    "group flex h-full flex-row items-center overflow-hidden text-left outline-none transition-colors hover:bg-muted/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-col sm:items-stretch"

  const inner = (
    <>
      <div className="flex h-20 w-20 shrink-0 items-center justify-center border-r border-border bg-muted/40 sm:h-40 sm:w-full sm:border-b sm:border-r-0">
        <File className="size-8 text-muted-foreground sm:size-10" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 p-3">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", badgeClass)}>
          <BadgeIcon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </>
  )

  return (
    <div className="group relative flex h-full">
      {href ? <Link href={href} className={className}>{inner}</Link> : <button type="button" onClick={onClick} className={className}>{inner}</button>}
      {menu && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={menuLabel ?? `Options for ${title}`}
              title={menuLabel ?? `Options for ${title}`}
              className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground opacity-100 outline-none backdrop-blur transition-opacity hover:bg-background focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
