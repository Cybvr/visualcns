"use client"

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, type LucideIcon } from "lucide-react"

import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

/** A page's own sections (a client, a campaign, email folders), shown in the sidebar in place of its links while it is open. */
export type SidebarTakeover = {
  /** The open page's name, under the back link. */
  title: string
  /** What the back link says, e.g. "Back" or "Campaigns". */
  backLabel: string
  onBack: () => void
  items: { key: string; label: string; icon: LucideIcon; count?: number }[]
  active: string
  onSelect: (key: string) => void
  /**
   * Deeper pages win when two are open at once: a campaign (2) inside a client page (1).
   * Closing the deeper one hands the sidebar back to the one underneath.
   */
  level?: number
}

type Entry = { id: string; order: number; takeover: SidebarTakeover }

const SidebarTakeoverContext = createContext<{
  takeover: SidebarTakeover | null
  register: (id: string, takeover: SidebarTakeover | null) => void
} | null>(null)

export function SidebarTakeoverProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const counter = useRef(0)
  const register = useCallback((id: string, takeover: SidebarTakeover | null) => {
    setEntries((current) => {
      if (!takeover) return current.filter((entry) => entry.id !== id)
      const existing = current.find((entry) => entry.id === id)
      if (existing) return current.map((entry) => (entry.id === id ? { ...entry, takeover } : entry))
      return [...current, { id, order: counter.current++, takeover }]
    })
  }, [])
  // The deepest page wins; between equals, the one opened last.
  const takeover = useMemo(
    () => [...entries].sort((a, b) => (a.takeover.level ?? 1) - (b.takeover.level ?? 1) || a.order - b.order).at(-1)?.takeover ?? null,
    [entries],
  )
  const value = useMemo(() => ({ takeover, register }), [takeover, register])
  return <SidebarTakeoverContext.Provider value={value}>{children}</SidebarTakeoverContext.Provider>
}

/** What the sidebar should show instead of its own links, if anything. */
export function useSidebarTakeoverState() {
  return useContext(SidebarTakeoverContext)?.takeover ?? null
}

/**
 * Puts a page's sections in the sidebar while the calling component is
 * mounted. Returns false where there is no sidebar to take over, so the
 * caller keeps its own menu.
 */
export function useSidebarTakeover(takeover: SidebarTakeover | null) {
  const context = useContext(SidebarTakeoverContext)
  const register = context?.register
  const id = useId()
  // Callbacks change every render; the sidebar calls the latest through these.
  const latest = useRef(takeover)
  latest.current = takeover
  const key = takeover
    ? JSON.stringify([takeover.title, takeover.backLabel, takeover.active, takeover.level ?? 1, takeover.items.map((item) => [item.key, item.label, item.count ?? 0])])
    : ""

  useEffect(() => {
    if (!register) return
    const current = latest.current
    if (!key || !current) {
      register(id, null)
      return
    }
    register(id, {
      ...current,
      onBack: () => latest.current?.onBack(),
      onSelect: (next) => latest.current?.onSelect(next),
    })
  }, [id, key, register])

  useEffect(() => {
    if (!register) return
    return () => register(id, null)
  }, [id, register])

  return Boolean(register && takeover)
}

const SIDEBAR_ITEM_CLASS = "h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5"

/**
 * The sidebar menu: the page's own links, or, while a record such as a campaign is open,
 * a way back and that record's own sections. Shared by the company and dashboard sidebars.
 */
export function SidebarTakeoverMenu({ sections }: { sections: ReactNode }) {
  const takeover = useSidebarTakeoverState()
  const { setOpenMobile } = useSidebar()
  // Going deeper slides the new menu in from the right, going back slides it in from the left.
  const depth = takeover ? takeover.level ?? 1 : 0
  const previousDepth = useRef(depth)
  const deeper = depth >= previousDepth.current
  // Not on first load, only when the menu changes underneath you.
  const mounted = useRef(false)
  const animate = mounted.current
  useEffect(() => {
    mounted.current = true
    previousDepth.current = depth
  }, [depth])
  const panelKey = takeover ? `${depth}:${takeover.title}` : "root"

  return (
    <li className="-mx-0.5 list-none overflow-x-clip px-0.5">
      <ul
        key={panelKey}
        className={cn(
          "flex w-full min-w-0 flex-col gap-0.5 max-md:gap-1.5",
          animate && "duration-200 ease-out animate-in fade-in motion-reduce:animate-none",
          animate && (deeper ? "slide-in-from-right-6" : "slide-in-from-left-6"),
        )}
      >
        {takeover ? <TakeoverItems takeover={takeover} closeMobile={() => setOpenMobile(false)} /> : sections}
      </ul>
    </li>
  )
}

function TakeoverItems({ takeover, closeMobile }: { takeover: SidebarTakeover; closeMobile: () => void }) {
  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton type="button" tooltip={`Back to ${takeover.backLabel}`} onClick={() => { closeMobile(); takeover.onBack() }} className={cn(SIDEBAR_ITEM_CLASS, "text-muted-foreground")}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sidebar-nav-label">{takeover.backLabel}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <li className="truncate px-2 pb-1 pt-3 text-sm font-semibold text-foreground group-data-[collapsible=icon]:hidden max-md:px-3">{takeover.title}</li>
      {takeover.items.map((item) => (
        <SidebarMenuItem key={item.key}>
          <SidebarMenuButton
            type="button"
            isActive={takeover.active === item.key}
            tooltip={item.label}
            onClick={() => { closeMobile(); takeover.onSelect(item.key) }}
            className={SIDEBAR_ITEM_CLASS}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            <span className="sidebar-nav-label">{item.label}</span>
            {item.count ? <span className="ml-auto text-xs tabular-nums text-muted-foreground group-data-[collapsible=icon]:hidden">{item.count}</span> : null}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  )
}


