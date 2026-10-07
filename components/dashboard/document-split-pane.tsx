"use client"

import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

import { EmptySearchState } from "@/components/dashboard/empty-state"
import { CompactListSkeleton, MOBILE_LIST_CARD } from "@/components/dashboard/compact-list-row"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DocumentSplitPane<T>({
  visibleItems,
  selectedId,
  onClearSelection,
  sectionLabel,
  filter,
  listExtra,
  loading = false,
  emptySearchLabel,
  getKey,
  renderItem,
  selectedTitle,
  headerActions,
  content,
}: {
  visibleItems: T[]
  selectedId: string | null
  onClearSelection: () => void
  sectionLabel: string
  filter: ReactNode
  listExtra?: ReactNode
  loading?: boolean
  emptySearchLabel: string
  getKey: (item: T) => string
  renderItem: (item: T, active: boolean) => ReactNode
  selectedTitle?: string
  headerActions?: ReactNode
  content: ReactNode
}) {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)] lg:items-start lg:gap-6">
      <div className={cn("min-w-0", selectedId && "hidden sm:block")}>
        {filter}
        {listExtra}
        {loading ? (
          <CompactListSkeleton />
        ) : visibleItems.length === 0 ? (
          <EmptySearchState label={emptySearchLabel} />
        ) : (
          <ul className={cn("mt-1", MOBILE_LIST_CARD)}>
            {visibleItems.map((item) => (
              <li key={getKey(item)}>{renderItem(item, getKey(item) === selectedId)}</li>
            ))}
          </ul>
        )}
      </div>

      <section className={cn(
        "min-w-0 lg:sticky lg:top-16 lg:flex lg:h-[calc(100svh-5rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden",
        !selectedId && "hidden sm:block",
      )}>
        {selectedId ? (
          <div className="flex min-h-[70svh] flex-1 flex-col lg:min-h-0">
            <div className="flex h-16 items-center justify-between gap-3 border-b border-border py-0">
              <div className="flex min-w-0 items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="-ml-2 shrink-0 sm:hidden" onClick={onClearSelection}>
                  <ArrowLeft className="size-4" aria-hidden="true" /> {sectionLabel}
                </Button>
                <h2 className="sidebar-nav-label min-w-0 truncate font-medium text-sidebar-foreground/70">{selectedTitle}</h2>
              </div>
              {headerActions && <div className="flex shrink-0 items-center gap-1">{headerActions}</div>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-5">{content}</div>
          </div>
        ) : (
          <div className="min-h-[34rem]" aria-hidden="true" />
        )}
      </section>
    </div>
  )
}
