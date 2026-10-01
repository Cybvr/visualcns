"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { AccountMenu } from "@/components/account/account-nav"

/** Keep settings navigation beside the selected page on desktop. */
export function AccountSlide({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-6xl animate-in fade-in duration-200 ease-out motion-reduce:animate-none lg:mx-0">
      <aside className="hidden w-72 shrink-0 border-r border-border px-6 py-10 lg:block xl:w-80">
        <AccountMenu />
      </aside>
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  )
}
