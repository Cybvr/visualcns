"use client"

import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"

export interface PageHeaderOverride {
  title: string
  /** Icon-only Home link shown before the title, e.g. back to a record's list page. */
  homeHref?: string
}

interface PageTitleContextValue {
  override: PageHeaderOverride | null
  setOverride: Dispatch<SetStateAction<PageHeaderOverride | null>>
  titleNode: ReactNode | null
  setTitleNode: Dispatch<SetStateAction<ReactNode | null>>
  actions: ReactNode
  setActions: Dispatch<SetStateAction<ReactNode>>
  /** When set, the page's actions stand in for the header's default search and create buttons on phones. */
  replacesMobileDefaults: boolean
  setReplacesMobileDefaults: Dispatch<SetStateAction<boolean>>
  /** Header element pages can portal their own buttons into, see FilterBar headerOnMobile. */
  headerSlot: HTMLElement | null
  setHeaderSlot: Dispatch<SetStateAction<HTMLElement | null>>
  /** Hides the mobile footer nav, e.g. while a full-screen composer is open. */
  hideMobileFooter: boolean
  setHideMobileFooter: Dispatch<SetStateAction<boolean>>
  /** The item open in a list/detail page, shown first in the browser tab title. */
  recordTitle: string | null
  setRecordTitle: Dispatch<SetStateAction<string | null>>
  /** When set, phones show a Back button in the header in place of the menu button. */
  backAction: { label: string; onClick: () => void } | null
  setBackAction: Dispatch<SetStateAction<{ label: string; onClick: () => void } | null>>
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null)

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<PageHeaderOverride | null>(null)
  const [titleNode, setTitleNode] = useState<ReactNode | null>(null)
  const [actions, setActions] = useState<ReactNode>(null)
  const [replacesMobileDefaults, setReplacesMobileDefaults] = useState(false)
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  const [hideMobileFooter, setHideMobileFooter] = useState(false)
  const [recordTitle, setRecordTitle] = useState<string | null>(null)
  const [backAction, setBackAction] = useState<{ label: string; onClick: () => void } | null>(null)
  const value = useMemo(
    () => ({ override, setOverride, titleNode, setTitleNode, actions, setActions, replacesMobileDefaults, setReplacesMobileDefaults, headerSlot, setHeaderSlot, hideMobileFooter, setHideMobileFooter, recordTitle, setRecordTitle, backAction, setBackAction }),
    [override, titleNode, actions, replacesMobileDefaults, headerSlot, hideMobileFooter, recordTitle, backAction],
  )
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>
}

export function usePageHeaderOverride(): PageTitleContextValue {
  const context = useContext(PageTitleContext)
  if (!context) throw new Error("usePageHeaderOverride must be used inside PageTitleProvider")
  return context
}

/**
 * Overrides the dashboard header's title (and optional leading Home link)
 * for as long as the calling component is mounted; reverts automatically on
 * unmount so navigating away restores the default pathname-based title.
 */
export function usePageTitle(title: string | null, homeHref?: string) {
  const { setOverride } = usePageHeaderOverride()

  useEffect(() => {
    setOverride(title ? { title, homeHref } : null)
    return () => setOverride(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, homeHref])
}

/**
 * Puts the open item's name in the browser tab ("Q3 plan · Notes | VisualCNS")
 * without changing the dashboard header. Clears itself on unmount.
 */
export function useRecordTitle(title: string | null | undefined) {
  const { setRecordTitle } = usePageHeaderOverride()

  useEffect(() => {
    setRecordTitle(title?.trim() || null)
    return () => setRecordTitle(null)
  }, [title, setRecordTitle])
}

/** Adds temporary actions to the dashboard header while the current page is mounted. */
export function usePageHeaderActions(actions: ReactNode) {
  const { setActions } = usePageHeaderOverride()

  useEffect(() => {
    setActions(actions)
    return () => setActions(null)
  }, [actions, setActions])
}

/** Replaces the dashboard header title with an interactive title control. */
export function usePageHeaderTitle(titleNode: ReactNode | null) {
  const { setTitleNode } = usePageHeaderOverride()

  useEffect(() => {
    setTitleNode(titleNode)
    return () => setTitleNode(null)
  }, [titleNode, setTitleNode])
}

/** Shows a Back button in the phone header while `action` is set and the caller is mounted. */
export function usePageHeaderBack(action: { label: string; onClick: () => void } | null) {
  const { setBackAction } = usePageHeaderOverride()

  useEffect(() => {
    setBackAction(action)
    return () => setBackAction(null)
  }, [action, setBackAction])
}

/** Hides the mobile footer nav while `hidden` is true and the caller is mounted. */
export function useHideMobileFooter(hidden: boolean) {
  const { setHideMobileFooter } = usePageHeaderOverride()

  useEffect(() => {
    setHideMobileFooter(hidden)
    return () => setHideMobileFooter(false)
  }, [hidden, setHideMobileFooter])
}
