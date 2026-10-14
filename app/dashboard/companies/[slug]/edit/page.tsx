"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

/** Editing lives in the client's About tab now; old /edit links land there. */
export default function CompanyEditPage() {
  const router = useRouter()
  const pathname = usePathname() ?? ""

  useEffect(() => {
    router.replace(`${pathname.replace(/\/edit\/?$/, "")}?tab=about`)
  }, [pathname, router])

  return null
}
