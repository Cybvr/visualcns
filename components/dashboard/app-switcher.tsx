"use client"

import { Grip } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const APPS = [
  { name: "VisualCNS", href: "/dashboard", letter: "V", tone: "bg-blue-600" },
  { name: "Pasive", href: "https://pasive.co", letter: "P", tone: "bg-emerald-600" },
]

/** The grid of dots in the header that switches between our apps. */
export function AppSwitcher() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Apps" title="Apps" className="rounded-full text-foreground hover:bg-muted/50 active:bg-muted/50">
          <Grip className="size-[18px]" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="grid grid-cols-2 gap-1">
          {APPS.map((app) => (
            <a
              key={app.name}
              href={app.href}
              target={app.href.startsWith("http") ? "_blank" : undefined}
              rel={app.href.startsWith("http") ? "noreferrer" : undefined}
              className="flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={`grid size-10 place-items-center rounded-xl text-base font-semibold text-white ${app.tone}`}>{app.letter}</span>
              {app.name}
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
