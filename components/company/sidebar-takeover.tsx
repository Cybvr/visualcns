"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, type LucideIcon } from "lucide-react"

import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

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

const SIDEBAR_ITEM_CLASS = "h-9 gap-2 px-2 max-md:h-12 max-md:min-h-12 max-md:gap-3 max-md:px-3 [&>svg]:size-[18px] [&>svg]:max-md:size-5"

/**
 * The sidebar menu: the page's own links, or, while a record such as a campaign is open,
 * a way back and that record's own sections. Shared by the company and dashboard sidebars.
 */
export function SidebarTakeoverMenu({ sections }: { sections: ReactNode }) {
  const takeover = useSidebarTakeoverState()
  const { setOpenMobile } = useSidebar()
  if (!takeover) return <>{sections}</>
  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton type="button" tooltip={`Back to ${takeover.backLabel}`} onClick={() => { setOpenMobile(false); takeover.onBack() }} className={cn(SIDEBAR_ITEM_CLASS, "text-muted-foreground")}>
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
            onClick={() => { setOpenMobile(false); takeover.onSelect(item.key) }}
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


