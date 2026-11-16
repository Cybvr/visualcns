"use client"

import Link from "next/link"
import { BadgeDollarSign, Check, Lightbulb, Search, Star, Store, type LucideIcon } from "lucide-react"

import { useCompanyPage } from "@/components/company/company-page-context"
import { Button } from "@/components/ui/button"

type MarketingPage = {
  icon: LucideIcon
  title: string
  text: string
  points: string[]
}

/** The simple Marketing pages: what each one covers, and how to get it. */
const PAGES = {
  reviews: {
    icon: Star,
    title: "Reviews",
    text: "See what customers say about you on Google and other sites, and reply in one place.",
    points: ["New reviews as they come in", "Replies written for you to approve", "Your average rating over time"],
  },
  insights: {
    icon: Lightbulb,
    title: "Insights",
    text: "A plain summary of how your marketing is doing and what to do next.",
    points: ["What's working this month", "Where customers find you", "The next few things to fix"],
  },
  seo: {
    icon: Search,
    title: "SEO",
    text: "Help more people find your business when they search on Google.",
    points: ["Keywords you rank for", "Pages to improve first", "Monthly search report"],
  },
  "google-ads": {
    icon: BadgeDollarSign,
    title: "Google Ads",
    text: "Ads on Google search and maps, set up and managed for you.",
    points: ["Campaigns built around your goals", "Spend and results in one view", "Monthly tuning to lower your costs"],
  },
  "business-profile": {
    icon: Store,
    title: "Business Profile",
    text: "Keep your Google Business Profile complete and up to date, so customers can find and contact you.",
    points: ["Opening hours, photos and details", "Posts and offers on Google", "Calls, visits and direction requests"],
  },
} satisfies Record<string, MarketingPage>

export type MarketingPageKey = keyof typeof PAGES

function MarketingPageView({ page }: { page: MarketingPageKey }) {
  const { company } = useCompanyPage()
  const { icon: Icon, title, text, points } = PAGES[page]
  const growthHref = `/${encodeURIComponent(company.slug || company.id)}/pricing/growth`

  return (
    <section aria-label={title} className="mx-auto mt-6 max-w-xl rounded-2xl bg-muted/50 p-6 sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      {/* The page title already sits above, so the card starts with what the page is for. */}
      <p className="mt-4 text-sm leading-relaxed text-foreground">{text}</p>
      <ul className="mt-4 space-y-2">
        {points.map((point) => (
          <li key={point} className="flex gap-2 text-sm text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-muted-foreground">Included with a Growth plan.</p>
      <Button asChild size="sm" className="mt-3">
        <Link href={growthHref}>Get started</Link>
      </Button>
    </section>
  )
}

export const ReviewsSection = () => <MarketingPageView page="reviews" />
export const InsightsSection = () => <MarketingPageView page="insights" />
export const SeoSection = () => <MarketingPageView page="seo" />
export const GoogleAdsSection = () => <MarketingPageView page="google-ads" />
export const BusinessProfileSection = () => <MarketingPageView page="business-profile" />
