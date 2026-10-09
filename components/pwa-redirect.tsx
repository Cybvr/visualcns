"use client"

import { useEffect, useState, type ReactNode } from "react"
import { onAuthStateChanged } from "firebase/auth"

import { auth } from "@/lib/firebase"

/**
 * Keep the public home page for signed-out visitors, but send signed-in users
 * straight to the app. Installed PWAs keep the existing signed-out login flow.
 */
export function PwaRedirect({ children, to = "/login" }: { children: ReactNode; to?: string }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari exposes this instead of the display-mode media query.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) window.location.replace("/dashboard")
      else if (standalone) window.location.replace(to)
      else setReady(true)
    })

    return unsubscribe
  }, [to])

  if (!ready) {
    return <div className="min-h-svh bg-background" role="status" aria-label="Opening VisualCNS" />
  }
  return children
}
