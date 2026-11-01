"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

import { useOptionalAuth } from "@/components/auth-provider"

/**
 * Dollar buyers skip the cart: "Get started" sends them straight to Polar for
 * that one item. Returns the item being opened (for a spinner) and the opener.
 */
export function usePolarCheckout() {
  const user = useOptionalAuth()?.user ?? null
  const pathname = usePathname() ?? "/pricing"
  const [opening, setOpening] = useState("")

  async function open(serviceId: string) {
    setOpening(serviceId)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`
      const response = await fetch("/api/checkout/polar", { method: "POST", headers, body: JSON.stringify({ serviceId, returnTo: pathname }) })
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !body.url) throw new Error(body.error || "Something went wrong. Please try again.")
      window.location.assign(body.url)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
      setOpening("")
    }
  }

  return { opening, open }
}
