/** Shapes shared by the Pulse route and tab. Safe to import on the client. */

export type PulseHue = "red" | "green" | "blue" | "purple" | "amber"
export type PulseBadgeTone = "bad" | "warn" | "good" | "plain"
export type PulseLevel = "high" | "medium" | "low"

/** Icon names the tab knows how to draw. */
export type PulseIcon =
  | "positioning"
  | "seo"
  | "technical"
  | "reputation"
  | "content"
  | "market"
  | "partner"
  | "event"
  | "tender"
  | "grant"
  | "competitor"
  | "trend"
  | "news"
  | "launch"
  | "website"
  | "messaging"
  | "offer"
  | "page"
  | "change"

export type PulseItem = {
  id: string
  icon: PulseIcon
  tone?: PulseHue
  title: string
  detail: string
  meta?: string
  badge?: { label: string; tone: PulseBadgeTone }
  /** Shown when the row is opened. */
  more?: string
  /** Where it was found: a URL or a short name. */
  source?: string
}

export type PulseAction = { id: string; priority: PulseLevel; title: string; why: string; evidence: string; steps: string[] }

export type PulseReport = {
  scannedAt: string
  score: number
  pages: number
  sources: number
  summary: string
  attention: PulseItem[]
  opportunities: PulseItem[]
  market: PulseItem[]
  online: PulseItem[]
  changes: PulseItem[]
  actions: PulseAction[]
}

export type PulseAnswer = { question: string; text: string; sources: string[] }

/** What the route returns for a company. */
export type PulseState = {
  report: PulseReport | null
  done: string[]
  dismissed: string[]
}
