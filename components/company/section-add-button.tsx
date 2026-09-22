"use client"

import { forwardRef, type ComponentPropsWithoutRef } from "react"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"

interface SectionAddButtonProps extends ComponentPropsWithoutRef<"button"> {
  label: string
}

/** The one "add" affordance every company tab uses: an icon-only square, never a labeled button. */
export const SectionAddButton = forwardRef<HTMLButtonElement, SectionAddButtonProps>(
  function SectionAddButton({ label, className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...props}
      >
        <Plus className="size-5" aria-hidden="true" />
      </button>
    )
  },
)
