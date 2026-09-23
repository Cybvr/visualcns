"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ArrowDown, ArrowDownWideNarrow, ArrowUp, ArrowUpNarrowWide, Check, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { usePageHeaderOverride } from "@/components/dashboard/page-title-context"
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
  /** Hide the text search field, e.g. when a page relies on global search instead. Defaults to true. */
  showSearch?: boolean
  /** On phones, move the search trigger and actions into the blue page header, replacing its default search and create buttons. */
  headerOnMobile?: boolean
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
  showSearch = true,
  headerOnMobile = false,
}: FilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const active = sorts.find((option) => option.value === sortKey)
  const ascLabel = active?.ascLabel ?? "Ascending"
  const descLabel = active?.descLabel ?? "Descending"
  const directionLabel = direction === "asc" ? ascLabel : descLabel
  const sheetTitle = mobileFilters || children ? "Search and filter" : sorts.length > 0 ? "Search and sort" : "Search"

  const filterBody = (
    <>
      {(mobileFilters || children) && (
        <div className="grid gap-3 border-b border-border pb-4">
          {mobileFilters || children}
        </div>
      )}
      {sorts.length > 0 && (
        <div className="space-y-4 text-sm">
          <div className="-mx-2 flex flex-col">
            {sorts.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSortKeyChange(option.value)}
                aria-pressed={option.value === sortKey}
                className={cn(
                  "flex h-10 items-center justify-between rounded-md px-2 text-left text-sm transition-colors hover:bg-muted",
                  option.value === sortKey ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {option.label}
                {option.value === sortKey && <Check className="size-4" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Order">
            {([["asc", ascLabel, ArrowUpNarrowWide], ["desc", descLabel, ArrowDownWideNarrow]] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => onDirectionChange(value)}
                aria-pressed={direction === value}
                className={cn(
                  "flex h-8 items-center justify-center gap-1.5 rounded-md text-sm transition-colors",
                  direction === value ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )

  // Drive-style sort button: shows the active field and direction, opens a menu for both.
  const sortMenu = sorts.length > 0 && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="hidden shrink-0 gap-2 px-2 sm:inline-flex" aria-label={`Sort by ${active?.label ?? ""}, ${directionLabel}`}>
          {active?.label ?? "Sort"}
          <span className="flex size-7 items-center justify-center rounded-full bg-muted">
            {direction === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortKey} onValueChange={onSortKeyChange}>
          {sorts.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={direction} onValueChange={(value) => onDirectionChange(value as SortDirection)}>
          <DropdownMenuRadioItem value="asc">{ascLabel}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">{descLabel}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const searchField = (
    <div className="relative min-w-0">
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
  )

  // On mobile, search, sort and filters all live in one sheet opened from a search icon.
  const mobileTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className={cn("sm:hidden bg-transparent shadow-none hover:bg-transparent", query && "text-accent")}
      aria-label={sheetTitle}
    >
      <Search className="h-4 w-4" />
    </Button>
  )
  const mobileBody = (
    <div className="space-y-4">
      {searchField}
      {filterBody}
    </div>
  )

  // Portalled into the blue header rather than pushed through context state, so page
  // re-renders can never feed back into a header update loop.
  const { headerSlot, setReplacesMobileDefaults } = usePageHeaderOverride()
  useEffect(() => {
    if (!headerOnMobile) return
    setReplacesMobileDefaults(true)
    return () => setReplacesMobileDefaults(false)
  }, [headerOnMobile, setReplacesMobileDefaults])
  const headerPortal =
    headerOnMobile && headerSlot
      ? createPortal(
          <div className="flex items-center gap-1 sm:hidden [&_a]:!text-current [&_button]:!text-current">
            <Button type="button" variant="ghost" size="icon" aria-label={sheetTitle} onClick={() => setFilterOpen(true)} className="relative">
              <Search className="size-4" aria-hidden="true" />
              {query && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-current" aria-hidden="true" />}
            </Button>
            {actions}
          </div>,
          headerSlot,
        )
      : null

  return (
    <>
    {headerPortal}
    <div className={cn("mb-6 flex flex-wrap items-center gap-3", headerOnMobile && !leading && !controls && "max-sm:hidden", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {leading}
      {sortMenu}
      {showSearch && <div className={cn("hidden min-w-0 flex-1 sm:block sm:max-w-xs", searchClassName)}>{searchField}</div>}

        {mobileVariant === "drawer" ? (
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            {!headerOnMobile && <SheetTrigger asChild>{mobileTrigger}</SheetTrigger>}
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl p-0">
              <SheetHeader className="px-5 pt-5 pb-2 text-left">
                <SheetTitle>{sheetTitle}</SheetTitle>
                <SheetDescription className="sr-only">Search the list and choose how it is ordered.</SheetDescription>
              </SheetHeader>
              <div className="px-5 pb-6">{mobileBody}</div>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
            {!headerOnMobile && <DialogTrigger asChild>{mobileTrigger}</DialogTrigger>}
            <DialogContent className="max-h-[min(82vh,42rem)] overflow-y-auto p-0 sm:max-w-md">
              <DialogHeader className="px-5 pt-5 pb-2 text-left">
                <DialogTitle>{sheetTitle}</DialogTitle>
                <DialogDescription className="sr-only">Search the list and choose how it is ordered.</DialogDescription>
              </DialogHeader>
              <div className="px-5 pb-5">{mobileBody}</div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {(children || controls || actions) && (
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {children && <div className="hidden flex-wrap items-center gap-2 sm:flex">{children}</div>}
          {controls}
          {actions && <div className={cn("flex flex-wrap items-center gap-2", headerOnMobile && "max-sm:hidden")}>{actions}</div>}
        </div>
      )}
    </div>
    </>
  )
}
