export type Currency = "NGN" | "USD"
export type Price = "free" | { amount: number; prefix?: string; suffix?: string; /** A set dollar price, instead of converting the Naira one. */ usd?: number }

/** The one feature list every build card shows, in this order: a tick, a cross, or a short value. */
export const BUILD_FEATURES = ["Pages / screens", "Content editor", "Blog", "Login", "Database", "Payments", "Animations", "SEO", "Launch"] as const
export type BuildFeatures = Record<(typeof BUILD_FEATURES)[number], boolean | string>

export type ServiceRow = {
  service: string
  scope: string
  /** Who it's for, shown under the name on the pricing cards. */
  description?: string
  /** For website and app builds: the shared feature list. */
  build?: BuildFeatures
  /** For add-ons: what they add, one line each. */
  features?: string[]
  price: Price
  timeline: string
  included: string
  icon?: string
  tools?: string[]
}

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
    description: "Test an idea with a clickable product",
    build: { "Pages / screens": "5", "Content editor": false, "Blog": false, "Login": false, "Database": false, "Payments": false, "Animations": "Basic", "SEO": "Basic", "Launch": true },
    icon: "layout",
    scope: "Up to 5 screens - 1 user role - frontend only",
    price: { amount: 1632000 },
    timeline: "1 week",
    included: "Static frontend (no auth, DB or backend)",
  },
  {
    service: "Full Web App",
    description: "A working app for a small business or startup",
    build: { "Pages / screens": "12", "Content editor": true, "Blog": false, "Login": true, "Database": true, "Payments": false, "Animations": "Basic", "SEO": "Basic", "Launch": true },
    icon: "layers",
    scope: "Up to 12 screens - 2-3 roles - auth, DB, integrations",
    price: { amount: 3808000 },
    timeline: "2 weeks",
    included: "Frontend + backend + auth + DB + API integrations",
  },
  {
    service: "Custom Web App",
    description: "Complex products: marketplaces, streaming, real-time, payments",
    build: { "Pages / screens": "Unlimited", "Content editor": true, "Blog": true, "Login": true, "Database": true, "Payments": true, "Animations": "Custom", "SEO": "Full", "Launch": true },
    icon: "code",
    scope: "Marketplaces, streaming, real-time, payments",
    price: { amount: 6120000, prefix: "From " },
    timeline: "4+ weeks",
    included: "Scoped per project",
  },
  {
    service: "Add-on: Backend/API",
    description: "Add a backend to a site or app you already have",
    features: ["Login", "Database", "API endpoints"],
    icon: "server",
    scope: "Extends an existing build",
    price: { amount: 1020000 },
    timeline: "3-5 days",
    included: "Auth, DB, endpoints",
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
    description: "A fast marketing site you can edit yourself",
    build: { "Pages / screens": "7", "Content editor": true, "Blog": true, "Login": false, "Database": false, "Payments": false, "Animations": true, "SEO": "Basic", "Launch": true },
    icon: "globe",
    scope: "Up to 7 pages - CMS - responsive",
    price: { amount: 1292000 },
    timeline: "3-5 days",
    included: "Design, build, CMS setup & launch",
    tools: ["Webflow"],
  },
  {
    service: "Framer Site",
    description: "A site with rich animation",
    build: { "Pages / screens": "7", "Content editor": true, "Blog": true, "Login": false, "Database": false, "Payments": false, "Animations": "Advanced", "SEO": "Basic", "Launch": true },
    icon: "zap",
    scope: "Up to 7 pages - interactive & animated",
    price: { amount: 1156000 },
    timeline: "2-4 days",
    included: "Design, animations & publish",
    tools: ["Framer"],
  },
  {
    service: "WordPress Site",
    description: "A content site with a blog",
    build: { "Pages / screens": "7", "Content editor": true, "Blog": true, "Login": false, "Database": true, "Payments": false, "Animations": "Basic", "SEO": "Basic", "Launch": true },
    icon: "edit",
    scope: "Up to 7 pages - blog - custom theme",
    price: { amount: 1088000 },
    timeline: "3-5 days",
    included: "Theme, plugins, SEO basics & launch",
    tools: ["WordPress"],
  },
  {
    service: "Add-on: WooCommerce",
    description: "Add a shop to your WordPress site",
    features: ["Product catalogue", "Cart and checkout", "Payments"],
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
    scope: "For Design",
    price: "free",
    timeline: "One-off",
    included: "Brand health check, Pass for 5 staff, Ngai",
    features: ["Brand health check across search, social and reviews", "Pass visitor sign-in for up to 5 staff", "Ngai assistant", "30-day free trial of Pulse", "1 newsletter a month, written for you", "1 brand campaign a month, built for you", "100 emails a month"],
  },
  {
    service: "Pro",
    icon: "trending",
    scope: "For Awareness",
    price: { amount: 200000, suffix: "/mo", usd: 500 },
    timeline: "Monthly",
    included: "Social",
    features: ["2 hrs consulting a month", "5 social media posts and replies a month", "2 newsletters a month, written for you", "5 brand campaigns a month, built for you", "Pass visitor sign-in for up to 25 staff", "Pulse: 4 scans a month", "Ngai assistant", "1,000 emails a month", "Client portal for your team", "Slack, Teams and webhook alerts"],
  },
  {
    service: "Max",
    icon: "rocket",
    scope: "For Visibility",
    price: { amount: 500000, suffix: "/mo", usd: 800 },
    timeline: "Monthly",
    included: "Social, ads, SEO",
    features: ["Everything in Pro", "5 hrs consulting a month", "20 social media posts and replies a month", "Community management", "4 newsletters a month", "10 brand campaigns a month", "Paid ads management", "SEO", "Pass for up to 50 staff", "Pulse: unlimited scans", "5x Ngai usage", "5,000 emails a month", "10% off extra hours"],
  },
  {
    service: "Ultra",
    icon: "chart",
    scope: "For Presence",
    price: { amount: 850000, suffix: "/mo", usd: 1000 },
    timeline: "Monthly",
    included: "SEO, social, ads, brand health, monitoring",
    features: ["Everything in Max", "10 hrs consulting a month", "100 social media posts and replies a month", "8 newsletters a month", "20 brand campaigns a month", "Pass for unlimited staff", "Ongoing brand health", "Monitoring and alerts", "10x Ngai usage", "20,000 emails a month", "20% off extra hours", "Priority support"],
  },
]

