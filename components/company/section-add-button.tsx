"use client"

import { forwardRef, type ComponentPropsWithoutRef } from "react"
import { Plus } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SectionAddButtonProps extends ComponentPropsWithoutRef<"button"> {
  /** What it adds, for screen readers and the tooltip, e.g. "New note". */
  label: string
}

/** The one "New" button every company page uses: a plus and the word New, on the right of the toolbar. */
export const SectionAddButton = forwardRef<HTMLButtonElement, SectionAddButtonProps>(
  function SectionAddButton({ label, className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(buttonVariants(), "h-11 shrink-0 gap-1.5 px-5", className)}
        {...props}
      >
        <Plus className="size-4" aria-hidden="true" />
        New
      </button>
    )
  },
)
