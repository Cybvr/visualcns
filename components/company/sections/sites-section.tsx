"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { ArrowUpRight, Globe, Plus, Search } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { useNgaiChats } from "@/components/ngai/use-ngai-chats"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { NGAI_APP_URL, NGAI_PROJECTS_URL, ngaiChatUrl } from "@/lib/ngai"

function editedLabel(ms: number) {
  if (!ms) return "Not edited yet"
  return `Edited ${new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
}

/** The viewer's Ngai builder chats as cards. Each one opens in the builder. */
export function SitesSection() {
  const { company } = useCompanyPage()
  const { user, authReady, chats, failed } = useNgaiChats(50)
  const [search, setSearch] = useState("")
  // The page title row (in the company shell) has a spot for page actions.
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null)
  useEffect(() => { setTitleSlot(document.getElementById("company-title-actions")) }, [])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (chats ?? []).filter((chat) => chat.title.toLowerCase().includes(q))
  }, [chats, search])

  const actions = user ? (
    <Button asChild size="sm">
      <a href={NGAI_APP_URL}>
        <Plus aria-hidden="true" />
        New site
      </a>
    </Button>
  ) : null

  if (!authReady) return <SitesGrid loading />

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center text-muted-foreground">
        <p>Sign in to see the sites you&apos;ve built with Ngai.</p>
        <Button asChild>
          <Link href={`/${encodeURIComponent(company.slug || company.id)}/sign-in`}>Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-5">
      {actions && (titleSlot ? createPortal(actions, titleSlot) : <div className="flex justify-end">{actions}</div>)}

      {chats && chats.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sites" className="pl-9" aria-label="Search sites" />
        </div>
      )}

      {failed ? (
        <p className="py-24 text-center text-muted-foreground">Couldn&apos;t load your sites. Try again in a moment.</p>
      ) : chats === null ? (
        <SitesGrid loading />
      ) : chats.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center text-muted-foreground">
          <p>No sites yet. Describe one to Ngai and it builds it for you.</p>
          <Button asChild>
            <a href={NGAI_APP_URL}>
              <Plus aria-hidden="true" />
              New site
            </a>
          </Button>
        </div>
      ) : shown.length === 0 ? (
        <p className="py-24 text-center text-muted-foreground">No sites match your search.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((chat) => (
              <a
                key={chat.id}
                href={ngaiChatUrl(chat.id)}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="grid aspect-video place-items-center bg-muted/50">
                  <Globe className="size-8 text-muted-foreground/60" aria-hidden="true" />
                </div>
                <div className="flex items-start gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{chat.title}</p>
                    <p className="text-sm text-muted-foreground">{editedLabel(chat.updatedAt)}</p>
                  </div>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
              </a>
            ))}
          </div>
          {chats.length >= 50 && (
            <p className="text-center text-sm">
              <a href={NGAI_PROJECTS_URL} className="text-muted-foreground underline-offset-4 hover:underline">
                See all your sites in Ngai
              </a>
            </p>
          )}
        </>
      )}
    </div>
  )
}

function SitesGrid({ loading }: { loading: true }) {
  if (!loading) return null
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="aspect-video rounded-xl" />
      ))}
    </div>
  )
}
