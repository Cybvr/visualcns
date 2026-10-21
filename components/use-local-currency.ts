"use client"

import { useEffect, useState } from "react"

import { currencyForCountry, type BillingCurrency } from "@/lib/subscription"

/**
 * Naira for visitors in Nigeria, dollars for everyone else, decided by IP
 * country (so a VPN changes it). Looked up once per page load; the browser's
 * time zone is only used if the lookup fails. A currency picked in the footer
 * wins and is remembered in this browser.
 */

const CHOICE_KEY = "visualcns.currency"
const listeners = new Set<(currency: BillingCurrency) => void>()
let lookup: Promise<BillingCurrency> | null = null

function fromTimeZone(): BillingCurrency {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Lagos" ? "NGN" : "USD"
  } catch {
    return "NGN"
  }
}

async function countryOf(url: string) {
  const response = await fetch(url, { cache: "no-store" }).catch(() => null)
  const body = response?.ok ? ((await response.json().catch(() => ({}))) as { country?: string }) : {}
  return typeof body.country === "string" && /^[A-Z]{2}$/.test(body.country) ? body.country : ""
}

function savedChoice(): BillingCurrency | null {
  try {
    const saved = window.localStorage.getItem(CHOICE_KEY)
    return saved === "NGN" || saved === "USD" ? saved : null
  } catch {
    return null
  }
}

// The host's header first; without one (running locally), the browser asks
// directly, so a browser VPN extension counts.
function currencyLookup() {
  lookup ??= (async () => {
    const chosen = savedChoice()
    if (chosen) return chosen
    const country = (await countryOf("/api/geo")) || (await countryOf("https://api.country.is/"))
    return country ? currencyForCountry(country) : fromTimeZone()
  })()
  return lookup
}

/** The footer's picker: switches every price on the page and remembers it. */
export function chooseCurrency(currency: BillingCurrency) {
  try { window.localStorage.setItem(CHOICE_KEY, currency) } catch { /* Storage blocked; this page only. */ }
  lookup = Promise.resolve(currency)
  listeners.forEach((listener) => listener(currency))
}

export function useLocalCurrency(): BillingCurrency {
  const [currency, setCurrency] = useState<BillingCurrency>("NGN")

  useEffect(() => {
    let active = true
    void currencyLookup().then((next) => { if (active) setCurrency(next) })
    listeners.add(setCurrency)
    return () => {
      active = false
      listeners.delete(setCurrency)
    }
  }, [])

  return currency
}
