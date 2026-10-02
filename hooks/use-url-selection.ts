"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * Keeps the item open in a list/detail page in the address bar (?note=abc), so it
 * survives a refresh, can be shared or bookmarked, and the back button closes it.
 * Uses the history API, which Next keeps in sync, so pages don't need a Suspense boundary.
 */
export function useUrlSelection(param: string): [string | null, (id: string | null, options?: { replace?: boolean }) => void] {
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const read = () => setSelected(new URLSearchParams(window.location.search).get(param))
    read()
    window.addEventListener("popstate", read)
    return () => window.removeEventListener("popstate", read)
  }, [param])

  const select = useCallback((id: string | null, options?: { replace?: boolean }) => {
    const url = new URL(window.location.href)
    const wasOpen = url.searchParams.has(param)
    if (id) url.searchParams.set(param, id)
    else url.searchParams.delete(param)
    const next = `${url.pathname}${url.search}${url.hash}`
    // Moving between items replaces the entry; opening or closing one adds a step back.
    if (options?.replace || (wasOpen && id)) window.history.replaceState(null, "", next)
    else window.history.pushState(null, "", next)
    setSelected(id)
  }, [param])

  return [selected, select]
}
