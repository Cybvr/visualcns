"use client"

import { Fragment, useState, type ComponentType, type FormEvent, type ReactNode } from "react"

import { CompanyEmptyState } from "@/components/company/empty-state"
import { GridCard, GridCardList, type GridCardProps } from "@/components/dashboard/grid-card"
import { ListSkeleton, ListToolbar, useListSearch, useListView, type ListView } from "@/components/dashboard/list-search"
import { MobileDataCard, type MobileDataCardProps } from "@/components/dashboard/mobile-data-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { formatTimestamp } from "@/lib/tasks"

/** What a row shows in list view. The icon, open action and menu come from the card. */
export type CollectionRow = Pick<MobileDataCardProps, "subtitle" | "description" | "trailing">

/**
 * The one menu every list item gets, always in this order: Open, Rename,
 * Duplicate, the tab's own actions, then Delete last. Leave out what an item
 * can't do. Rename and Delete ask first, in dialogs the list draws itself.
 */
export type CollectionItemActions = {
  /** What the item is called in the menu and dialogs, e.g. "campaign". */
  noun: string
  /** The item's current name, for the rename field and the delete question. */
  name: string
  onOpen?: () => void
  onRename?: (name: string) => Promise<void> | void
  onDuplicate?: () => Promise<void> | void
  /** Reversible visibility action, shown between Duplicate and Delete. */
  onArchive?: () => Promise<void> | void
  onRestore?: () => Promise<void> | void
  /** The tab's own actions, shown between Duplicate and Delete. */
  extra?: ReactNode
  onDelete?: () => Promise<void> | void
  /** What the delete question says happens, when it isn't simply "removed for good". */
  deleteMessage?: string
}

/** The date every card and row shows: "Oct 16, 2026". */
export function collectionDate(value: unknown) {
  const label = formatTimestamp(value)
  return label === "—" ? undefined : label
}

/** The standard menu, for cards drawn outside the list. Rename and Delete need their handlers. */
export function CollectionItemMenu({ actions, onRename = () => {}, onDelete = () => {} }: { actions: CollectionItemActions; onRename?: () => void; onDelete?: () => void }) {
  const { noun } = actions
  return (
    <>
      {actions.onOpen && <DropdownMenuItem onSelect={actions.onOpen}>Open {noun}</DropdownMenuItem>}
      {actions.onRename && <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>}
      {actions.onDuplicate && <DropdownMenuItem onSelect={() => void actions.onDuplicate?.()}>Duplicate</DropdownMenuItem>}
      {actions.onArchive && <DropdownMenuItem onSelect={() => void actions.onArchive?.()}>Archive</DropdownMenuItem>}
      {actions.onRestore && <DropdownMenuItem onSelect={() => void actions.onRestore?.()}>Restore</DropdownMenuItem>}
      {actions.extra}
      {actions.onDelete && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>Delete</DropdownMenuItem>
        </>
      )}
    </>
  )
}

/**
 * The one list every client and campaign tab uses: search, the card/list switch
 * and the tab's own buttons on top, then cards or rows, with the same empty
 * state, menus, dates and loading placeholders everywhere.
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
  fixedView,
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
  /** Use one layout without allowing a toolbar toggle to change it. */
  fixedView?: ListView
  /** Hide the search and view toolbar while retaining the shared collection section. */
  hideToolbar?: boolean
  className?: string
  /** Hears the search text, for tabs that step through the matching items elsewhere. */
  onSearch?: (query: string) => void
  /** When the item last changed. Shown on the right of its list row; cards show none. */
  date?: (item: T) => unknown
  /** The item's menu, built in the standard order. Used in place of the card's own `menu`. */
  itemActions?: (item: T) => CollectionItemActions
}) {
  const [savedView, setSavedView] = useListView(viewKey, initialView)
  const view = fixedView ?? savedView
  const { query, setQuery, results } = useListSearch(items, searchFields)
  const isEmpty = items.length === 0 && !hasExtraCards
  const [renaming, setRenaming] = useState<{ actions: CollectionItemActions; name: string } | null>(null)
  const [deleting, setDeleting] = useState<CollectionItemActions | null>(null)
  const [busy, setBusy] = useState(false)

  function cardFor(item: T): GridCardProps {
    const base = card(item)
    const actions = itemActions?.(item)
    // No dots at all when the item has nothing to offer.
    const menuActions = actions && (actions.onOpen || actions.onRename || actions.onDuplicate || actions.onArchive || actions.onRestore || actions.extra || actions.onDelete) ? actions : undefined
    return {
      ...base,
      // Cards show no date line when the tab has dates; the date is for list rows.
      subtitle: date ? undefined : base.subtitle,
      menu: menuActions
        ? <CollectionItemMenu actions={menuActions} onRename={() => setRenaming({ actions: menuActions, name: menuActions.name })} onDelete={() => setDeleting(menuActions)} />
        : itemActions ? undefined : base.menu,
    }
  }

  async function submitRename(event: FormEvent) {
    event.preventDefault()
    const next = renaming?.name.trim()
    if (!renaming || !next || !renaming.actions.onRename) return
    setBusy(true)
    try {
      await renaming.actions.onRename(next)
      setRenaming(null)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleting?.onDelete) return
    setBusy(true)
    try {
      await deleting.onDelete()
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={className}>
      {!hideToolbar && <ListToolbar query={query} onQueryChange={(next) => { setQuery(next); onSearch?.(next) }} placeholder={searchPlaceholder} view={view} onViewChange={setSavedView} actions={actions} />}
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
            {results.map((item) => <GridCard key={getKey(item)} {...cardFor(item)} />)}
            {cardsAfter?.(query)}
          </GridCardList>
        </div>
      ) : (
        <div className="mt-4">
          {listItem ? results.map((item) => <Fragment key={getKey(item)}>{listItem(item)}</Fragment>) : results.map((item) => {
            const { title, icon, href, onClick, ariaLabel, menu, menuLabel, subtitle } = cardFor(item)
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
                // The date always sits on the right when the tab has one.
                trailing={date ? collectionDate(date(item)) : extra?.trailing}
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

      <Dialog open={renaming !== null} onOpenChange={(open) => { if (!open && !busy) setRenaming(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename {renaming?.actions.noun}</DialogTitle>
            <DialogDescription className="sr-only">Give this {renaming?.actions.noun} a new name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRename} className="space-y-4">
            <Input value={renaming?.name ?? ""} onChange={(event) => setRenaming((current) => current && { ...current, name: event.target.value })} aria-label="Name" autoFocus />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenaming(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy || !renaming?.name.trim()}>{busy ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open && !busy) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {deleting?.noun}?</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.deleteMessage ?? `${deleting?.name || `This ${deleting?.noun}`} will be removed for good.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={busy} onClick={(event) => { event.preventDefault(); void confirmDelete() }}>
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
