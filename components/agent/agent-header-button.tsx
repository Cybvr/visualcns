"use client"

import Image from "next/image"

import { useAgent } from "@/components/agent/agent-context"
import { cn } from "@/lib/utils"

/** The Ngai icon in the dashboard header, next to the plus. Opens the Ngai panel. */
export function NgaiHeaderButton({ className }: { className?: string }) {
  const { open, setOpen } = useAgent()

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label="Ask Ngai"
      title="Ask Ngai"
      aria-pressed={open}
      className={cn("grid size-9 place-items-center rounded-full outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <Image src="/ngai-logo.png" alt="" width={20} height={20} className="rounded-full" />
    </button>
  )
}