/** Emails a client company can send a month on each Growth plan. The agency's own staff aren't limited. */
export const EMAIL_LIMITS = { "growth-free": 100, "growth-pro": 1000, "growth-max": 5000, "growth-ultra": 20000 } as const
export type GrowthTierId = keyof typeof EMAIL_LIMITS

/** A cell in the plan comparison: a tick, a cross, or a short tag like "5 hrs a month". */
export type ComparisonCell = boolean | string

/** The Growth plan comparison table, one cell per plan in order: Free, Pro, Max, Ultra. */
export const GROWTH_COMPARISON: { title: string; rows: { label: string; cells: [ComparisonCell, ComparisonCell, ComparisonCell, ComparisonCell] }[] }[] = [
  {
    title: "Strategy",
    rows: [
      { label: "Consulting time", cells: [false, "2 hrs a month", "5 hrs a month", "10 hrs a month"] },
      { label: "Extra hours", cells: ["Hourly rate", "Hourly rate", "10% off", "20% off"] },
    ],
  },
  {
    title: "Security (Visual Pass)",
    rows: [
      { label: "Visitor sign-in", cells: ["Up to 5 staff", "Up to 25 staff", "Up to 50 staff", "Unlimited"] },
      { label: "Front-desk tablet", cells: [true, true, true, true] },
      { label: "Slack, Teams and webhook alerts", cells: [false, true, true, true] },
    ],
  },
  {
    title: "Marketing",
    rows: [
      { label: "Brand health", cells: ["1 check", false, false, "Ongoing"] },
      { label: "Pulse scans", cells: ["30-day trial", "4 a month", "Unlimited", "Unlimited"] },
      { label: "Social media posts and replies", cells: [false, "5 a month", "20 a month", "100 a month"] },
      { label: "Community management", cells: [false, false, true, true] },
      { label: "Newsletters, written for you", cells: ["1 a month", "2 a month", "4 a month", "8 a month"] },
      { label: "Brand campaigns, built for you", cells: ["1 a month", "5 a month", "10 a month", "20 a month"] },
      { label: "Ads", cells: [false, false, true, true] },
      { label: "SEO", cells: [false, false, true, true] },
      { label: "Monitoring and alerts", cells: [false, false, false, true] },
    ],
  },
  {
    title: "AI (Ngai)",
    rows: [
      { label: "Ngai assistant", cells: [true, true, true, true] },
      { label: "Usage", cells: ["Limited", "1x", "5x", "10x"] },
    ],
  },
  {
    title: "Email",
    rows: [
      { label: "Emails a month", cells: [EMAIL_LIMITS["growth-free"], EMAIL_LIMITS["growth-pro"], EMAIL_LIMITS["growth-max"], EMAIL_LIMITS["growth-ultra"]].map((count) => count.toLocaleString("en-US")) as [string, string, string, string] },
      { label: "Scheduled sending", cells: [true, true, true, true] },
    ],
  },
  {
    title: "Support",
    rows: [
      { label: "Priority support", cells: [false, false, false, true] },
    ],
  },
]

