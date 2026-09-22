"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { ClipboardList, FileSignature, FileText, FolderOpen, ListTodo, Paperclip, Receipt } from "lucide-react"

import type { ActivityItem, ActivityKind } from "@/lib/activity"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<ActivityKind, ComponentType<{ className?: string }>> = {
  project: FolderOpen,
  task: ListTodo,
  invoice: Receipt,
  estimate: ClipboardList,
  contract: FileSignature,
  document: FileText,
  file: Paperclip,
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return "just now"
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** A newest-first list of what happened across a workspace. */
export function ActivityFeed({
  items,
  hrefFor,
  title = "Activity",
  emptyLabel = "No recent activity yet.",
  showHeader = true,
  className,
}: {
  items: ActivityItem[]
  hrefFor?: (item: ActivityItem) => string | undefined
  title?: string
  emptyLabel?: string
  showHeader?: boolean
  className?: string
}) {
  return (
    <section className={cn("sm:rounded-lg sm:bg-card sm:p-5", className)}>
      {showHeader && (
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          {title}
          {items.length > 0 && <span className="font-normal tabular-nums text-muted-foreground">{items.length}</span>}
        </h2>
      )}
      {items.length ? (
        <>
          <div className="space-y-2 sm:hidden">
            {items.map((item) => {
              const Icon = KIND_ICON[item.kind]
              const href = hrefFor?.(item)
              return (
                <MobileDataCard
                  key={item.id}
                  title={item.title}
                  subtitle={[item.subtitle, timeAgo(item.at)].filter(Boolean).join(" · ")}
                  icon={<Icon className="size-5 text-muted-foreground" aria-hidden="true" />}
                  href={href}
                  ariaLabel={`Open ${item.title}`}
                />
              )
            })}
          </div>
          <ul className="hidden divide-y divide-border sm:block">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind]
            const href = hrefFor?.(item)
            const body = (
              <div className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{timeAgo(item.at)}</span>
              </div>
            )
            return (
              <li key={item.id} className="first:[&>*]:pt-0 last:[&>*]:pb-0">
                {href ? (
                  <Link href={href} className="-mx-2 block rounded-md px-2 transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            )
          })}
          </ul>
        </>
      ) : (
        <p className="py-4 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </section>
  )
}
