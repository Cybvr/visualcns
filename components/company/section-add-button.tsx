"use client"

import { forwardRef, type ComponentPropsWithoutRef } from "react"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"

interface SectionAddButtonProps extends ComponentPropsWithoutRef<"button"> {
  label: string
}

/** The one "add" affordance every company tab uses: an icon-only circle, never a labeled button. */
export const SectionAddButton = forwardRef<HTMLButtonElement, SectionAddButtonProps>(
  function SectionAddButton({ label, className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...props}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    )
  },
)
