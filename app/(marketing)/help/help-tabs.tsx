"use client"

import { type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

const TABS = [
  { id: "chat", label: "Ask Ngai" },
  { id: "faqs", label: "FAQs" },
  { id: "resources", label: "Resources" },
  { id: "workflows", label: "Workflows" },
] as const

type HelpTab = (typeof TABS)[number]["id"]

function isHelpTab(value: string | null): value is HelpTab {
  return TABS.some((item) => item.id === value)
}

/** Help conversations, answers, reading and workflows in one stable surface. */
export function HelpTabs({ chat, faqs, resources, workflows }: { chat: ReactNode; faqs: ReactNode; resources: ReactNode; workflows: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requested = searchParams.get("tab")
  const tab: HelpTab = isHelpTab(requested) ? requested : "chat"

  function selectTab(next: HelpTab) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === "chat") params.delete("tab")
    else params.set("tab", next)
    const search = params.toString()
    router.push(search ? `${pathname}?${search}` : pathname, { scroll: false })
  }

  return (
    <>
      <div role="tablist" aria-label="Help" className="mx-auto flex max-w-full shrink-0 overflow-x-auto rounded-full border border-border bg-muted p-[3px] [scrollbar-width:none]">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`help-tab-${item.id}`}
            aria-controls={`help-panel-${item.id}`}
            aria-selected={tab === item.id}
            onClick={() => selectTab(item.id)}
            className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === item.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
          >
            {item.label}
          </button>
        ))}
      </div>
      {/* Every panel stays mounted, so switching tabs keeps the chat. */}
      <div id="help-panel-chat" role="tabpanel" aria-labelledby="help-tab-chat" className={cn("min-h-0 flex-1 flex-col", tab === "chat" ? "flex" : "hidden")}>{chat}</div>
      <div id="help-panel-faqs" role="tabpanel" aria-labelledby="help-tab-faqs" className={cn("min-h-0 flex-1 overflow-y-auto px-2 pt-4", tab === "faqs" ? "block" : "hidden")}>{faqs}</div>
      <div id="help-panel-resources" role="tabpanel" aria-labelledby="help-tab-resources" className={cn("min-h-0 flex-1 overflow-y-auto px-2 pt-4", tab === "resources" ? "block" : "hidden")}>{resources}</div>
      <div id="help-panel-workflows" role="tabpanel" aria-labelledby="help-tab-workflows" className={cn("min-h-0 flex-1 overflow-y-auto px-2 pt-4", tab === "workflows" ? "block" : "hidden")}>{workflows}</div>
    </>
  )
}
