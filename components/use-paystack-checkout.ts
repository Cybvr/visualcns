"use client"

import { useState } from "react"
import { toast } from "sonner"

import { useOptionalAuth } from "@/components/auth-provider"

/**
 * Naira Growth plans skip the cart for signed-in buyers: "Get started" opens
 * Paystack for that one plan, using the account's name and email. Paystack
 * sends them back to checkoutPath, which confirms the payment. Guests have no
 * email on file, so open() returns false and the caller uses the cart instead.
 */
export function usePaystackCheckout(checkoutPath: string) {
  const auth = useOptionalAuth()
  const user = auth?.user ?? null
  const appUser = auth?.appUser ?? null
  const [opening, setOpening] = useState("")

  async function open(serviceId: string) {
    const email = user?.email || appUser?.email || ""
    if (!user || !email) return false
    setOpening(serviceId)
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({
          action: "pay",
          items: [serviceId],
          currency: "NGN",
          details: { name: appUser?.displayName || user.displayName || email, email, company: appUser?.company || "" },
          returnTo: checkoutPath,
        }),
      })
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !body.url) throw new Error(body.error || "Something went wrong. Please try again.")
      window.location.assign(body.url)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
      setOpening("")
    }
    return true
  }

  return { opening, open }
}
