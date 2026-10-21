"use client"

import { Fragment, useEffect, type ComponentType, type ReactNode } from "react"

import { CompanyEmptyState } from "@/components/company/empty-state"
import { MOBILE_LIST_CARD } from "@/components/dashboard/compact-list-row"
import { useFilterBar, type SortDirection, type SortOption } from "@/components/dashboard/filter-bar"
import { GridCard, GridCardList, type GridCardProps } from "@/components/dashboard/grid-card"
import type { ItemActions } from "@/components/dashboard/item-menu"
import { ListSkeleton } from "@/components/dashboard/list-search"
import { MobileDataCard, type MobileDataCardProps } from "@/components/dashboard/mobile-data-card"
import { TableFilterBar, type TableFilterBarProps } from "@/components/dashboard/table-filter-bar"
import { ThumbnailListItem } from "@/components/dashboard/thumbnail-list-item"
import { useViewMode, ViewToggle, type ViewMode } from "@/components/dashboard/view-toggle"
import { formatTimestamp } from "@/lib/tasks"

/** What a row shows in list view. The icon, open action and menu come from the card. */
export type CollectionRow = Pick<MobileDataCardProps, "subtitle" | "description" | "trailing">

/** The standard menu for one item. Kept under this name for the lists that already use it. */
export type CollectionItemActions = ItemActions

/** The date every card and row shows: "Oct 16, 2026". */
export function collectionDate(value: unknown) {
  const label = formatTimestamp(value)
  return label === "—" ? undefined : label
}

/**
 * The one list every page uses: the shared filter bar (search, sort, the
 * page's filters, the grid/list switch and New) on top, then cards or rows,
 * with the same empty state, menus, dates and loading placeholders everywhere.
 */
