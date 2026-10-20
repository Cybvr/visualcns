import { customDevelopmentRows, growthPlanRows, platformRows, retainers, workflowPlanRows, type Price, type ServiceRow } from "@/lib/plans"

/**
 * The rate-card services someone can buy from the dashboard checkout. Prices
 * come from lib/plans, so the server charges from this list and never trusts
 * an amount sent by the browser. Free and hourly rows can't be bought here.
 */

export type CartService = {
  id: string
  group: string
  name: string
  scope: string
  price: Exclude<Price, "free">
  /** The steps a workflow runs, e.g. ["New lead", "Auto-reply", "Qualify"]. */
  steps?: string[]
  tools?: string[]
  /** A retainer's headline numbers, e.g. ["5 hrs", "48-hour"]. */
  highlights?: string[]
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function fromRows(group: string, rows: (ServiceRow & { workflow?: string })[]): CartService[] {
  return rows.flatMap((row) => {
    if (row.price === "free" || row.price.suffix === "/hr") return []
    return [{
      id: slug(`${group}-${row.service}`),
      group,
      name: row.service,
      scope: row.scope,
      price: row.price,
      steps: row.workflow?.split("->").map((step) => step.trim()).filter(Boolean),
      tools: row.tools,
    }]
  })
}

export const CART_SERVICES: CartService[] = [
  // The generic retainer row is replaced by its three tiers below.
  ...fromRows("Development", customDevelopmentRows.filter((row) => row.service !== "Maintenance Retainer")),
  ...fromRows("Platforms", platformRows),
  ...fromRows("Growth", growthPlanRows),
  ...fromRows("Workflows", workflowPlanRows),
  ...retainers.map((tier) => ({
    id: slug(`maintenance-${tier.name}`),
    group: "Maintenance",
    name: `${tier.name} retainer`,
    scope: tier.specs.map((spec) => ("text" in spec ? spec.text : `${spec.strong} ${spec.rest ?? ""}`.trim())).join(" - "),
    price: { amount: tier.amount, suffix: "/mo" },
    highlights: tier.specs.flatMap((spec) => ("strong" in spec ? [spec.strong] : [])),
  })),
]

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

/** Total in naira. */
export function cartTotal(services: CartService[]) {
  return services.reduce((sum, service) => sum + service.price.amount, 0)
}
