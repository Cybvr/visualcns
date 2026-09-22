"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, Search, SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type SortDirection = "asc" | "desc"

export type SortOption<T> = {
  /** Stable key used as the select value. */
  value: string
  /** Shown in the select and in the mobile sheet. */
  label: string
  /** Pulls the value that rows are compared on. */
  get: (item: T) => string | number | null | undefined
  /** Wording for the direction toggle, e.g. "A–Z" / "Z–A" or "Oldest" / "Newest". */
  ascLabel?: string
  descLabel?: string
}

export type UseFilterBarOptions<T> = {
  items: T[]
  /** Every string a row can be matched on. Falsy entries are ignored. */
  search?: (item: T) => Array<string | number | null | undefined>
  sorts?: SortOption<T>[]
  defaultSort?: string
  defaultDirection?: SortDirection
}

export type FilterBarProps = {
  query: string
  onQueryChange: (value: string) => void
  sortKey: string
  onSortKeyChange: (value: string) => void
  direction: SortDirection
  onDirectionChange: (value: SortDirection) => void
  sorts: Array<{ value: string; label: string; ascLabel?: string; descLabel?: string }>
  placeholder?: string
  /** Extra controls (status pickers and the like) shown beside the sort control, and inside the dialog on mobile. */
  children?: ReactNode
  /** Additional controls shown only inside the mobile filter dialog. */
  mobileFilters?: ReactNode
  /** Primary page actions, aligned to the right of the filters. */
  actions?: ReactNode
  /** Control shown before the search field, such as a menu trigger on mobile. */
  leading?: ReactNode
  /** Always-visible list controls, such as the view toggle. */
  controls?: ReactNode
  /** Optional width override for the search field wrapper. */
  searchClassName?: string
  className?: string
  /** How the mobile filter control is presented. Defaults to a centered dialog. */
  mobileVariant?: "dialog" | "drawer"
}

function compare(a: string | number | null | undefined, b: string | number | null | undefined) {
  const aEmpty = a === null || a === undefined || a === ""
  const bEmpty = b === null || b === undefined || b === ""
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })
}

/**
 * Holds the search and sort state for a list page and returns the rows to render
 * plus the props for <FilterBar />.
 */
export function useFilterBar<T>({
  items,
  search,
  sorts = [],
  defaultSort,
  defaultDirection = "asc",
}: UseFilterBarOptions<T>) {
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState(defaultSort ?? sorts[0]?.value ?? "")
  const [direction, setDirection] = useState<SortDirection>(defaultDirection)

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    let rows = items

    if (term && search) {
      rows = rows.filter((item) =>
        search(item).some((field) => field !== null && field !== undefined && String(field).toLowerCase().includes(term)),
      )
    }

    const active = sorts.find((option) => option.value === sortKey)
    if (active) {
      rows = [...rows].sort((first, second) => {
        const result = compare(active.get(first), active.get(second))
        return direction === "asc" ? result : -result
      })
    }

    return rows
  }, [items, query, search, sorts, sortKey, direction])

  const bar: FilterBarProps = {
    query,
    onQueryChange: setQuery,
    sortKey,
    onSortKeyChange: setSortKey,
    direction,
    onDirectionChange: setDirection,
    sorts,
  }

  return { query, setQuery, sortKey, setSortKey, direction, setDirection, results, bar }
}

export function FilterBar({
  query,
  onQueryChange,
  sortKey,
  onSortKeyChange,
  direction,
  onDirectionChange,
  sorts,
  placeholder = "Search",
  children,
  mobileFilters,
  actions,
  leading,
  controls,
  searchClassName,
  className,
  mobileVariant = "dialog",
}: FilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const active = sorts.find((option) => option.value === sortKey)
  const ascLabel = active?.ascLabel ?? "Ascending"
  const descLabel = active?.descLabel ?? "Descending"
  const directionLabel = direction === "asc" ? ascLabel : descLabel
  const hasControls = sorts.length > 0 || Boolean(children)

  const filterBody = (
    <>
      {(mobileFilters || children) && (
        <div className="grid gap-3">
          {mobileFilters || children}
        </div>
      )}
      {sorts.length > 0 && (
        <>
          <div className="space-y-1">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Sort by</p>
            {sorts.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSortKeyChange(option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                  option.value === sortKey ? "bg-accent/15 font-medium" : "hover:bg-accent/10",
                )}
              >
                {option.label}
                {option.value === sortKey && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Order</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={direction === "asc" ? "secondary" : "outline"}
                onClick={() => onDirectionChange("asc")}
              >
                <ArrowUpNarrowWide className="h-4 w-4" />
                {ascLabel}
              </Button>
              <Button
                variant={direction === "desc" ? "secondary" : "outline"}
                onClick={() => onDirectionChange("desc")}
              >
                <ArrowDownWideNarrow className="h-4 w-4" />
                {descLabel}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )

  return (
    <div className={cn("mb-6 flex flex-wrap items-center gap-3", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {leading}
      <div className={cn("relative min-w-0 flex-1 sm:max-w-xs", searchClassName)}>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {hasControls && (
        <>
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            {children}
            {sorts.length > 0 && (
              <>
                <Select value={sortKey} onValueChange={onSortKeyChange}>
                  <SelectTrigger className="w-[170px]" aria-label="Sort by">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {sorts.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDirectionChange(direction === "asc" ? "desc" : "asc")}
                  aria-label={`Sort ${directionLabel.toLowerCase()}`}
                  title={directionLabel}
                >
                  {direction === "asc" ? (
                    <ArrowUpNarrowWide className="h-4 w-4" />
                  ) : (
                    <ArrowDownWideNarrow className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>

          {mobileVariant === "drawer" ? (
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="sm:hidden" aria-label="Sort and filter">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl p-0">
                <SheetHeader className="border-b px-6 pt-6 pb-4 text-left">
                  <SheetTitle>Sort and filter</SheetTitle>
                  <SheetDescription>Refine the list and choose how it is ordered.</SheetDescription>
                </SheetHeader>
                <div className="space-y-6 px-6 py-5">
                  {filterBody}
                  <SheetClose asChild>
                    <Button className="w-full">Done</Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="sm:hidden" aria-label="Sort and filter">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[min(82vh,42rem)] overflow-y-auto p-0 sm:max-w-md">
                <DialogHeader className="border-b px-6 pt-6 pb-4">
                  <DialogTitle>Sort and filter</DialogTitle>
                  <DialogDescription>Refine the list and choose how it is ordered.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 px-6 py-5">
                  {filterBody}
                  <DialogClose asChild>
                    <Button className="w-full">Done</Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
        {controls}
      </div>
      {actions && <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  )
}
