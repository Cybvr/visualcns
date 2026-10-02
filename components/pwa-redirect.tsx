"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"

import { auth } from "@/lib/firebase"

/**
 * Keep the public home page for signed-out visitors, but send signed-in users
 * straight to the app. Installed PWAs keep the existing signed-out login flow.
 */
export function PwaRedirect({ to = "/login" }: { to?: string }) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari exposes this instead of the display-mode media query.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/dashboard")
      else if (standalone) router.replace(to)
    })

    return unsubscribe
  }, [router, to])

  return null
}
