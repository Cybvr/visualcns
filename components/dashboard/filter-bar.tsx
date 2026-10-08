"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ArrowDown, ArrowUp, Search, SlidersHorizontal, X } from "lucide-react"

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
  /** On phones, move the page actions into the blue page header, replacing its default search and create buttons. */
  headerOnMobile?: boolean
  /** Phones: the button beside the search field, usually a + for creating. */
  mobileCreate?: ReactNode
  /** Set false when the page renders its own MobileSearchBar. */
  mobileSearch?: boolean
  /** Actions shown from sm up only, e.g. a create button that mobileCreate replaces on phones. */
  desktopActions?: ReactNode
}

type MobileSearchBarProps = Pick<FilterBarProps, "query" | "onQueryChange" | "sorts" | "sortKey" | "onSortKeyChange" | "direction" | "onDirectionChange" | "placeholder"> & {
  /** Opens the page's extra filters; shows a filter button when given. */
  onOpenFilters?: () => void
  /** Button beside the search field, usually a + for creating. */
  create?: ReactNode
  className?: string
}

/** Phone search row: a full search field with the sort chip inside it, and an optional button beside it. */
export function MobileSearchBar({ query, onQueryChange, sorts, sortKey, onSortKeyChange, direction, onDirectionChange, placeholder = "Search", onOpenFilters, create, className }: MobileSearchBarProps) {
  const active = sorts.find((option) => option.value === sortKey)
  const directionLabel = direction === "asc" ? active?.ascLabel ?? "Ascending" : active?.descLabel ?? "Descending"
  const chipClass = "flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-muted px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const chipContent = (
    <>
      {direction === "asc" ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
      {directionLabel}
    </>
  )

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-card py-1.5 pr-1.5 pl-4">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => onQueryChange("")} aria-label="Clear search" className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
        {onOpenFilters && (
          <button type="button" onClick={onOpenFilters} aria-label="Filters" title="Filters" className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </button>
        )}
        {sorts.length === 1 ? (
          <button type="button" onClick={() => onDirectionChange(direction === "asc" ? "desc" : "asc")} aria-label={`Sorted ${directionLabel}. Tap to reverse.`} className={chipClass}>
            {chipContent}
          </button>
        ) : sorts.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`Sort by ${active?.label ?? ""}, ${directionLabel}`} className={chipClass}>{chipContent}</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortKey} onValueChange={onSortKeyChange}>
                {sorts.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={direction} onValueChange={(value) => onDirectionChange(value as SortDirection)}>
                <DropdownMenuRadioItem value="asc">{active?.ascLabel ?? "Ascending"}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="desc">{active?.descLabel ?? "Descending"}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {create}
    </div>
  )
}

/** Square + beside the mobile search field. Pass a href, an onClick, or wrap it in a menu trigger. */
export const MOBILE_CREATE_BUTTON_CLASS = "size-14 shrink-0 rounded-2xl bg-card"

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
  mobileCreate,
  desktopActions,
  mobileSearch = true,
}: FilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const active = sorts.find((option) => option.value === sortKey)
  const ascLabel = active?.ascLabel ?? "Ascending"
  const descLabel = active?.descLabel ?? "Descending"
  const directionLabel = direction === "asc" ? ascLabel : descLabel
  const sheetTitle = showSearch ? "Filters" : mobileFilters || children ? "Search and filter" : "Search"

  const filterBody = (
    <>
      {(mobileFilters || children) && (
        <div className="grid gap-3 border-b border-border pb-4">
          {mobileFilters || children}
        </div>
      )}
    </>
  )

  // Shared icon-only sort button; its accessible name still reports the active order.
  const sortMenu = sorts.length > 0 && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0 rounded-full bg-muted hover:bg-muted/80" aria-label={`Sort by ${active?.label ?? ""}, ${directionLabel}`} title={`Sort by ${active?.label ?? ""}, ${directionLabel}`}>
          {direction === "asc" ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
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
        className="border-b-0 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
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
      {!showSearch && searchField}
      {!showSearch && sortMenu}
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
            {actions}
          </div>,
          headerSlot,
        )
      : null

  return (
    <>
    {headerPortal}
    {showSearch && mobileSearch && (
      <MobileSearchBar
        query={query}
        onQueryChange={onQueryChange}
        sorts={sorts}
        sortKey={sortKey}
        onSortKeyChange={onSortKeyChange}
        direction={direction}
        onDirectionChange={onDirectionChange}
        placeholder={placeholder}
        onOpenFilters={mobileFilters || children ? () => setFilterOpen(true) : undefined}
        create={(actions && !headerOnMobile) || mobileCreate ? <>{!headerOnMobile && actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}{mobileCreate}</> : undefined}
        className="mb-4 sm:hidden"
      />
    )}
    <div className={cn("mb-6 flex flex-wrap items-center gap-3", showSearch && mobileSearch && !leading && !controls && "max-sm:hidden", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {leading}
      {sortMenu && <span className={cn(showSearch && "max-sm:hidden")}>{sortMenu}</span>}
      {showSearch && <div className={cn("hidden min-w-0 flex-1 sm:block sm:max-w-xs", searchClassName)}>{searchField}</div>}

        {mobileVariant === "drawer" ? (
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            {!showSearch && <SheetTrigger asChild>{mobileTrigger}</SheetTrigger>}
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
            {!showSearch && <DialogTrigger asChild>{mobileTrigger}</DialogTrigger>}
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
      {(children || controls || actions || desktopActions) && (
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {children && <div className="hidden flex-wrap items-center gap-2 sm:flex">{children}</div>}
          {controls}
          {actions && <div className={cn("flex flex-wrap items-center gap-2", (headerOnMobile || (showSearch && mobileSearch)) && "max-sm:hidden")}>{actions}</div>}
          {desktopActions && <div className="flex flex-wrap items-center gap-2 max-sm:hidden">{desktopActions}</div>}
        </div>
      )}
    </div>
    </>
  )
}
