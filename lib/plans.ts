export type Currency = "NGN" | "USD"
export type Price = "free" | { amount: number; prefix?: string; suffix?: string }

export type ServiceRow = {
  service: string
  scope: string
  price: Price
  timeline: string
  included: string
  icon?: string
  tools?: string[]
}

export type TierSpec = { text: string } | { strong: string; rest?: string }

export type GrowthPlan = ServiceRow & {
  features: string[]
}

export const NGN_PER_USD = 1360

export const customDevelopmentRows: ServiceRow[] = [
  {
    service: "Discovery & Scoping",
    icon: "compass",
    scope: "Fit, scope & build roadmap",
    price: "free",
    timeline: "45 min",
    included: "Fixed quote after call",
  },
  {
    service: "MVP Web App",
    icon: "layout",
    scope: "Up to 5 screens - 1 user role - frontend only",
    price: { amount: 1632000 },
    timeline: "1 week",
    included: "Static frontend (no auth, DB or backend)",
  },
  {
    service: "Full Web App",
    icon: "layers",
    scope: "Up to 12 screens - 2-3 roles - auth, DB, integrations",
    price: { amount: 3808000 },
    timeline: "2 weeks",
    included: "Frontend + backend + auth + DB + API integrations",
  },
  {
    service: "Custom Web App",
    icon: "code",
    scope: "Marketplaces, streaming, real-time, payments",
    price: { amount: 6120000, prefix: "From " },
    timeline: "4+ weeks",
    included: "Scoped per project",
  },
  {
    service: "Add-on: Backend/API",
    icon: "server",
    scope: "Extends an existing build",
    price: { amount: 1020000 },
    timeline: "3-5 days",
    included: "Auth, DB, endpoints",
  },
  {
    service: "Maintenance Retainer",
    icon: "shield",
    scope: "Live site upkeep - Basic / Priority / Growth tiers",
    price: { amount: 340000, prefix: "From ", suffix: "/mo" },
    timeline: "Ongoing",
    included: "Updates, fixes & priority support",
  },
  {
    service: "Additional / Out-of-scope",
    icon: "clock",
    scope: "Extra revisions & work beyond agreed scope",
    price: { amount: 54400, suffix: "/hr" },
    timeline: "As needed",
    included: "Billed hourly",
  },
]

export const platformRows: ServiceRow[] = [
  {
    service: "Webflow Site",
    icon: "globe",
    scope: "Up to 7 pages - CMS - responsive",
    price: { amount: 1292000 },
    timeline: "3-5 days",
    included: "Design, build, CMS setup & launch",
    tools: ["Webflow"],
  },
  {
    service: "Framer Site",
    icon: "zap",
    scope: "Up to 7 pages - interactive & animated",
    price: { amount: 1156000 },
    timeline: "2-4 days",
    included: "Design, animations & publish",
    tools: ["Framer"],
  },
  {
    service: "WordPress Site",
    icon: "edit",
    scope: "Up to 7 pages - blog - custom theme",
    price: { amount: 1088000 },
    timeline: "3-5 days",
    included: "Theme, plugins, SEO basics & launch",
    tools: ["WordPress"],
  },
  {
    service: "Add-on: WooCommerce",
    icon: "cart",
    scope: "E-commerce layer on WordPress",
    price: { amount: 612000, prefix: "+" },
    timeline: "+2-3 days",
    included: "Product catalogue, cart & checkout",
    tools: ["WooCommerce"],
  },
]

/** Monthly growth plans. Each tier includes everything in the one before it. */
export const growthPlanRows: GrowthPlan[] = [
  {
    service: "Free",
    icon: "pulse",
    scope: "One brand health check to see where you stand",
    price: "free",
    timeline: "One-off",
    included: "Brand health check, 30-day trial of Pass, Pulse and Ngai",
    features: ["Brand health check across search, social and reviews", "30-day free trial of Pass, Pulse and Ngai"],
  },
  {
    service: "Pro",
    icon: "trending",
    scope: "Social media run for you every month",
    price: { amount: 200000, suffix: "/mo" },
    timeline: "Monthly",
    included: "Social",
    features: ["Social media content, posting and replies", "Pass visitor sign-in for up to 25 staff", "Pulse: 4 scans a month", "Ngai assistant", "Client portal for your team", "Slack, Teams and webhook alerts"],
  },
  {
    service: "Max",
    icon: "rocket",
    scope: "Social, ads and SEO working together every month",
    price: { amount: 500000, suffix: "/mo" },
    timeline: "Monthly",
    included: "Social, ads, SEO",
    features: ["Everything in Pro", "Paid ads management", "SEO", "Pass for unlimited staff", "Pulse: unlimited scans"],
  },
  {
    service: "Ultra",
    icon: "chart",
    scope: "SEO, social, ads, brand health and monitoring, all handled",
    price: { amount: 850000, suffix: "/mo" },
    timeline: "Monthly",
    included: "SEO, social, ads, brand health, monitoring",
    features: ["Everything in Max", "Ongoing brand health", "Monitoring and alerts", "Priority support"],
  },
]

export const retainers: Array<{
  flag: string
  name: string
  amount: number
  icon?: string
  featured?: boolean
  specs: TierSpec[]
}> = [
  {
    flag: "",
    name: "Basic",
    icon: "tool",
    amount: 340000,
    specs: [
      { strong: "5 hrs", rest: "of work / month" },
      { strong: "48-hour", rest: "response time" },
      { text: "Updates, patches & bug fixes" },
      { text: "Email support" },
    ],
  },
  {
    flag: "Most popular",
    name: "Priority",
    icon: "zap",
    amount: 612000,
    featured: true,
    specs: [
      { strong: "12 hrs", rest: "of work / month" },
      { strong: "24-hour", rest: "response time" },
      { text: "Everything in Basic" },
      { text: "Priority queue & monthly check-in" },
    ],
  },
  {
    flag: "",
    name: "Growth",
    icon: "trending",
    amount: 800000,
    specs: [
      { strong: "25 hrs", rest: "of work / month" },
      { strong: "Same-day", rest: "response time" },
      { text: "Everything in Priority" },
      { text: "Feature development & monthly strategy call" },
    ],
  },
]

export function ngnToUsd(amount: number) {
  const raw = amount / NGN_PER_USD
  const roundTo = raw < 50 ? 1 : 10
  return Math.round(raw / roundTo) * roundTo
}

export function formatPrice(price: Price, currency: Currency) {
  if (price === "free") return "Free"
  const { amount, prefix = "", suffix = "" } = price
  if (currency === "USD") {
    return `${prefix}$${ngnToUsd(amount).toLocaleString("en-US")}${suffix}`
  }
  return `${prefix}₦${amount.toLocaleString("en-NG")}${suffix}`
}
