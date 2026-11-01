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

/**
 * The Growth plan products made in Polar. Each id is checked against the
 * product's billing interval, so a monthly product never sells as yearly.
 */
const PRODUCT_IDS: Record<string, string[]> = {
  "growth-pro": ["eb82092a-43b3-4841-beb6-a30130f77692"],
  "growth-pro-yearly": ["00c4821d-934b-44f5-a230-f1d9718775b5"],
  "growth-max": ["441ea069-995b-4202-856d-a8d18e66a3b2", "2edc9f88-89c9-485b-9f48-15bc2399f9c5"],
  "growth-max-yearly": ["441ea069-995b-4202-856d-a8d18e66a3b2", "2edc9f88-89c9-485b-9f48-15bc2399f9c5"],
  "growth-ultra": ["dec20409-07b7-46f9-afef-2d9dd3f3a93a"],
  "growth-ultra-yearly": ["73079954-47e7-49b7-9f26-2098416c375c"],
}

/** The Polar product for one of our items. */
export async function polarProduct(service: CartService): Promise<Product | null> {
  const wanted = isYearly(service) ? "year" : service.price.suffix === "/mo" ? "month" : null
  for (const id of PRODUCT_IDS[service.id] ?? []) {
    const product = await polar<Product>(`/products/${id}`).catch(() => null)
    if (product && !product.is_archived && (product.recurring_interval ?? null) === wanted) return product
  }
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
 * "{webhook-id}.{webhook-timestamp}.{body}", base64, sent as "v1,<signature>"
 * (several may be listed). Rejects anything over 5 minutes old.
 * Returns why it failed, or "" when the signature is good.
 */
export function polarSignatureProblem(rawBody: string, headers: Headers) {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim().replace(/^["']|["']$/g, "")
  if (!secret) return "POLAR_WEBHOOK_SECRET isn't set"
  const id = headers.get("webhook-id") || ""
  const timestamp = headers.get("webhook-timestamp") || ""
  const signatures = headers.get("webhook-signature") || ""
  if (!id || !timestamp || !signatures) return "signature headers missing"
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return "timestamp too old"
  // Polar's SDK signs with the secret's text. A "whsec_" secret can also mean the
  // base64 key after the prefix (plain Standard Webhooks), so either is accepted.
  const keys = [Buffer.from(secret, "utf8")]
  if (secret.startsWith("whsec_")) keys.push(Buffer.from(secret.slice(6), "base64"))
  const expected = keys.map((key) => createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64"))
  const matches = signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",")
    return version === "v1" && expected.some((value) => signature?.length === value.length && timingSafeEqual(Buffer.from(signature), Buffer.from(value)))
  })
  return matches ? "" : "signature doesn't match POLAR_WEBHOOK_SECRET"
}
