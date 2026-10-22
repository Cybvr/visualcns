"use client"

import { useCallback, useState, type SetStateAction } from "react"

/**
 * What each dashboard page last loaded, kept for as long as the tab is open, so
 * going back to a page shows its list at once while it refreshes underneath
 * instead of a skeleton. Cleared whenever the account being viewed changes.
 */
const store = new Map<string, unknown>()
let currentScope = ""

/** Called by the dashboard shell with who is signed in and whose data they're viewing. */
export function setPageCacheScope(scope: string) {
  if (scope === currentScope) return
  store.clear()
  currentScope = scope
}

/** What another page remembered under `key`, if anything, e.g. a list a detail page can start from. */
export function readPageCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined
}

/**
 * useState that remembers its value under `key` between visits. The third value
 * is true when it started from a remembered value, so the page can skip its
 * loading state; the page still fetches as usual and its updates are remembered.
 */
export function useCachedState<T>(key: string, initial: T) {
  const [cached] = useState(() => store.has(key))
  const [value, setValue] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial))
  const set = useCallback((next: SetStateAction<T>) => {
    setValue((current) => {
      const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next
      store.set(key, resolved)
      return resolved
    })
  }, [key])
  return [value, set, cached] as const
}
