"use client"

import { Ngai } from "@/components/agent/ngai"
import { useAgent } from "@/components/agent/agent-context"

/**
 * Mobile-only Ngai surface (full-screen sheet), opened from the mobile footer nav's Ngai tab.
 * On desktop the NgaiSidePanel handles the right panel instead.
 */
export function AgentDock() {
  const { open, setOpen } = useAgent()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
      <Ngai scope={{ kind: "app" }} layout="panel" onClose={() => setOpen(false)} />
    </div>
  )
}
