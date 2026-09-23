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
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null)

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<PageHeaderOverride | null>(null)
  const [titleNode, setTitleNode] = useState<ReactNode | null>(null)
  const [actions, setActions] = useState<ReactNode>(null)
  const [replacesMobileDefaults, setReplacesMobileDefaults] = useState(false)
  const value = useMemo(
    () => ({ override, setOverride, titleNode, setTitleNode, actions, setActions, replacesMobileDefaults, setReplacesMobileDefaults }),
    [override, titleNode, actions, replacesMobileDefaults],
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
