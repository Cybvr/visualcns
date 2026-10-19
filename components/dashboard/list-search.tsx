"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"

import { GridCardList } from "@/components/dashboard/grid-card"
import type { ViewMode } from "@/components/dashboard/view-toggle"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Search field for a list: a pill with a search icon and a clear button. */
export function ListSearch({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-full bg-sidebar-accent/25 pr-10 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

/** The rows whose `fields` contain the search text. */
export function filterBySearch<T>(items: T[], fields: (item: T) => Array<string | number | null | undefined>, query: string) {
  const term = query.trim().toLowerCase()
  if (!term) return items
  return items.filter((item) => fields(item).some((field) => field !== null && field !== undefined && String(field).toLowerCase().includes(term)))
}

/**
 * Holds the search text for a list and returns the rows that match it.
 * `fields` lists every string a row can be found by.
 */
export function useListSearch<T>(items: T[], fields: (item: T) => Array<string | number | null | undefined>) {
  const [query, setQuery] = useState("")
  // `fields` is usually an inline function; the rows and the text are what matter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const results = useMemo(() => filterBySearch(items, fields, query), [items, query])
  return { query, setQuery, results }
}

/** Grey placeholders shaped like the page's cards or rows while its data loads. */
export function ListSkeleton({ view = "grid", count = 6, label = "Loading", toolbar = true }: { view?: ViewMode; count?: number; label?: string; toolbar?: boolean }) {
  return (
    <div role="status" aria-label={label} className="mt-5">
      {toolbar && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 max-w-sm flex-1 rounded-full" />
          <Skeleton className="ml-auto h-11 w-[84px] rounded-full" />
        </div>
      )}
      {view === "grid" ? (
        <div className="mt-4">
          <GridCardList>
            {Array.from({ length: count }, (_, index) => (
              <div key={index} className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-3">
                <div className="flex min-h-9 items-center gap-2.5 pl-1">
                  <Skeleton className="size-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              </div>
            ))}
          </GridCardList>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {Array.from({ length: count }, (_, index) => (
            <div key={index} className="flex items-center gap-3 py-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
      )}
      <span className="sr-only">{label}…</span>
    </div>
  )
}
