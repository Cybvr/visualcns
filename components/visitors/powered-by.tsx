import type { ReactNode } from "react"
import Link from "next/link"

import { BrandLockup } from "@/components/brand-lockup"

/** The small credit at the foot of the visitor sign-in screen. */
export function PoweredBy({ children }: { children?: ReactNode }) {
  return (
    <p className="mx-auto mt-4 flex w-fit items-center gap-1.5 text-xs text-muted-foreground">
      Powered by <Link href="/" aria-label="VisualCNS home" className="rounded-sm transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <BrandLockup logoSize={14} gapClassName="gap-0.5" textClassName="text-xs" />
      </Link>
      {children}
    </p>
  )
}
