import { Megaphone } from "lucide-react"

import type { GridCardProps } from "@/components/dashboard/grid-card"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { ProjectCover } from "@/components/project-card"
import { isProjectArchived, type Project } from "@/lib/projects"

/** Shared visual and menu setup for campaign cards across dashboard sections. */
export function campaignGridCardProps(
  project: Project,
  {
    onOpen,
    href,
    onRenameRequest,
    onDuplicate,
    onArchive,
    onRestore,
    archived: archivedOverride,
    onDeleteRequest,
  }: {
    onOpen: () => void
    href?: string
    onRenameRequest?: () => void
    onDuplicate?: () => void
    onArchive?: () => void
    onRestore?: () => void
    archived?: boolean
    onDeleteRequest?: () => void
  },
): GridCardProps {
  const title = project.title || "Untitled campaign"
  const archived = archivedOverride ?? isProjectArchived(project)

  return {
    title,
    icon: <Megaphone className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
    preview: <ProjectCover project={project} />,
    href,
    onClick: href ? undefined : onOpen,
    ariaLabel: `Open ${title}`,
    menuLabel: `Options for ${title}`,
    menuAlwaysVisible: true,
    menu: (
      <>
        {onRenameRequest && <DropdownMenuItem onSelect={onRenameRequest}>Rename</DropdownMenuItem>}
        {onDuplicate && <DropdownMenuItem onSelect={onDuplicate}>Duplicate</DropdownMenuItem>}
        {archived ? (
          onRestore && <DropdownMenuItem onSelect={onRestore}>Restore</DropdownMenuItem>
        ) : (
          onArchive && <DropdownMenuItem onSelect={onArchive}>Archive</DropdownMenuItem>
        )}
        {onDeleteRequest && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDeleteRequest}>Delete</DropdownMenuItem>
          </>
        )}
      </>
    ),
  }
}
