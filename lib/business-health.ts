/** Shapes shared by the Business Health route and tab. Safe to import on the client. */

export type BHHue = "red" | "green" | "blue" | "purple" | "amber"
export type BHBadgeTone = "bad" | "warn" | "good" | "plain"
export type BHLevel = "high" | "medium" | "low"

/** Icon names the tab knows how to draw. */
export type BHIcon =
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

export type BHItem = {
  id: string
  icon: BHIcon
  tone?: BHHue
  title: string
  detail: string
  meta?: string
  badge?: { label: string; tone: BHBadgeTone }
  /** Shown when the row is opened. */
  more?: string
  /** Where it was found: a URL or a short name. */
  source?: string
}

export type BHAction = { id: string; priority: BHLevel; title: string; why: string; evidence: string; steps: string[] }

export type BHReport = {
  scannedAt: string
  score: number
  pages: number
  sources: number
  summary: string
  attention: BHItem[]
  opportunities: BHItem[]
  market: BHItem[]
  online: BHItem[]
  changes: BHItem[]
  actions: BHAction[]
}

export type BHAnswer = { question: string; text: string; sources: string[] }

/** What the route returns for a company. */
export type BHState = {
  report: BHReport | null
  done: string[]
  dismissed: string[]
}
