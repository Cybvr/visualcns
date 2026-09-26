"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * When the site is launched as an installed PWA (standalone display mode),
 * send the visitor straight to the app instead of the marketing home. The
 * login page then forwards signed-in users on to their dashboard or company page.
 */
export function PwaRedirect({ to = "/login" }: { to?: string }) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari exposes this instead of the display-mode media query.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) router.replace(to)
  }, [router, to])

  return null
}