export function CollectionView<T>({
  items,
  getKey,
  searchFields,
  searchPlaceholder,
  viewKey,
  actions,
  createAction,
  filters,
  sorts,
  defaultSort,
  defaultDirection = "desc",
  loading = false,
  empty,
  card,
  gridItem,
  gridClassName,
  row,
  listItem,
  before,
  cardsAfter,
  hasExtraCards = false,
  initialView = "grid",
  fixedView,
  listStyle = "compact",
  hideToolbar = false,
  className = "mt-5",
  onSearch,
  date,
  itemActions,
}: {
  items: T[]
  getKey: (item: T) => string
  /** Every string a row can be found by. */
  searchFields: (item: T) => Array<string | number | null | undefined>
  searchPlaceholder: string
  /** Remembers grid or list per page in this browser. */
  viewKey: string
  /** The page's own buttons, on the right of the filter bar. */
  actions?: ReactNode
  /** The filter bar's New button. */
  createAction?: TableFilterBarProps["createAction"]
  /** Controls that narrow the list, such as status pills, beside the view switch. */
  filters?: ReactNode
  /** How the list can be ordered. With none, items keep the order they came in. */
  sorts?: SortOption<T>[]
  defaultSort?: string
  defaultDirection?: SortDirection
  loading?: boolean
  empty: { icon: ComponentType<{ className?: string }>; title: string; description?: string; action?: ReactNode }
  /** The item as a card. Its icon, title, open action and menu are reused for the list row. */
  card: (item: T) => GridCardProps
  /** Optional tile for this collection's grid; list rows still use `card`. */
  gridItem?: (item: T) => ReactNode
  gridClassName?: string
  /** Extra text for the list row. Falls back to the card's subtitle. */
  row?: (item: T) => CollectionRow
  /** Optional complete list-row renderer for collections that need a richer compact layout. */
  listItem?: (item: T) => ReactNode
  /** Shown between the filter bar and the items, e.g. totals or a folder path. */
  before?: ReactNode
  /** More cards at the end of the grid, filtered by the search text. */
  cardsAfter?: (query: string) => ReactNode
  /** True when `cardsAfter` has anything, so the page doesn't count as empty. */
  hasExtraCards?: boolean
  initialView?: ViewMode
  /** Use one layout and hide the switch. */
  fixedView?: ViewMode
  /** The list can use compact data rows or media-first thumbnail rows. */
  listStyle?: "compact" | "thumbnail"
  /** Hide the filter bar while keeping the shared list. */
  hideToolbar?: boolean
  className?: string
  /** Hears the search text, for pages that step through the matching items elsewhere. */
  onSearch?: (query: string) => void
  /** When the item last changed. Shown on the right of its list row; cards show none. */
  date?: (item: T) => unknown
  /** The item's menu, built in the standard order. Used in place of the card's own `actions`. */
  itemActions?: (item: T) => CollectionItemActions
}) {
  const [savedView, setSavedView] = useViewMode(viewKey, initialView)
  const view = fixedView ?? savedView
  const { query, results, bar } = useFilterBar({ items, search: searchFields, sorts, defaultSort, defaultDirection })
  const isEmpty = items.length === 0 && !hasExtraCards

  useEffect(() => {
    onSearch?.(query)
    // Only the text matters; callers pass inline functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function cardFor(item: T): GridCardProps {
    const base = card(item)
    return {
      ...base,
      // Cards show no date line when the page has dates; the date is for list rows.
      subtitle: date ? undefined : base.subtitle,
      actions: itemActions ? itemActions(item) : base.actions,
    }
  }

  return (
    <section className={className}>
      {!hideToolbar && (
        <TableFilterBar
          {...bar}
          placeholder={searchPlaceholder}
          controls={(filters || !fixedView) && (
            <>
              {filters}
              {!fixedView && <ViewToggle view={view} onChange={setSavedView} />}
            </>
          )}
          actions={actions}
          createAction={createAction}
        />
      )}
      {before}
      {loading ? (
        <ListSkeleton view={view} count={4} toolbar={false} label={`Loading ${searchPlaceholder.replace(/^Search /, "")}`} />
      ) : isEmpty ? (
        <CompanyEmptyState {...empty} />
      ) : results.length === 0 && !(view === "grid" && cardsAfter && hasExtraCards) ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches your search.</p>
      ) : view === "grid" ? (
        <GridCardList className={gridClassName}>
          {results.map((item) => <Fragment key={getKey(item)}>{gridItem ? gridItem(item) : <GridCard {...cardFor(item)} />}</Fragment>)}
          {cardsAfter?.(query)}
        </GridCardList>
      ) : listStyle === "thumbnail" ? (
        <div className="space-y-3">
          {results.map((item) => {
            const { title, preview, imageUrl, imageAlt, icon, href, onClick, ariaLabel, actions: menuActions, menuLabel, subtitle } = cardFor(item)
            const extra = row?.(item)
            return (
              <ThumbnailListItem
                key={getKey(item)}
                title={title}
                preview={preview}
                imageUrl={imageUrl}
                imageAlt={imageAlt}
                icon={icon}
                subtitle={extra ? extra.subtitle : date ? undefined : subtitle}
                description={extra?.description}
                trailing={date ? collectionDate(date(item)) : extra?.trailing}
                href={href}
                onClick={onClick ? () => onClick() : undefined}
                ariaLabel={ariaLabel}
                actions={menuActions}
                menuLabel={menuLabel}
              />
            )
          })}
        </div>
      ) : (
        // Custom rows sit in one rounded card on phones, like every other phone list.
        <div className={listItem ? MOBILE_LIST_CARD : undefined}>
          {listItem ? results.map((item) => <Fragment key={getKey(item)}>{listItem(item)}</Fragment>) : results.map((item) => {
            const { title, icon, href, onClick, ariaLabel, actions: menuActions, menuLabel, subtitle } = cardFor(item)
            const extra = row?.(item)
            return (
              <MobileDataCard
                key={getKey(item)}
                surface="list"
                variant="inline"
                iconShape="circle"
                icon={icon && <span className="flex [&_svg]:size-5">{icon}</span>}
                title={title}
                subtitle={extra ? extra.subtitle : date ? undefined : subtitle}
                description={extra?.description}
                // The date always sits on the right when the page has one.
                trailing={date ? collectionDate(date(item)) : extra?.trailing}
                href={href}
                onClick={onClick ? () => onClick() : undefined}
                ariaLabel={ariaLabel}
                actions={menuActions}
                menuLabel={menuLabel}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
