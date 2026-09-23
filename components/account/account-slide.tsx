"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

/** Section pages slide in from the right, like opening a row in a settings app. The menu itself doesn't. */
export function AccountSlide({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === "/dashboard/account") return children

  return (
    <div key={pathname} className="animate-in fade-in slide-in-from-right-8 duration-200 ease-out motion-reduce:animate-none">
      {children}
    </div>
  )
}
