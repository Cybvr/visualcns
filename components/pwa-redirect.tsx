"use client"

import { useEffect, useState, type ReactNode } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

import { auth, db } from "@/lib/firebase"

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
      if (user) {
        // Super admins go through sign-in, which opens the start page they chose in App settings.
        getDoc(doc(db, "users", user.uid))
          .then((snap) => {
            const data = snap.data()
            window.location.replace(data?.role === "superadmin" && data?.landingPage !== "admin" ? "/login" : "/admin")
          })
          .catch(() => window.location.replace("/admin"))
      }
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
