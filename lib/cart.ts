import type { PlanKey } from "@/lib/subscription"
import { BUILD_FEATURES, customDevelopmentRows, growthPlanRows, ngnToUsd, platformRows, retainers, type Currency, type Price, type ServiceRow } from "@/lib/plans"

/**
 * The services someone can buy from the dashboard checkout. Prices
 * come from lib/plans, so the server charges from this list and never trusts
 * an amount sent by the browser. Free and hourly rows can't be bought here.
 */

export type CartService = {
  id: string
  group: string
  name: string
  scope: string
  /** Who it's for, shown under the name on the pricing cards. */
  description?: string
  price: Exclude<Price, "free">
  tools?: string[]
  icon?: string
  timeline?: string
  /** What the buyer gets, one line each. */
  features?: string[]
  /** What the buyer doesn't get, shown crossed on the pricing cards. */
  excluded?: string[]
  /** A retainer's headline numbers, e.g. ["5 hrs", "48-hour"]. */
  highlights?: string[]
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

/** idPrefix keeps ids stable when a group is renamed, so saved carts still match. */
/** A build's shared feature list, split into what it has (with any value) and what it doesn't. */
function buildFeatures(row: ServiceRow) {
  if (!row.build) return { features: row.features ?? [row.included], excluded: undefined }
  const build = row.build
  return {
    features: BUILD_FEATURES.flatMap((label) => build[label] === false ? [] : [build[label] === true ? label : `${label}: ${build[label]}`]),
    excluded: BUILD_FEATURES.filter((label) => build[label] === false),
  }
}

function fromRows(group: string, rows: ServiceRow[], idPrefix = group): CartService[] {
  return rows.flatMap((row) => {
    if (row.price === "free" || row.price.suffix === "/hr") return []
    return [{
      id: slug(`${idPrefix}-${row.service}`),
      group,
      name: row.service,
      scope: row.scope,
      description: row.description,
      price: row.price,
      tools: row.tools,
      icon: row.icon,
      timeline: row.timeline,
      ...buildFeatures(row),
    }]
  })
}

/** Everything listed for sale, one entry each, billed as shown (one-off or monthly). */
export const LISTED_SERVICES: CartService[] = [
  // Apps, then websites, then add-ons. The generic retainer row is replaced by its three tiers below.
  ...fromRows("Development", customDevelopmentRows.filter((row) => row.service !== "Maintenance Retainer" && !row.service.startsWith("Add-on"))),
  ...fromRows("Development", platformRows.filter((row) => !row.service.startsWith("Add-on")), "Platforms"),
  ...fromRows("Development", customDevelopmentRows.filter((row) => row.service.startsWith("Add-on"))),
  ...fromRows("Development", platformRows.filter((row) => row.service.startsWith("Add-on")), "Platforms"),
  ...fromRows("Growth", growthPlanRows),
  ...retainers.map((tier) => ({
    id: slug(`maintenance-${tier.name}`),
    group: "Maintenance",
    name: `${tier.name} retainer`,
    description: tier.description,
    scope: tier.specs.map((spec) => ("text" in spec ? spec.text : `${spec.strong} ${spec.rest ?? ""}`.trim())).join(" - "),
    price: { amount: tier.amount, suffix: "/mo" },
    highlights: tier.specs.flatMap((spec) => ("strong" in spec ? [spec.strong] : [])),
    icon: tier.icon,
    timeline: "Monthly",
    features: tier.specs.map((spec) => ("text" in spec ? spec.text : `${spec.strong} ${spec.rest ?? ""}`.trim())),
  })),
]

export type BillingInterval = "monthly" | "yearly"

const YEARLY = "-yearly"
/** Paying yearly costs 10 months: 2 months free. */
const MONTHS_PER_YEARLY_PRICE = 10

/** The yearly version of a monthly service's id, and back. */
export function yearlyId(id: string) {
  return `${id}${YEARLY}`
}
export function baseServiceId(id: string) {
  return id.endsWith(YEARLY) ? id.slice(0, -YEARLY.length) : id
}
export function isYearly(service: CartService) {
  return service.price.suffix === "/yr"
}

/** Each monthly service can also be paid a year at a time. */
const YEARLY_SERVICES: CartService[] = LISTED_SERVICES
  .filter((service) => service.price.suffix === "/mo")
  .map((service) => ({ ...service, id: yearlyId(service.id), price: { ...service.price, amount: service.price.amount * MONTHS_PER_YEARLY_PRICE, ...(service.price.usd ? { usd: service.price.usd * MONTHS_PER_YEARLY_PRICE } : {}), suffix: "/yr" } }))

/** Every service the cart and checkout accept: the listed ones and their yearly versions. */
export const CART_SERVICES: CartService[] = [...LISTED_SERVICES, ...YEARLY_SERVICES]

/** The service to show for a listed one at the chosen billing: its yearly version if it has one. */
export function serviceFor(service: CartService, interval: BillingInterval) {
  return interval === "yearly" ? BY_ID.get(yearlyId(service.id)) ?? service : service
}

/** The app plan (Pass, Pulse and Ngai allowances) a paid Growth tier unlocks, cheapest first. */
export const GROWTH_APP_PLAN: Record<string, PlanKey> = { "growth-pro": "business", "growth-max": "pro", "growth-ultra": "pro" }

/** The Growth plans someone can buy, cheapest first, billed monthly. */
export const GROWTH_TIERS: CartService[] = LISTED_SERVICES.filter((service) => service.group === "Growth")

const BY_ID = new Map(CART_SERVICES.map((service) => [service.id, service]))

export function cartService(id: string) {
  return BY_ID.get(id) ?? null
}

/** The services behind a list of ids, skipping unknown ids and repeats. */
export function cartServices(ids: unknown): CartService[] {
  if (!Array.isArray(ids)) return []
  const seen = new Set<string>()
  return ids.flatMap((id) => {
    const service = typeof id === "string" && !seen.has(id) ? cartService(id) : null
    if (!service) return []
    seen.add(service.id)
    return [service]
  })
}

/** A service's price in naira, or in dollars as the rate card rounds it. */
export function servicePrice(service: CartService, currency: Currency = "NGN") {
  return currency === "USD" ? service.price.usd ?? ngnToUsd(service.price.amount) : service.price.amount
}

/** Total in the given currency: the sum of the prices shown, so it adds up on screen. */
export function cartTotal(services: CartService[], currency: Currency = "NGN") {
  return services.reduce((sum, service) => sum + servicePrice(service, currency), 0)
}

/** An amount already in that currency, e.g. an order's total. */
export function formatMoney(amount: number, currency: Currency) {
  return currency === "USD" ? `$${amount.toLocaleString("en-US")}` : `₦${amount.toLocaleString("en-NG")}`
}
