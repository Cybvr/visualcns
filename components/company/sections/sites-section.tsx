"use client"

import Link from "next/link"
import { Globe, Pencil } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { SectionAddButton } from "@/components/company/section-add-button"
import { CollectionView } from "@/components/dashboard/collection-view"
import { useNgaiChats } from "@/components/ngai/use-ngai-chats"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { NGAI_APP_URL, NGAI_PROJECTS_URL, ngaiChatUrl, ngaiPublishedUrl } from "@/lib/ngai"

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

  const newSite = () => window.location.assign(NGAI_APP_URL)

  return (
    <>
      <h2 className="sr-only">Websites</h2>
      <CollectionView
        className=""
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
            <DropdownMenuItem asChild>
              <a href={ngaiChatUrl(chat.id)}>
                <Pencil aria-hidden="true" />
                Edit
              </a>
            </DropdownMenuItem>
          ) : undefined,
        })}
        card={(chat) => {
          const liveUrl = chat.slug ? ngaiPublishedUrl(chat.slug) : null
          return {
            title: chat.title,
            icon: <Globe className="size-4 text-muted-foreground" aria-hidden="true" />,
            placeholder: <Globe className="size-8 text-muted-foreground/60" aria-hidden="true" />,
            onClick: () => {
              if (liveUrl) window.open(liveUrl, "_blank", "noopener,noreferrer")
              else window.location.assign(ngaiChatUrl(chat.id))
            },
            ariaLabel: `Open ${chat.title}`,
          }
        }}
        row={(chat) => ({ subtitle: chat.slug ? ngaiPublishedUrl(chat.slug).replace("https://", "") : "Draft" })}
      />
      {chats && chats.length >= 50 && (
        <p className="mt-4 text-center text-sm">
          <a href={NGAI_PROJECTS_URL} className="text-muted-foreground underline-offset-4 hover:underline">
            See all your websites
          </a>
        </p>
      )}
    </>
  )
}
