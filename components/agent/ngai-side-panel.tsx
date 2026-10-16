"use client"

import { Ngai } from "@/components/agent/ngai"
import { useAgent } from "@/components/agent/agent-context"
import { cn } from "@/lib/utils"

/**
 * Right-docked Ngai side panel — shared between the portal and dashboard shells.
 *
 * Mirrors the left Sidebar's fixed+gap pattern exactly:
 *  - A gap div (inside the SidebarProvider flex row) animates its width to
 *    push the main content left.
 *  - A fixed inset-y-0 right-0 h-svh panel is pinned to the right edge so it
 *    always fills exactly the viewport height with no overflow issues.
 *
 * Props:
 *  - hidden  — when true the panel collapses to w-0 (e.g. portal hides it on
 *              the dedicated /ngai full-page route).
 */
export function NgaiSidePanel({ hidden = false }: { hidden?: boolean }) {
  const { open, setOpen } = useAgent()
  const visible = open && !hidden

  return (
    <>
      {/* Gap div — animates width inside the SidebarProvider flex row to push content left */}
      <div
        aria-hidden="true"
        className={cn(
          "hidden md:block shrink-0 transition-[width] duration-200 ease-linear",
          visible ? "w-80 lg:w-[26rem]" : "w-0",
        )}
      />

      {/* Fixed panel pinned to right edge — always exactly h-svh */}
      <div
        data-slot="ngai-panel"
        aria-label="Ngai Assistant"
        className={cn(
          "fixed inset-y-0 right-0 z-10 hidden md:flex h-svh flex-col bg-card shadow-[-4px_0_12px_rgba(0,0,0,0.04)]",
          "transition-[width] duration-200 ease-linear overflow-hidden",
          visible ? "w-80 lg:w-[26rem]" : "w-0",
        )}
      >
        {/* Inner wrapper is fixed-width so content never reflows during the animation */}
        <div className="flex h-full w-80 lg:w-[26rem] min-w-0 flex-col overflow-hidden">
          <Ngai scope={{ kind: "app" }} layout="panel" onClose={() => setOpen(false)} />
        </div>
      </div>
    </>
  )
}
