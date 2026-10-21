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
  paymentHref?: string
}

export type WorkflowPlan = ServiceRow & {
  painPoint: string
  workflow: string
  tools: string[]
  outcome: string
  paymentHref?: string
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

export const growthPlanRows: GrowthPlan[] = [
  {
    service: "VisualHQ Pro",
    icon: "trending",
    scope: "Monthly growth system for audience-to-action campaigns",
    price: { amount: 200000 },
    timeline: "Monthly",
    included: "Strategy, ads, automation, Notion OS & campaign design",
    paymentHref: "https://paystack.shop/pay/vcnsmarketing",
    features: [
      "Digital strategy that maps the next 30 days",
      "Meta Business Suite ad buy management to reach the right audience",
      "SendPulse automation for follow-up and conversion flows",
      "Dedicated Notion OS to manage campaign assets and tasks",
      "Visual design that makes the campaign feel premium",
    ],
  },
]

export const workflowPlanRows: WorkflowPlan[] = [
  {
    service: "Marketing",
    icon: "trending",
    scope: "Helps your business run monthly content, ads, automation, and campaign follow-up",
    painPoint: "You need consistent marketing activity, but strategy, content, ads, and follow-up are not connected.",
    workflow: "Plan campaign -> Create content -> Run ads -> Follow up -> Track response",
    tools: ["AI agents", "Meta Business Suite", "SendPulse", "Notion", "WhatsApp", "Google Sheets"],
    outcome: "For businesses who need help running monthly marketing campaigns that create attention and follow-up.",
    price: { amount: 200000 },
    timeline: "Monthly",
    included: "Digital strategy, ad management, SendPulse automation, Notion campaign board, campaign design",
    paymentHref: "https://paystack.shop/pay/vcnsmarketing",
  },
  {
    service: "Orbit",
    icon: "orbit",
    scope: "Helps your business collect leads from every channel and follow up faster",
    painPoint: "You get leads from your website, DMs, WhatsApp, email, and ads, but some people do not get a fast reply.",
    workflow: "New lead -> Auto-reply -> Qualify -> Assign -> Book a call",
    tools: ["AI agents", "Website forms", "WhatsApp", "Instagram DMs", "Gmail", "CRM / Sheets", "Cal.com"],
    outcome: "For businesses who need help capturing leads, replying faster, and booking more calls.",
    price: { amount: 680000, prefix: "From " },
    timeline: "Setup + monthly",
    included: "Lead routing, qualification rules, reminders, booking handoff, and pipeline visibility",
    paymentHref: "https://paystack.shop/pay/vcnsorbit",
  },
  {
    service: "Studio",
    icon: "image",
    scope: "Helps your team plan, approve, and publish content without confusion",
    painPoint: "Your content ideas, captions, files, approvals, and posting tasks are scattered across too many places.",
    workflow: "Idea -> Brief -> Approve -> Schedule -> Publish",
    tools: ["AI agents", "Notion", "Airtable", "Google Drive", "Canva", "Buffer", "Meta Business Suite"],
    outcome: "For businesses who need help planning, approving, and publishing content consistently.",
    price: { amount: 560000, prefix: "From " },
    timeline: "Setup + monthly",
    included: "Campaign board, content calendar, approval flow, asset library, and publishing checklist",
    paymentHref: "https://paystack.shop/pay/vcnsstudio",
  },
  {
    service: "Launch",
    icon: "rocket",
    scope: "Helps your ads turn into tracked leads, follow-ups, and sales conversations",
    painPoint: "People click your ads, but the next steps are not clear or properly tracked.",
    workflow: "Ad click -> Landing page -> Lead capture -> Follow-up -> Sale",
    tools: ["AI agents", "Meta Ads", "Google Analytics", "Landing pages", "Forms", "CRM", "Email / WhatsApp"],
    outcome: "For businesses who need help turning ad traffic into leads and sales follow-up.",
    price: { amount: 850000, prefix: "From " },
    timeline: "Setup + monthly",
    included: "Campaign funnel map, landing-page handoff, CRM tagging, retargeting audiences, and conversion tracking",
    paymentHref: "https://paystack.shop/pay/vcnslaunch",
  },
  {
    service: "Pulse",
    icon: "pulse",
    scope: "Helps your business follow up with interested customers who have not bought yet",
    painPoint: "People ask questions, abandon checkout, delay payment, or disappear after receiving a quote.",
    workflow: "Customer drops off -> Reminder -> Follow-up -> Return to buy",
    tools: ["AI agents", "Shopify / WooCommerce", "Paystack", "Email", "WhatsApp", "CRM", "Sheets"],
    outcome: "For businesses who need help following up with customers who showed interest but did not buy.",
    price: { amount: 520000, prefix: "From " },
    timeline: "Setup + monthly",
    included: "Drop-off triggers, reminder sequences, quote follow-up, abandoned cart recovery, and reactivation lists",
    paymentHref: "https://paystack.shop/pay/vcnspulse",
  },
  {
    service: "Signal",
    icon: "chart",
    scope: "Helps you understand what is bringing leads, sales, and customer interest",
    painPoint: "Your numbers are spread across ads, website analytics, social media, and sales tools.",
    workflow: "Collect numbers -> Summarize -> Show what worked -> Decide next steps",
    tools: ["AI agents", "Google Analytics", "Meta Ads", "Search Console", "CRM", "Sheets", "Looker Studio"],
    outcome: "For businesses who need help understanding what is bringing leads, sales, and customer interest.",
    price: { amount: 480000, prefix: "From " },
    timeline: "Setup + monthly",
    included: "Data source map, reporting dashboard, weekly summary format, KPI tracking, and action recommendations",
    paymentHref: "https://paystack.shop/pay/vcnssignal",
  },
  {
    service: "Atlas",
    icon: "map",
    scope: "Helps service businesses onboard clients and manage delivery in one clear flow",
    painPoint: "Payments, onboarding forms, files, tasks, approvals, and client updates are not connected.",
    workflow: "Payment -> Onboarding -> Project setup -> Approval -> Client update",
    tools: ["AI agents", "Paystack", "Notion", "Google Drive", "Slack / WhatsApp", "Forms", "Email"],
    outcome: "For businesses who need help onboarding clients, organizing files, and managing delivery.",
    price: { amount: 620000, prefix: "From " },
    timeline: "Setup + monthly",
    included: "Onboarding form, project workspace, folder automation, approval checkpoints, and status update flow",
    paymentHref: "https://paystack.shop/pay/vcnsatlas",
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
