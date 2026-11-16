"use client"

import { useEffect, useRef, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"

import { auth } from "@/lib/firebase"
import { openInBuilder } from "@/lib/ngai"

/** A builder path, never another site. */
function builderPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/dashboard"
}

/**
 * Juju SiteBuilder signs people in through VisualCNS. The builder sends
 * signed-out visitors here with ?next=<builder page>; signed-in users go
 * straight back to it, everyone else signs in first and then returns here.
 */
export default function JujuSignInPage() {
  const started = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const next = builderPath(new URLSearchParams(window.location.search).get("next"))
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (started.current) return
      started.current = true
      if (user) {
        // No fallback link: the builder would send the visitor straight back here.
        void openInBuilder(next, () => user.getIdToken(), { fallback: false }).then((opened) => { if (!opened) setFailed(true) })
        return
      }
      const here = `/auth/juju?next=${encodeURIComponent(next)}`
      window.location.replace(`/login?next=${encodeURIComponent(here)}`)
    })
    return unsubscribe
  }, [])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-4 text-center text-sm text-muted-foreground" role="status">
      {failed ? (
        <>
          <p>We couldn&apos;t sign you in to Juju SiteBuilder. Please try again.</p>
          <button type="button" onClick={() => window.location.reload()} className="font-medium text-foreground underline underline-offset-4">Try again</button>
        </>
      ) : "Opening Juju SiteBuilder…"}
    </main>
  )
}
