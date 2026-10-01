"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

import { META_PIXEL_ID } from "@/lib/meta-pixel-id"

type MetaPixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue?: unknown[][]
  push?: MetaPixelFunction
  loaded?: boolean
  version?: string
}

declare global {
  interface Window {
    fbq?: MetaPixelFunction
    _fbq?: MetaPixelFunction
    __visualCnsMetaPixelInitialized?: boolean
  }
}

function initializeMetaPixel() {
  if (typeof window === "undefined") return

  if (!window.__visualCnsMetaPixelInitialized) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args)
      else fbq.queue?.push(args)
    } as MetaPixelFunction

    fbq.push = fbq
    fbq.loaded = true
    fbq.version = "2.0"
    fbq.queue = []
    window.fbq = window._fbq = fbq
    window.__visualCnsMetaPixelInitialized = true

    const script = document.createElement("script")
    script.async = true
    script.src = "https://connect.facebook.net/en_US/fbevents.js"
    document.head.appendChild(script)

    fbq("init", META_PIXEL_ID)
  }
}

/** Pass the server's event id so Meta pairs this with the Conversions API Lead and counts it once. */
export function trackMetaLead(eventId?: string) {
  initializeMetaPixel()
  if (eventId) window.fbq?.("track", "Lead", {}, { eventID: eventId })
  else window.fbq?.("track", "Lead")
}

export function MetaPixel() {
  const pathname = usePathname()

  useEffect(() => {
    initializeMetaPixel()
    window.fbq?.("track", "PageView")
  }, [pathname])

  return null
}
