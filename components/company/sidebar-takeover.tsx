"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

/** A record's own sections, shown in the company sidebar in place of the company's while it is open. */
export type SidebarTakeover = {
  /** The open record's name, under the back link. */
  title: string
  /** Where the back link goes, e.g. "Campaigns". */
  backLabel: string
  onBack: () => void
  items: { key: string; label: string; icon: LucideIcon; count?: number }[]
  active: string
  onSelect: (key: string) => void
}

const SidebarTakeoverContext = createContext<{ takeover: SidebarTakeover | null; set: (takeover: SidebarTakeover | null) => void } | null>(null)

export function SidebarTakeoverProvider({ children }: { children: ReactNode }) {
  const [takeover, set] = useState<SidebarTakeover | null>(null)
  return <SidebarTakeoverContext.Provider value={{ takeover, set }}>{children}</SidebarTakeoverContext.Provider>
}

/** What the sidebar should show instead of the company's sections, if anything. */
export function useSidebarTakeoverState() {
  return useContext(SidebarTakeoverContext)?.takeover ?? null
}

/**
 * Puts a record's sections in the company sidebar while the calling component
 * is mounted. Returns false outside a company page, where there is no sidebar
 * to take over, so the caller keeps its own menu.
 */
export function useSidebarTakeover(takeover: SidebarTakeover | null) {
  const context = useContext(SidebarTakeoverContext)
  const set = context?.set
  // Callbacks change every render; the sidebar calls the latest through these.
  const latest = useRef(takeover)
  latest.current = takeover
  const key = takeover
    ? JSON.stringify([takeover.title, takeover.backLabel, takeover.active, takeover.items.map((item) => [item.key, item.label, item.count ?? 0])])
    : ""

  useEffect(() => {
    if (!set) return
    const current = latest.current
    if (!key || !current) {
      set(null)
      return
    }
    set({
      ...current,
      onBack: () => latest.current?.onBack(),
      onSelect: (next) => latest.current?.onSelect(next),
    })
  }, [key, set])

  useEffect(() => {
    if (!set) return
    return () => set(null)
  }, [set])

  return Boolean(set && takeover)
}
