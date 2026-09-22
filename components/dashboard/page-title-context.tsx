"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export interface PageHeaderOverride {
  title: string
  /** Icon-only Home link shown before the title, e.g. back to a record's list page. */
  homeHref?: string
}

interface PageTitleContextValue {
  override: PageHeaderOverride | null
  setOverride: (next: PageHeaderOverride | null) => void
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null)

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<PageHeaderOverride | null>(null)
  const value = useMemo(() => ({ override, setOverride }), [override])
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
