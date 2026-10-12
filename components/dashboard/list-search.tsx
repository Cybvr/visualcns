"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { LayoutGrid, List, Search, X } from "lucide-react"

import { GridCardList } from "@/components/dashboard/grid-card"
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

/**
 * Holds the search text for a list and returns the rows that match it.
 * `fields` lists every string a row can be found by.
 */
export function useListSearch<T>(items: T[], fields: (item: T) => Array<string | number | null | undefined>) {
  const [query, setQuery] = useState("")
  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => fields(item).some((field) => field !== null && field !== undefined && String(field).toLowerCase().includes(term)))
    // `fields` is usually an inline function; the rows and the text are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query])
  return { query, setQuery, results }
}

export type ListView = "card" | "list"

/**
 * Card or list, remembered per page in this browser. Cards come first, so a
 * page opens as cards until the viewer picks list.
 */
export function useListView(key: string, initial: ListView = "card") {
  const storageKey = `list-view:${key}`
  const [view, setView] = useState<ListView>(initial)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved === "card" || saved === "list") setView(saved)
    } catch {
      // Storage can be blocked; the default view is fine.
    }
  }, [storageKey])

  function change(next: ListView) {
    setView(next)
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // Storage can be blocked; the choice just won't be remembered.
    }
  }

  return [view, change] as const
}

/** Two buttons that switch a page between cards and a list. */
export function ViewToggle({ value, onChange, className }: { value: ListView; onChange: (view: ListView) => void; className?: string }) {
  const options = [
    { view: "card" as const, label: "Cards", icon: LayoutGrid },
    { view: "list" as const, label: "List", icon: List },
  ]
  return (
    <div role="group" aria-label="View" className={cn("flex shrink-0 items-center gap-0.5 rounded-full bg-sidebar-accent/25 p-1", className)}>
      {options.map((option) => (
        <button
          key={option.view}
          type="button"
          onClick={() => onChange(option.view)}
          aria-pressed={value === option.view}
          aria-label={option.label}
          title={option.label}
          className={cn(
            "flex size-9 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            value === option.view ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <option.icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

/**
 * The bar above every company list: search on the left, and the card/list switch
 * with the page's own buttons (like New) on the right.
 */
export function ListToolbar({
  query,
  onQueryChange,
  placeholder,
  view,
  onViewChange,
  actions,
  className,
}: {
  query: string
  onQueryChange: (value: string) => void
  placeholder: string
  view?: ListView
  onViewChange?: (view: ListView) => void
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2 sm:gap-3", className)}>
      <ListSearch value={query} onChange={onQueryChange} placeholder={placeholder} className="max-w-sm flex-1" />
      {((view && onViewChange) || actions) && (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {view && onViewChange && <ViewToggle value={view} onChange={onViewChange} />}
          {actions}
        </div>
      )}
    </div>
  )
}

/** Grey placeholders shaped like the page's cards or rows while its data loads. */
export function ListSkeleton({ view = "card", count = 6, label = "Loading", toolbar = true }: { view?: ListView; count?: number; label?: string; toolbar?: boolean }) {
  return (
    <div role="status" aria-label={label} className="mt-5">
      {toolbar && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 max-w-sm flex-1 rounded-full" />
          <Skeleton className="ml-auto h-11 w-[84px] rounded-full" />
        </div>
      )}
      {view === "card" ? (
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
