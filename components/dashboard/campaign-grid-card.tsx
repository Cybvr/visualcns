"use client"

import { useState } from "react"
import { Megaphone } from "lucide-react"

import type { GridCardProps } from "@/components/dashboard/grid-card"
import { hasItemActions, type ItemActions } from "@/components/dashboard/item-menu"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { ProjectCover } from "@/components/project-card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { isProjectArchived, type Project } from "@/lib/projects"

/** The campaign's own public page for creators: the brief, approved posts and media, nothing else from the client. */
export function campaignSharePath(project: Pick<Project, "id">) {
  return `/share/campaigns/${encodeURIComponent(project.id)}`
}

/**
 * Share for campaign cards: `shareItem` goes in a card's menu (its `extra`),
 * and `dialog` is rendered once by the page so it survives the menu closing.
 */
export function useCampaignShare() {
  const [sharing, setSharing] = useState<Project | null>(null)
  return {
    shareItem: (project: Project) => <DropdownMenuItem onSelect={() => setSharing(project)}>Share</DropdownMenuItem>,
    dialog: (
      <ShareDialog
        open={sharing !== null}
        onOpenChange={(open) => { if (!open) setSharing(null) }}
        showTrigger={false}
        path={sharing ? campaignSharePath(sharing) : ""}
        title={`Share ${sharing?.title || "campaign"}`}
      />
    ),
  }
}

/** Shared visual and menu setup for campaign cards across dashboard sections. */
export function campaignGridCardProps(
  project: Project,
  {
    onOpen,
    href,
    archived: archivedOverride,
    onArchive,
    onRestore,
    ...menu
  }: {
    onOpen: () => void
    href?: string
    archived?: boolean
  } & Omit<ItemActions, "noun" | "name" | "onOpen">,
): GridCardProps {
  const title = project.title || "Untitled campaign"
  const archived = archivedOverride ?? isProjectArchived(project)
  const actions: ItemActions = {
    ...menu,
    noun: "campaign",
    name: title,
    onArchive: archived ? undefined : onArchive,
    onRestore: archived ? onRestore : undefined,
  }

  return {
    title,
    icon: <Megaphone className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
    preview: <ProjectCover project={project} />,
    href,
    onClick: href ? undefined : onOpen,
    ariaLabel: `Open ${title}`,
    menuLabel: `Options for ${title}`,
    menuAlwaysVisible: true,
    actions: hasItemActions(actions) ? actions : undefined,
  }
}
