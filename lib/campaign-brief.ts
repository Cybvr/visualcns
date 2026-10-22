/**
 * The creator brief: what a campaign asks creators to make, when, for how
 * much, and who it wants. A client keeps defaults for the parts that rarely
 * change (who they want, how they pay) and each campaign starts from those.
 */

export const BRIEF_PLATFORMS = ["Instagram", "Facebook", "Instagram and Facebook", "TikTok", "YouTube"] as const

export const BRIEF_GOALS = [
  { value: "awareness", label: "Increase awareness" },
  { value: "engagement", label: "Get more engagement" },
  { value: "traffic", label: "Get more website visits" },
  { value: "leads", label: "Get more sign-ups" },
  { value: "sales", label: "Increase sales" },
  { value: "installs", label: "Get more app installs" },
] as const

export const BRIEF_GENDERS = ["Any", "Women", "Men"] as const

export const BRIEF_AGES = ["Any age", "18–24", "25–34", "35–44", "45–54", "55+", "18–34", "25–44"] as const

export const BRIEF_FOLLOWERS = ["Any", "1k–10k", "10k–50k", "50k–100k", "100k–500k", "500k+"] as const

export const BRIEF_INTERESTS = [
  "Beauty", "Business", "Comedy", "Education", "Entertainment", "Family", "Fashion", "Fitness", "Food and drink",
  "Gaming", "Health", "Home", "Lifestyle", "Music", "Parenting", "Photography", "Sport", "Tech", "Travel",
] as const

export const BRIEF_COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Morocco", "Côte d'Ivoire", "Senegal", "Rwanda", "Uganda", "Tanzania",
  "United Arab Emirates", "Saudi Arabia", "Qatar", "United Kingdom", "Ireland", "France", "Germany", "Netherlands", "Spain",
  "Italy", "Portugal", "United States", "Canada", "Brazil", "Mexico", "India", "Singapore", "Australia",
] as const

export const BRIEF_PAYMENT_METHODS = ["Bank transfer", "PayPal", "Wise", "Mobile money", "Product or gifting"] as const

export const BRIEF_CURRENCIES = ["NGN", "USD", "GBP", "EUR", "AED", "GHS", "KES", "ZAR"] as const

export type CreatorBrief = {
  platform: string
  goal: string
  /** On: every creator is paid offerAmount. Off: creators send their rate. */
  fixedOffer: boolean
  /** Whole units, e.g. 150000 for ₦150,000. */
  offerAmount: number
  currency: string
  /** Off: the shared campaign page leaves the offer out. */
  showOffer: boolean
  stories: number
  posts: number
  reels: number
  contentDetails: string
  /** yyyy-mm-dd */
  registerBy: string
  postFrom: string
  postTo: string
  gender: string
  age: string
  followers: string
  interests: string[]
  countries: string[]
  /** Whether the client may run the creator's content as a paid ad. */
  paidAds: boolean
  paymentMethod: string
  /** Up to three questions the apply page asks. Blank ones are skipped. */
  questions: string[]
}

export const CREATOR_DEFAULT_KEYS = ["platform", "gender", "age", "followers", "interests", "countries", "paidAds", "paymentMethod", "currency"] as const

export type CreatorDefaults = Pick<CreatorBrief, (typeof CREATOR_DEFAULT_KEYS)[number]>

export const EMPTY_BRIEF: CreatorBrief = {
  platform: "Instagram",
  goal: "awareness",
  fixedOffer: true,
  offerAmount: 0,
  currency: "NGN",
  showOffer: true,
  stories: 1,
  posts: 0,
  reels: 1,
  contentDetails: "",
  registerBy: "",
  postFrom: "",
  postTo: "",
  gender: "Any",
  age: "Any age",
  followers: "Any",
  interests: [],
  countries: [],
  paidAds: false,
  paymentMethod: "Bank transfer",
  questions: ["", "", ""],
}

export const BRIEF_QUESTION_COUNT = 3

const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback)
const count = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback)
const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [])

