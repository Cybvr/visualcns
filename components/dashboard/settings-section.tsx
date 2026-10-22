"use client"

import { useId, useState, type ReactNode } from "react"
import { Minus, Plus, type LucideIcon } from "lucide-react"

/** A setting group that opens and closes with + and −, so long settings stay easy to scan on a phone. */
export function SettingsSection({ title, icon: Icon, defaultOpen = false, children }: { title: string; icon?: LucideIcon; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center gap-2.5 py-3.5 text-left text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {open ? <Minus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </button>
      <div id={id} hidden={!open} className="pb-5">{children}</div>
    </section>
  )
}