/** G&D (Growth and Development) Support: monthly upkeep. Every tier has the same features, with more of each going up. */
export const retainers: Array<{
  /** Kept from the old tier names so saved carts still match. */
  id: string
  name: string
  description: string
  amount: number
  icon?: string
  /** Meetings and response time, for the cart artwork. */
  highlights: [string, string]
  features: string[]
}> = [
  {
    id: "maintenance-basic",
    name: "Basic",
    description: "Keep your business ticking over",
    icon: "tool",
    amount: 340000,
    highlights: ["1 meeting", "48-hour"],
    features: [
      "Consulting meetings: 1 a month",
      "Content edits: 2 a month",
      "Site health audit: 1 a month",
      "Social media audit: 1 a month",
      "Ads audit: 1 a month",
      "Google Business updates: 2 a month",
      "Report: 1 a month",
      "Response: within 48 hours",
    ],
  },
  {
    id: "maintenance-priority",
    name: "Priority",
    description: "For a busy business",
    icon: "zap",
    amount: 612000,
    highlights: ["2 meetings", "24-hour"],
    features: [
      "Consulting meetings: 2 a month",
      "Content edits: 5 a month",
      "Site health audit: 1 a month",
      "Social media audit: 1 a month",
      "Ads audit: 1 a month",
      "Google Business updates: 4 a month",
      "Report: 1 a month",
      "Response: within 24 hours",
    ],
  },
  {
    id: "maintenance-growth",
    name: "Pro",
    description: "Hands-on help for a growing business",
    icon: "trending",
    amount: 800000,
    highlights: ["3 meetings", "Same-day"],
    features: [
      "Consulting meetings: 3 a month",
      "Content edits: 10 a month",
      "Site health audit: 2 a month",
      "Social media audit: 2 a month",
      "Ads audit: 2 a month",
      "Google Business updates: 8 a month",
      "Report: 1 a month",
      "Response: same day",
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
    return `${prefix}$${(price.usd ?? ngnToUsd(amount)).toLocaleString("en-US")}${suffix}`
  }
  return `${prefix}₦${amount.toLocaleString("en-NG")}${suffix}`
}
