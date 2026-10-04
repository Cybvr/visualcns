"use client"

import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

const TABS = [
  { id: "chat", label: "Ask Ngai" },
  { id: "faqs", label: "FAQs" },
] as const

/** Ask Ngai first, the FAQs second. */
export function HelpTabs({ chat, faqs }: { chat: ReactNode; faqs: ReactNode }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("chat")
  return (
    <>
      <div role="tablist" aria-label="Help" className="mx-auto inline-flex shrink-0 rounded-full border border-border bg-muted p-[3px]">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn("rounded-full px-4 py-1.5 text-sm font-medium", tab === item.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
          >
            {item.label}
          </button>
        ))}
      </div>
      {/* Both stay mounted, so switching tabs keeps the chat. */}
      <div role="tabpanel" className={cn("min-h-0 flex-1 flex-col", tab === "chat" ? "flex" : "hidden")}>{chat}</div>
      <div role="tabpanel" className={cn("min-h-0 flex-1 overflow-y-auto px-2 pt-4", tab === "faqs" ? "block" : "hidden")}>{faqs}</div>
    </>
  )
}
