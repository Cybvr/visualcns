import Link from "next/link"
import type { ComponentType, MouseEventHandler, ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * The first-run state, for a list page that has never held anything: an
 * illustration of two stacked records on the left, the pitch and the one
 * action on the right. Bigger than EmptyState on purpose, since the page has
 * nothing else on it until the first record exists. Use EmptyState instead
 * once something has been created and then cleared, or for a section inside
 * a page that already has content of its own.
 */
export function FirstRunState({
  /** The word printed on the illustrated pages, e.g. "Document" or "Invoice". */
  label,
  title,
  description,
  action,
  /** The support line, bottom right. Pass null to leave it off. */
  help = <HelpLine />,
  className,
}: {
  label: string
  title: string
  description?: string
  action?: ReactNode
  help?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("overflow-hidden rounded-[14px] border border-border bg-card", className)}>
      <div className="grid items-center gap-8 p-5 sm:p-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:p-10">
        <div className="-mb-5 overflow-hidden rounded-t-[12px] bg-muted/50 px-6 pt-7 sm:-mb-8 sm:px-10 sm:pt-10 lg:-mb-10">
          <StackedPages label={label} />
        </div>
        <div className="max-w-md">
          <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{title}</h2>
          {description && <p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p>}
          {action && <div className="mt-7">{action}</div>}
        </div>
      </div>
      {help && <div className="px-5 pb-4 text-right text-xs text-muted-foreground sm:px-8 lg:px-10">{help}</div>}
    </div>
  )
}

function HelpLine() {
  return (
    <>
      Have questions?{" "}
      <Link href="/contact" className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
        Contact Support
      </Link>
    </>
  )
}

/**
 * Two blank record pages, the front one overlapping the back. Drawn rather
 * than photographed so it takes the theme with it, and in SVG so it stays
 * sharp at whatever width the column happens to be.
 */
function StackedPages({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 700 700" role="img" aria-label={`Two blank ${label.toLowerCase()} pages`} className="h-auto w-full max-w-[520px]">
      <defs>
        <filter id="first-run-page-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.08" />
        </filter>
      </defs>
      <Page x={0} y={0} label={label} faded />
      <Page x={235} y={180} label={label} />
    </svg>
  )
}

function Page({ x, y, label, faded = false }: { x: number; y: number; label: string; faded?: boolean }) {
  const line = (dy: number, width: number) => <rect x={x + 48} y={y + dy} width={width} height={14} rx={7} />
  return (
    <g opacity={faded ? 0.55 : 1}>
      <rect x={x} y={y} width={440} height={570} rx={14} className="text-card" fill="currentColor" filter="url(#first-run-page-shadow)" />
      <rect x={x + 0.5} y={y + 0.5} width={439} height={569} rx={13.5} className="text-border" stroke="currentColor" fill="none" />
      <rect x={x + 48} y={y + 48} width={44} height={44} rx={9} className={faded ? "text-primary/30" : "text-primary/50"} fill="currentColor" />
      <text
        x={x + 48}
        y={y + 166}
        fontSize="40"
        fontWeight="600"
        className={faded ? "text-muted-foreground/40" : "text-muted-foreground/70"}
        fill="currentColor"
      >
        {label}
      </text>
      <g className={faded ? "text-muted-foreground/30" : "text-muted-foreground/50"} fill="currentColor">
        {line(206, 190)}
      </g>
      <g className="text-muted-foreground/15" fill="currentColor">
        {line(242, 320)}
        {line(278, 320)}
        {line(314, 320)}
        {line(350, 250)}
      </g>
      <rect x={x + 48} y={y + 432} width={92} height={24} rx={12} className={faded ? "text-primary/25" : "text-primary"} fill="currentColor" />
    </g>
  )
}

/**
 * Nothing here yet. One shape for every list page: an icon, a title, an
 * optional line of copy, and whatever action starts the first one.
 * `onClick` makes the whole block a target, for drive's click-to-upload.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onClick,
  className,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
  onClick?: MouseEventHandler<HTMLDivElement>
  className?: string
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col items-center rounded-[14px] border border-dashed border-border bg-card px-5 py-16 text-center",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <Icon className="mb-3 size-8 text-muted-foreground/60" aria-hidden="true" />
      <p className="font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs font-normal text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** The narrower case: something exists, but the current search/filter matched nothing. */
export function EmptySearchState({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-dashed border-border bg-card px-5 py-16 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {label}
    </div>
  )
}
