"use client"

import Link from "next/link"
import { Globe, Pencil } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { SectionAddButton } from "@/components/company/section-add-button"
import { CollectionView } from "@/components/dashboard/collection-view"
import { useNgaiChats } from "@/components/ngai/use-ngai-chats"
import { SiteThumbnail } from "@/components/ngai/site-thumbnail"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ngaiPublishedUrl, openInBuilder } from "@/lib/ngai"

/** The viewer's Ngai builder chats, in the same list as Campaigns. Published sites open live; drafts open in the builder. */
export function SitesSection() {
  const { company } = useCompanyPage()
  const { user, authReady, chats, failed } = useNgaiChats(50)

  if (authReady && !user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center text-muted-foreground">
        <p>Sign in to see your websites.</p>
        <Button asChild>
          <Link href={`/${encodeURIComponent(company.slug || company.id)}/sign-in`}>Sign in</Link>
        </Button>
      </div>
    )
  }

  if (failed) return <p className="py-24 text-center text-muted-foreground">Couldn&apos;t load your websites. Try again in a moment.</p>

  // Opens the builder already signed in as this user.
  const openBuilder = (path: string) => void openInBuilder(path, async () => user ? user.getIdToken() : null)
  const newSite = () => openBuilder("/dashboard")

  return (
    <div className="mt-5">
      <h2 className="sr-only">Websites</h2>
      <CollectionView
        className="mt-4"
        items={chats ?? []}
        loading={!authReady || chats === null}
        getKey={(chat) => chat.id}
        searchFields={(chat) => [chat.title, chat.slug]}
        searchPlaceholder="Search websites"
        viewKey="company-websites"
        actions={<SectionAddButton label="New website" onClick={newSite} />}
        empty={{
          icon: Globe,
          title: "No websites yet",
          action: <SectionAddButton label="New website" onClick={newSite} />,
        }}
        date={(chat) => chat.updatedAt}
        itemActions={(chat) => ({
          noun: "website",
          name: chat.title,
          extra: chat.slug ? (
            <DropdownMenuItem onSelect={() => openBuilder(`/chat/${encodeURIComponent(chat.id)}`)}>
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
          ) : undefined,
        })}
        card={(chat) => {
          const liveUrl = chat.slug ? ngaiPublishedUrl(chat.slug) : null
          return {
            title: chat.title,
            icon: <Globe className="size-4 text-muted-foreground" aria-hidden="true" />,
            placeholder: <Globe className="size-8 text-muted-foreground/60" aria-hidden="true" />,
            preview: <SiteThumbnail code={chat.code} title={chat.title} />,
            onClick: () => {
              if (liveUrl) window.open(liveUrl, "_blank", "noopener,noreferrer")
              else openBuilder(`/chat/${encodeURIComponent(chat.id)}`)
            },
            ariaLabel: `Open ${chat.title}`,
          }
        }}
        row={(chat) => ({ subtitle: chat.slug ? ngaiPublishedUrl(chat.slug).replace("https://", "") : "Draft" })}
      />
      {chats && chats.length >= 50 && (
        <p className="mt-4 text-center text-sm">
          <button type="button" onClick={() => openBuilder("/dashboard/projects")} className="text-muted-foreground underline-offset-4 hover:underline">
            See all your websites
          </button>
        </p>
      )}
    </div>
  )
}
