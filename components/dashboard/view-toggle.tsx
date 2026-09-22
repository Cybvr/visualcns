"use client"

import { useEffect, useState } from "react"
import { LayoutGrid, List } from "lucide-react"

import { cn } from "@/lib/utils"

export type ViewMode = "list" | "grid"

/**
 * The list or grid choice for one page, remembered per browser. It reads the
 * saved choice after mount so the server render and first client render match.
 */
export function useViewMode(key: string, fallback: ViewMode = "list") {
  const storageKey = `view-mode:${key}`
  const [view, setViewState] = useState<ViewMode>(fallback)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved === "list" || saved === "grid") setViewState(saved)
    } catch {
      // Storage can be blocked; the fallback is fine.
    }
  }, [storageKey])

  function setView(next: ViewMode) {
    setViewState(next)
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // Ignore: the choice just won't be remembered.
    }
  }

  return [view, setView] as const
}

/** Pill switch between list and grid, modelled on the Drive toggle. */
export function ViewToggle({ view, onChange, className }: { view: ViewMode; onChange: (view: ViewMode) => void; className?: string }) {
  const options = [
    { value: "list" as const, label: "List view", Icon: List },
    { value: "grid" as const, label: "Grid view", Icon: LayoutGrid },
  ]
  return (
    <div role="group" aria-label="View" className={cn("flex shrink-0 items-center rounded-full bg-muted p-0.5", className)}>
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-label={label}
          aria-pressed={view === value}
          title={label}
          className={cn(
            "flex h-8 w-10 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            view === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
