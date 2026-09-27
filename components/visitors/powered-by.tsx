import type { ReactNode } from "react"

import { BrandLockup } from "@/components/brand-lockup"

/** The small credit at the foot of the visitor sign-in screen. Not a link, so visitors can't wander off the tablet. */
export function PoweredBy({ children }: { children?: ReactNode }) {
  return (
    <p className="mx-auto mt-4 flex w-fit items-center gap-1.5 text-xs text-muted-foreground">
      Powered by <BrandLockup logoSize={14} gapClassName="gap-0.5" textClassName="text-xs" />
      {children}
    </p>
  )
}
