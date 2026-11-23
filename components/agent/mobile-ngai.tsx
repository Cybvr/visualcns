"use client"

import Image from "next/image"
import { X } from "lucide-react"

/**
 * Below desktop the Ngai panel beside a document or invoice is hidden, so this button
 * brings it up full screen. The page passes `mobileChatClass(open)` to its aside.
 */
export function MobileNgaiButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 lg:hidden print:hidden"
    >
      <Image src="/ngai-logo.png" alt="" width={20} height={20} className="rounded-full" />
      Ask Ngai
    </button>
  )
}

/** Closes the full-screen chat on phones and tablets; hidden on desktop, where the panel stays. */
export function MobileNgaiClose({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Close chat" title="Close chat" className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
      <X className="size-4" aria-hidden="true" />
    </button>
  )
}

/** The aside's classes for the open chat on phones and tablets: it covers the screen. */
export function mobileChatClass(open: boolean) {
  return open ? "max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:flex max-lg:flex-col max-lg:bg-background" : ""
}
