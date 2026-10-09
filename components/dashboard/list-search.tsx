"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"

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
