"use client"

import { Fragment, type ComponentType, type ReactNode } from "react"

import { CompanyEmptyState } from "@/components/company/empty-state"
import { GridCard, GridCardList, type GridCardProps } from "@/components/dashboard/grid-card"
import { ListSkeleton, ListToolbar, useListSearch, useListView, type ListView } from "@/components/dashboard/list-search"
import { MobileDataCard, type MobileDataCardProps } from "@/components/dashboard/mobile-data-card"

/** What a row shows in list view. The icon, open action and menu come from the card. */
export type CollectionRow = Pick<MobileDataCardProps, "subtitle" | "description" | "trailing">

/**
 * The one list every client and campaign tab uses: search, the card/list switch
 * and the tab's own buttons on top, then cards or rows, with the same empty
 * state and loading placeholders everywhere.
 */
export function CollectionView<T>({
  items,
  getKey,
  searchFields,
  searchPlaceholder,
  viewKey,
  actions,
  loading = false,
  empty,
  card,
  row,
  listItem,
  before,
  cardsAfter,
  hasExtraCards = false,
  initialView = "card",
  className = "mt-5",
  onSearch,
}: {
  items: T[]
  getKey: (item: T) => string
  /** Every string a row can be found by. */
  searchFields: (item: T) => Array<string | number | null | undefined>
  searchPlaceholder: string
  /** Remembers card or list per tab in this browser. */
  viewKey: string
  /** The tab's own buttons, like New, on the right of the toolbar. */
  actions?: ReactNode
  loading?: boolean
  empty: { icon: ComponentType<{ className?: string }>; title: string; description?: string; action?: ReactNode }
  /** The item as a card. Its icon, title, open action and menu are reused for the list row. */
  card: (item: T) => GridCardProps
  /** Extra text for the list row. Falls back to the card's subtitle. */
  row?: (item: T) => CollectionRow
  /** Optional complete list-row renderer for collections that need a richer compact layout. */
  listItem?: (item: T) => ReactNode
  /** Shown between the toolbar and the items, e.g. totals or a folder path. */
  before?: ReactNode
  /** More cards at the end of the grid, filtered by the search text. */
  cardsAfter?: (query: string) => ReactNode
  /** True when `cardsAfter` has anything, so the tab doesn't count as empty. */
  hasExtraCards?: boolean
  initialView?: ListView
  className?: string
  /** Hears the search text, for tabs that step through the matching items elsewhere. */
  onSearch?: (query: string) => void
}) {
  const [view, setView] = useListView(viewKey, initialView)
  const { query, setQuery, results } = useListSearch(items, searchFields)
  const isEmpty = items.length === 0 && !hasExtraCards

  return (
    <section className={className}>
      <ListToolbar query={query} onQueryChange={(next) => { setQuery(next); onSearch?.(next) }}placeholder={searchPlaceholder} view={view} onViewChange={setView} actions={actions} />
      {before}
      {loading ? (
        <ListSkeleton view={view} count={4} toolbar={false} label={`Loading ${searchPlaceholder.replace(/^Search /, "")}`} />
      ) : isEmpty ? (
        <CompanyEmptyState {...empty} />
      ) : results.length === 0 && !(view === "card" && cardsAfter && hasExtraCards) ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches your search.</p>
      ) : view === "card" ? (
        <div className="mt-4">
          <GridCardList>
            {results.map((item) => <GridCard key={getKey(item)} {...card(item)} />)}
            {cardsAfter?.(query)}
          </GridCardList>
        </div>
      ) : (
        <div className="mt-4">
          {listItem ? results.map((item) => <Fragment key={getKey(item)}>{listItem(item)}</Fragment>) : results.map((item) => {
            const { title, icon, href, onClick, ariaLabel, menu, menuLabel, subtitle } = card(item)
            const extra = row?.(item)
            return (
              <MobileDataCard
                key={getKey(item)}
                surface="list"
                variant="inline"
                iconShape="circle"
                icon={icon && <span className="flex [&_svg]:size-5">{icon}</span>}
                title={title}
                subtitle={extra ? extra.subtitle : subtitle}
                description={extra?.description}
                trailing={extra?.trailing}
                href={href}
                onClick={onClick ? () => onClick() : undefined}
                ariaLabel={ariaLabel}
                menu={menu}
                menuLabel={menuLabel}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
