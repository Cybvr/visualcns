"use client"

import { createElement, type ComponentType, type ReactNode } from "react"
import Link from "next/link"
import { MoreHorizontal } from "lucide-react"

import { planIcons } from "@/components/offer-card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Project } from "@/lib/projects"

/** Stable hue from the id or title, so a card keeps the same cover every load. */
function hueFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360
  }
  return hash
}

/**
 * The cover on a project card. A legacy case-study image wins, then the banner
 * and profile image; otherwise
 * a generated tile carrying the workflow icon, or the first letter of the title.
 */
export function ProjectCover({ project, className = "" }: { project: Project; className?: string }) {
  const image = project.imageUrl || project.thumbnailUrl || project.logoUrl
  if (image) {
    return (
      // Thumbnails are arbitrary stored URLs, so this stays a plain img rather
      // than next/image, which would need every host allowlisted in the config.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />
    )
  }

  const Icon = project.icon ? (planIcons[project.icon] as ComponentType<{ className?: string }>) : undefined
  const hue = hueFor(project.id || project.title)
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 62% 58%), hsl(${(hue + 42) % 360} 68% 46%))`,
      }}
      aria-hidden="true"
    >
      {Icon ? (
        createElement(Icon, { className: "size-1/4 text-white/90" })
      ) : (
        <span className="text-2xl font-semibold text-white/90">
          {project.title.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </div>
  )
}

/**
 * One tile in a project grid. Used for real projects in the workspace and for
 * templates on the public page, so both grids stay the same card: cover, title,
 * the service line underneath, then whatever belongs in the footer.
 *
 * `href` makes the body a link, `onClick` makes it a button. `menu` holds the
 * items for the corner menu, and is rendered as a sibling of the body since a
 * button cannot legally contain another one.
 */
export function ProjectCard({
  project,
  subtitle,
  footer,
  href,
  onClick,
  menu,
  menuLabel,
}: {
  project: Project
  subtitle?: ReactNode
  footer?: ReactNode
  href?: string
  onClick?: () => void
  menu?: ReactNode
  menuLabel?: string
}) {
  const bodyClass = `flex w-full flex-row items-center gap-2 rounded-[14px] border border-border/60 bg-card p-2 text-left shadow-sm sm:flex-col sm:items-stretch sm:gap-0 ${
    href || onClick
      ? "outline-none transition-colors hover:border-foreground/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      : ""
  }`

  const body = (
    <>
      <div className="aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-[10px] sm:w-full">
        <ProjectCover project={project} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-1.5 py-1 sm:pb-1 sm:pt-2.5">
        <span className="truncate text-sm font-medium text-foreground">{project.title}</span>
        <span className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle ?? project.service}</span>
        {footer && <div className="mt-auto pt-2">{footer}</div>}
      </div>
    </>
  )

  return (
    <div className="group relative flex">
      {href ? (
        <Link href={href} className={bodyClass}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={bodyClass}>
          {body}
        </button>
      ) : (
        <div className={bodyClass}>{body}</div>
      )}

      {menu && (
        // Revealed on hover on pointer devices, always there on touch.
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={menuLabel ?? `Options for ${project.title}`}
              className="absolute right-3.5 top-3.5 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground outline-none backdrop-blur transition-opacity hover:bg-background focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {menu}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