/** A complete brief from whatever is saved, with the client's defaults under it and blanks under those. */
export function resolveBrief(saved?: Partial<CreatorBrief> | null, defaults?: Partial<CreatorDefaults> | null): CreatorBrief {
  const source: Record<string, unknown> = { ...(defaults ?? {}), ...(saved ?? {}) }
  return {
    platform: text(source.platform, EMPTY_BRIEF.platform),
    goal: text(source.goal, EMPTY_BRIEF.goal),
    fixedOffer: typeof source.fixedOffer === "boolean" ? source.fixedOffer : EMPTY_BRIEF.fixedOffer,
    offerAmount: count(source.offerAmount, 0),
    currency: text(source.currency, EMPTY_BRIEF.currency),
    showOffer: source.showOffer !== false,
    stories: count(source.stories, EMPTY_BRIEF.stories),
    posts: count(source.posts, EMPTY_BRIEF.posts),
    reels: count(source.reels, EMPTY_BRIEF.reels),
    contentDetails: text(source.contentDetails, ""),
    registerBy: text(source.registerBy, ""),
    postFrom: text(source.postFrom, ""),
    postTo: text(source.postTo, ""),
    gender: text(source.gender, EMPTY_BRIEF.gender),
    age: text(source.age, EMPTY_BRIEF.age),
    followers: text(source.followers, EMPTY_BRIEF.followers),
    interests: list(source.interests),
    countries: list(source.countries),
    paidAds: source.paidAds === true,
    paymentMethod: text(source.paymentMethod, EMPTY_BRIEF.paymentMethod),
    questions: Array.from({ length: BRIEF_QUESTION_COUNT }, (_, index) => (Array.isArray(source.questions) ? text(source.questions[index], "") : "")),
  }
}

export function pickCreatorDefaults(brief: CreatorBrief): CreatorDefaults {
  return Object.fromEntries(CREATOR_DEFAULT_KEYS.map((key) => [key, brief[key]])) as CreatorDefaults
}

export function goalLabel(value: string) {
  return BRIEF_GOALS.find((goal) => goal.value === value)?.label ?? value
}

export function formatOffer(brief: Pick<CreatorBrief, "fixedOffer" | "offerAmount" | "currency">) {
  if (!brief.fixedOffer || !brief.offerAmount) return ""
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: brief.currency || "NGN", maximumFractionDigits: 0 }).format(brief.offerAmount)
  } catch {
    return `${brief.currency} ${brief.offerAmount.toLocaleString("en")}`
  }
}

/** "1 reel · 1 story", like Meta's preview. */
export function contentSummary(brief: Pick<CreatorBrief, "stories" | "posts" | "reels">) {
  const parts = [
    brief.reels ? `${brief.reels} reel${brief.reels === 1 ? "" : "s"}` : "",
    brief.posts ? `${brief.posts} post${brief.posts === 1 ? "" : "s"}` : "",
    brief.stories ? `${brief.stories} stor${brief.stories === 1 ? "y" : "ies"}` : "",
  ].filter(Boolean)
  return parts.join(" · ")
}

export function formatBriefDate(value: string) {
  if (!value) return ""
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/** "Women, 18–24, 10k–50k followers, into Fashion and Beauty, in Nigeria and Ghana". Empty when it's open to anyone. */
export function creatorSummary(brief: CreatorBrief) {
  const parts = [
    brief.gender !== "Any" ? brief.gender : "",
    brief.age !== "Any age" ? brief.age : "",
    brief.followers !== "Any" ? `${brief.followers} followers` : "",
    brief.interests.length ? `into ${joinWords(brief.interests)}` : "",
    brief.countries.length ? `in ${joinWords(brief.countries)}` : "",
  ].filter(Boolean)
  return parts.join(", ")
}

function joinWords(words: string[]) {
  return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`
}

/** The questions the apply page asks, without the blank ones. */
export function applicationQuestions(brief: Pick<CreatorBrief, "questions">) {
  return brief.questions.map((question) => question.trim()).filter(Boolean)
}

/** Whether there's anything worth showing creators yet. */
export function hasBrief(saved?: Partial<CreatorBrief> | null) {
  return Boolean(saved && Object.keys(saved).length)
}
