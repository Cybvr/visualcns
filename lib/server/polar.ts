import { createHmac, timingSafeEqual } from "node:crypto"

import { cartService, isYearly, type CartService } from "@/lib/cart"

/**
 * Polar takes dollar payments: one product per item, each bought on its own
 * (no cart). Needs POLAR_ACCESS_TOKEN (an organization access token) and
 * POLAR_WEBHOOK_SECRET. Set POLAR_SERVER=sandbox to use Polar's test mode.
 *
 * Products are matched to our items by the product's metadata `service_id`
 * (e.g. growth-pro, growth-pro-yearly, development-mvp-web-app), or failing
 * that by name and billing interval.
 */

export class PolarError extends Error {}

function base() {
  return process.env.POLAR_SERVER?.trim() === "sandbox" ? "https://sandbox-api.polar.sh/v1" : "https://api.polar.sh/v1"
}

function token() {
  const key = process.env.POLAR_ACCESS_TOKEN?.trim()
  if (!key) throw new PolarError("Dollar payments aren't set up yet. Please try again later.")
  return key
}

export async function polar<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    method: init.method || "GET",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", Accept: "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  }).catch(() => null)
  if (!response) throw new PolarError("Couldn't reach Polar. Please try again.")
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = (payload as { detail?: unknown }).detail
    throw new PolarError(typeof detail === "string" ? detail : "Polar couldn't do that. Please try again.")
  }
  return payload as T
}

type Product = { id: string; name: string; is_archived?: boolean; recurring_interval?: string | null; metadata?: Record<string, unknown> }

/** The Polar product for one of our items. */
export async function polarProduct(service: CartService): Promise<Product | null> {
  const { items = [] } = await polar<{ items?: Product[] }>("/products/?limit=100&is_archived=false")
  const live = items.filter((product) => !product.is_archived)
  const byId = live.find((product) => String(product.metadata?.service_id || "") === service.id)
  if (byId) return byId
  const interval = isYearly(service) ? "year" : service.price.suffix === "/mo" ? "month" : null
  const name = service.name.toLowerCase()
  return live.find((product) => {
    const productName = product.name.toLowerCase().replace(/^visualcns\s+/, "")
    return productName === name && (product.recurring_interval ?? null) === interval
  }) ?? null
}

/** A Polar checkout link for one item. The metadata comes back on the order and subscription. */
export async function polarCheckout(serviceId: string, input: { successUrl: string; email?: string; metadata: Record<string, string> }) {
  const service = cartService(serviceId)
  if (!service) throw new PolarError("That item isn't for sale.")
  const product = await polarProduct(service)
  if (!product) throw new PolarError(`${service.name} isn't available in dollars yet. Please pay in Naira or contact us.`)
  const checkout = await polar<{ url: string }>("/checkouts/", {
    method: "POST",
    body: {
      products: [product.id],
      success_url: input.successUrl,
      ...(input.email ? { customer_email: input.email } : {}),
      metadata: { ...input.metadata, service_id: service.id },
    },
  })
  return checkout.url
}

/** A link to Polar's customer portal, where a buyer manages or cancels their subscription. */
export async function polarPortal(customerId: string) {
  const session = await polar<{ customer_portal_url: string }>("/customer-sessions/", { method: "POST", body: { customer_id: customerId } })
  return session.customer_portal_url
}

/**
 * Polar signs webhooks the Standard Webhooks way: HMAC-SHA256 of
 * "{webhook-id}.{webhook-timestamp}.{body}" with the secret, base64, sent as
 * "v1,<signature>" (several may be listed). Rejects anything over 5 minutes old.
 */
export function validPolarSignature(rawBody: string, headers: Headers) {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim()
  const id = headers.get("webhook-id") || ""
  const timestamp = headers.get("webhook-timestamp") || ""
  const signatures = headers.get("webhook-signature") || ""
  if (!secret || !id || !timestamp || !signatures) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false
  const key = secret.startsWith("whsec_") ? Buffer.from(secret.slice(6), "base64") : Buffer.from(secret, "utf8")
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64")
  return signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",")
    return version === "v1" && signature?.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  })
}
