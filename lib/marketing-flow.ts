/*
 * Marketing: the company gives its website and the flow does the rest, one step
 * at a time. Each step reads the ones before it and is saved on the company.
 */

export const FLOW_STEPS = [
  { key: "research", title: "Research your company" },
  { key: "competitors", title: "Explore competitors" },
  { key: "audiences", title: "Define audiences" },
  { key: "customers", title: "Find potential customers" },
  { key: "people", title: "Find decision makers" },
  { key: "emails", title: "Write emails" },
  { key: "social", title: "Social media" },
  { key: "ads", title: "Ads" },
] as const

export type FlowStep = (typeof FLOW_STEPS)[number]["key"]

export const isFlowStep = (value: unknown): value is FlowStep => FLOW_STEPS.some((step) => step.key === value)

export type Research = { name: string; website: string; summary: string; keywords: string[] }

export type Competitors = {
  product: string
  points: string[]
  searches: string[]
  competitors: { name: string; url: string }[]
}

export type Audience = { id: string; name: string; offer: string; pain: string; criteria: string[]; examples: string[] }

export type Customer = { id: string; audienceId: string; name: string; url: string; description: string; country: string }

export type Person = { id: string; customerId: string; name: string; title: string; company: string; linkedin: string }

export type Email = { id: string; personId: string; subject: string; body: string }

export type SocialPlan = { posts: { id: string; title: string; text: string }[] }

export type Ad = { id: string; audienceId: string; headline: string; text: string; cta: string; jobTitles: string[] }

export type FlowState = {
  website: string
  research?: Research
  competitors?: Competitors
  audiences?: Audience[]
  customers?: Customer[]
  people?: Person[]
  emails?: Email[]
  social?: SocialPlan
  ads?: Ad[]
  updatedAt?: string
}

/** Steps after this one, which a new run of it makes out of date. */
export function stepsAfter(step: FlowStep): FlowStep[] {
  const index = FLOW_STEPS.findIndex((item) => item.key === step)
  return FLOW_STEPS.slice(index + 1).map((item) => item.key)
}

export function hostOf(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}
